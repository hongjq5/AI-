package com.yupi.springbootinit.bizmq;

import com.rabbitmq.client.Channel;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.manager.AiManager;
import com.yupi.springbootinit.model.entity.Chart;
import com.yupi.springbootinit.service.ChartService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BiMessageConsumerTest {

    private static final long CHART_ID = 42L;
    private static final long DELIVERY_TAG = 7L;
    private static final String VALID_RESULT = "【【【【【\n{\"title\":{\"text\":\"销售分析\"}}\n【【【【【\n销售额持续增长";

    @Mock
    private ChartService chartService;
    @Mock
    private AiManager aiManager;
    @Mock
    private Channel channel;
    @InjectMocks
    private BiMessageConsumer consumer;

    private Chart chart;

    @BeforeEach
    void setUp() {
        chart = new Chart();
        chart.setId(CHART_ID);
        chart.setGoal("分析销售额");
        chart.setChartType("折线图");
        chart.setChartData("月份,销售额\n1,100");
        chart.setStatus("wait");
    }

    @Test
    void successPersistsResultBeforeAcknowledging() throws IOException {
        givenChart();
        when(chartService.updateById(any(Chart.class))).thenReturn(true);
        when(aiManager.doChat(anyLong(), anyString())).thenReturn(VALID_RESULT);

        consumer.receiveMessage("42", channel, DELIVERY_TAG);

        ArgumentCaptor<Chart> updates = ArgumentCaptor.forClass(Chart.class);
        org.mockito.InOrder order = inOrder(chartService, aiManager, channel);
        order.verify(chartService).getById(CHART_ID);
        order.verify(chartService).updateById(updates.capture());
        order.verify(aiManager).doChat(anyLong(), argThat(input -> input.contains("\"goal\":\"分析销售额\"")
                && input.contains("\"chartType\":\"折线图\"") && input.contains("严格 JSON 对象")));
        order.verify(chartService).updateById(updates.capture());
        order.verify(channel).basicAck(DELIVERY_TAG, false);
        assertEquals("running", updates.getAllValues().get(0).getStatus());
        Chart completed = updates.getAllValues().get(1);
        assertEquals("succeed", completed.getStatus());
        assertEquals(CHART_ID, completed.getId());
        assertEquals("{\"title\":{\"text\":\"销售分析\"}}", completed.getGenChart());
        assertEquals("销售额持续增长", completed.getGenResult());
        verifyNoMoreInteractions(channel);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "abc", "0", "-1", "9223372036854775808", "1.2"})
    void invalidIdIsRejectedExactlyOnce(String message) throws IOException {
        assertDoesNotThrow(() -> consumer.receiveMessage(message, channel, DELIVERY_TAG));

        verifyRejected();
        verifyNoInteractions(chartService, aiManager);
    }

    @Test
    void missingChartIsRejectedWithoutCallingAi() throws IOException {
        when(chartService.getById(CHART_ID)).thenReturn(null);

        assertDoesNotThrow(() -> consumer.receiveMessage("42", channel, DELIVERY_TAG));

        verifyRejected();
        verify(chartService, never()).updateById(any(Chart.class));
        verifyNoInteractions(aiManager);
    }

    @Test
    void chartLookupExceptionPersistsSafeFailureAndRejects() throws IOException {
        when(chartService.getById(CHART_ID)).thenThrow(new IllegalStateException("jdbc-password=do-not-expose"));
        when(chartService.updateById(any(Chart.class))).thenReturn(true);

        assertDoesNotThrow(() -> consumer.receiveMessage("42", channel, DELIVERY_TAG));

        assertFailure("读取图表任务失败", 1);
        verifyRejected();
        verifyNoInteractions(aiManager);
    }

    @Test
    void aiExceptionPersistsSafeFailureAndRejects() throws IOException {
        givenChart();
        when(chartService.updateById(any(Chart.class))).thenReturn(true);
        when(aiManager.doChat(anyLong(), anyString()))
                .thenThrow(new IllegalStateException("accessKey=do-not-expose"));

        assertDoesNotThrow(() -> consumer.receiveMessage("42", channel, DELIVERY_TAG));

        assertFailure("AI 生成失败", 2);
        verifyRejected();
    }

    @Test
    void knownBusinessFailureIsPreserved() throws IOException {
        givenChart();
        when(chartService.updateById(any(Chart.class))).thenReturn(true);
        when(aiManager.doChat(anyLong(), anyString()))
                .thenThrow(new BusinessException(ErrorCode.SYSTEM_ERROR, "AI 响应错误"));

        consumer.receiveMessage("42", channel, DELIVERY_TAG);

        assertFailure("AI 响应错误", 2);
        verifyRejected();
    }

    @Test
    void unknownBusinessFailureDoesNotExposeSensitiveDetails() throws IOException {
        givenChart();
        when(chartService.updateById(any(Chart.class))).thenReturn(true);
        when(aiManager.doChat(anyLong(), anyString()))
                .thenThrow(new BusinessException(ErrorCode.SYSTEM_ERROR, "accessKey=do-not-expose"));

        consumer.receiveMessage("42", channel, DELIVERY_TAG);

        assertFailure("AI 生成失败", 2);
        verifyRejected();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"bad result", "【【【【【\nnot-json\n【【【【【\n结论", "【【【【【\n[]\n【【【【【\n结论", "【【【【【\n{}\n【【【【【\n "})
    void invalidAiOutputFailsInsteadOfPersistingSuccess(String result) throws IOException {
        givenChart();
        when(chartService.updateById(any(Chart.class))).thenReturn(true);
        when(aiManager.doChat(anyLong(), anyString())).thenReturn(result);

        assertDoesNotThrow(() -> consumer.receiveMessage("42", channel, DELIVERY_TAG));

        assertFailure("AI 生成结果格式错误", 2);
        verifyRejected();
    }

    @Test
    void runningUpdateFalsePersistsFailureAndDoesNotCallAi() throws IOException {
        givenChart();
        when(chartService.updateById(any(Chart.class))).thenReturn(false, true);

        consumer.receiveMessage("42", channel, DELIVERY_TAG);

        assertFailure("更新图表执行中状态失败", 2);
        verifyRejected();
        verifyNoInteractions(aiManager);
    }

    @Test
    void runningUpdateExceptionPersistsFailureAndDoesNotCallAi() throws IOException {
        givenChart();
        when(chartService.updateById(any(Chart.class)))
                .thenThrow(new IllegalStateException("jdbc-password=do-not-expose")).thenReturn(true);

        assertDoesNotThrow(() -> consumer.receiveMessage("42", channel, DELIVERY_TAG));

        assertFailure("更新图表执行中状态失败", 2);
        verifyRejected();
        verifyNoInteractions(aiManager);
    }

    @Test
    void resultUpdateFalseRejectsWithoutAlsoAcknowledging() throws IOException {
        givenChart();
        when(chartService.updateById(any(Chart.class))).thenReturn(true, false, true);
        when(aiManager.doChat(anyLong(), anyString())).thenReturn(VALID_RESULT);

        consumer.receiveMessage("42", channel, DELIVERY_TAG);

        assertFailure("更新图表成功状态失败", 3);
        verifyRejected();
    }

    @Test
    void resultUpdateExceptionPersistsFailureAndRejects() throws IOException {
        givenChart();
        when(chartService.updateById(any(Chart.class)))
                .thenReturn(true).thenThrow(new IllegalStateException("jdbc-password=do-not-expose")).thenReturn(true);
        when(aiManager.doChat(anyLong(), anyString())).thenReturn(VALID_RESULT);

        assertDoesNotThrow(() -> consumer.receiveMessage("42", channel, DELIVERY_TAG));

        assertFailure("更新图表成功状态失败", 3);
        verifyRejected();
    }

    @Test
    void failedStatusUpdateReturningFalseStillRejectsOnce() throws IOException {
        givenChart();
        when(chartService.updateById(any(Chart.class))).thenReturn(true, false);
        when(aiManager.doChat(anyLong(), anyString())).thenThrow(new IllegalStateException("AI unavailable"));

        assertDoesNotThrow(() -> consumer.receiveMessage("42", channel, DELIVERY_TAG));

        assertFailure("AI 生成失败", 2);
        verifyRejected();
    }

    @Test
    void failedStatusUpdateThrowingStillRejectsOnce() throws IOException {
        givenChart();
        when(chartService.updateById(any(Chart.class)))
                .thenReturn(true).thenThrow(new IllegalStateException("database unavailable"));
        when(aiManager.doChat(anyLong(), anyString())).thenThrow(new IllegalStateException("AI unavailable"));

        assertDoesNotThrow(() -> consumer.receiveMessage("42", channel, DELIVERY_TAG));

        assertFailure("AI 生成失败", 2);
        verifyRejected();
    }

    @Test
    void acknowledgmentFailurePropagatesWithoutNackOrFailureRewrite() throws IOException {
        givenChart();
        when(chartService.updateById(any(Chart.class))).thenReturn(true);
        when(aiManager.doChat(anyLong(), anyString())).thenReturn(VALID_RESULT);
        IOException brokerFailure = new IOException("broker unavailable");
        doThrow(brokerFailure).when(channel).basicAck(DELIVERY_TAG, false);

        assertSame(brokerFailure, assertThrows(IOException.class,
                () -> consumer.receiveMessage("42", channel, DELIVERY_TAG)));

        verify(chartService, times(2)).updateById(any(Chart.class));
        verify(channel).basicAck(DELIVERY_TAG, false);
        verifyNoMoreInteractions(channel);
    }

    @Test
    void rejectionFailurePropagatesWithoutSecondSettlement() throws IOException {
        IOException brokerFailure = new IOException("broker unavailable");
        doThrow(brokerFailure).when(channel).basicNack(DELIVERY_TAG, false, false);

        assertSame(brokerFailure, assertThrows(IOException.class,
                () -> consumer.receiveMessage("invalid", channel, DELIVERY_TAG)));

        verifyRejected();
        verifyNoInteractions(chartService, aiManager);
    }

    @Test
    void rejectionAfterGenerationFailurePropagatesWithoutSecondSettlement() throws IOException {
        givenChart();
        when(chartService.updateById(any(Chart.class))).thenReturn(true);
        when(aiManager.doChat(anyLong(), anyString())).thenThrow(new IllegalStateException("AI unavailable"));
        IOException brokerFailure = new IOException("broker unavailable");
        doThrow(brokerFailure).when(channel).basicNack(DELIVERY_TAG, false, false);

        assertSame(brokerFailure, assertThrows(IOException.class,
                () -> consumer.receiveMessage("42", channel, DELIVERY_TAG)));

        assertFailure("AI 生成失败", 2);
        verifyRejected();
    }

    private void givenChart() {
        when(chartService.getById(CHART_ID)).thenReturn(chart);
    }

    private void assertFailure(String expectedMessage, int updateCount) {
        ArgumentCaptor<Chart> updates = ArgumentCaptor.forClass(Chart.class);
        verify(chartService, times(updateCount)).updateById(updates.capture());
        List<Chart> values = updates.getAllValues();
        Chart failure = values.get(values.size() - 1);
        assertEquals(CHART_ID, failure.getId());
        assertEquals("failed", failure.getStatus());
        assertEquals(expectedMessage, failure.getExecMessage());
    }

    private void verifyRejected() throws IOException {
        verify(channel).basicNack(DELIVERY_TAG, false, false);
        verifyNoMoreInteractions(channel);
    }
}
