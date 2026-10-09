package com.yupi.springbootinit.manager;

import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.yucongming.dev.client.YuCongMingClient;
import com.yupi.yucongming.dev.common.BaseResponse;
import com.yupi.yucongming.dev.model.DevChatRequest;
import com.yupi.yucongming.dev.model.DevChatResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.env.MapPropertySource;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AiManagerBoundaryTest {
    private AnnotationConfigApplicationContext context;
    private YuCongMingClient client;

    @BeforeEach
    void setUp() {
        client = mock(YuCongMingClient.class);
    }

    @AfterEach
    void tearDown() {
        if (context != null) context.close();
    }

    private AiManager manager(Map<String, Object> properties) {
        context = new AnnotationConfigApplicationContext();
        context.getEnvironment().getPropertySources().addFirst(new MapPropertySource("test", properties));
        context.registerBean("yuCongMingClient", YuCongMingClient.class, () -> client);
        context.register(AiManager.class);
        context.refresh();
        return context.getBean(AiManager.class);
    }

    private AiManager manager() {
        return manager(new HashMap<>());
    }

    @Test
    void disabledAiFailsBeforeCallingSupplier() {
        Map<String, Object> properties = new HashMap<>();
        properties.put("bi.ai.enabled", "false");
        when(client.doChat(any())).thenReturn(new BaseResponse<>(0, new DevChatResponse("answer")));
        BusinessException error = assertThrows(BusinessException.class,
                () -> manager(properties).doChat(123L, "test"));
        assertEquals(ErrorCode.OPERATION_ERROR.getCode(), error.getCode());
        assertEquals("AI 服务尚未启用，请先完成配置", error.getMessage());
        verifyNoInteractions(client);
    }

    @Test
    void defaultConfigurationUsesCallersModelAndReturnsContent() {
        when(client.doChat(any())).thenReturn(new BaseResponse<>(0, new DevChatResponse("answer")));
        assertEquals("answer", manager().doChat(123L, "test"));
        ArgumentCaptor<DevChatRequest> request = ArgumentCaptor.forClass(DevChatRequest.class);
        verify(client).doChat(request.capture());
        assertEquals(123L, request.getValue().getModelId());
        assertEquals("test", request.getValue().getMessage());
    }

    @Test
    void configuredModelOverridesLegacyModelId() {
        Map<String, Object> properties = new HashMap<>();
        properties.put("bi.ai.model-id", "9876543210");
        when(client.doChat(any())).thenReturn(new BaseResponse<>(0, new DevChatResponse("answer")));
        assertEquals("answer", manager(properties).doChat(123L, "test"));
        ArgumentCaptor<DevChatRequest> request = ArgumentCaptor.forClass(DevChatRequest.class);
        verify(client).doChat(request.capture());
        assertEquals(9876543210L, request.getValue().getModelId());
    }

    @Test
    void nullResponseReportsSafeBusinessError() {
        assertSafeFailure(manager(), "AI 响应错误");
    }

    @Test
    void nonzeroResponseCodeIsRejectedEvenWhenDataExists() {
        when(client.doChat(any())).thenReturn(
                new BaseResponse<>(40101, new DevChatResponse("not a successful result"), "private supplier details"));
        assertSafeFailure(manager(), "AI 服务返回错误（错误码：40101）");
    }

    @Test
    void missingDataReportsSafeBusinessError() {
        when(client.doChat(any())).thenReturn(new BaseResponse<>(0, null));
        assertSafeFailure(manager(), "AI 响应内容为空");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\n\t"})
    void blankContentReportsSafeBusinessError(String content) {
        when(client.doChat(any())).thenReturn(new BaseResponse<>(0, new DevChatResponse(content)));
        assertSafeFailure(manager(), "AI 响应内容为空");
    }

    private void assertSafeFailure(AiManager manager, String message) {
        BusinessException error = assertThrows(BusinessException.class, () -> manager.doChat(123L, "test"));
        assertEquals(ErrorCode.SYSTEM_ERROR.getCode(), error.getCode());
        assertEquals(message, error.getMessage());
    }
}
