package com.yupi.springbootinit.bizmq;

import com.rabbitmq.client.Channel;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.constant.CommonConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.manager.AiManager;
import com.yupi.springbootinit.model.entity.Chart;
import com.yupi.springbootinit.model.enums.ChartStatusEnum;
import com.yupi.springbootinit.model.vo.BiResponse;
import com.yupi.springbootinit.service.ChartService;
import com.yupi.springbootinit.utils.ChartResultUtils;
import com.yupi.springbootinit.utils.ChartPromptUtils;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;

@Component
@Slf4j
public class BiMessageConsumer {

    @Resource
    private ChartService chartService;

    @Resource
    private AiManager aiManager;

    // 指定程序监听的消息队列和确认机制
    @SneakyThrows
    @RabbitListener(queues = {BiMqConstant.BI_QUEUE_NAME}, ackMode = "MANUAL")
    public void receiveMessage(String message, Channel channel, @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) {
        Long chartId;
        try {
            chartId = Long.valueOf(StringUtils.trimToEmpty(message));
        } catch (NumberFormatException e) {
            chartId = null;
        }
        if (chartId == null || chartId <= 0) {
            log.warn("拒绝无效的图表任务消息");
            channel.basicNack(deliveryTag, false, false);
            return;
        }

        log.info("receiveMessage chartId = {}", chartId);
        // 确认操作不放入业务异常捕获中，避免确认失败后再次确认或拒绝同一条消息。
        if (processChart(chartId)) {
            channel.basicAck(deliveryTag, false);
        } else {
            channel.basicNack(deliveryTag, false, false);
        }
    }

    private boolean processChart(long chartId) {
        String failureMessage = "读取图表任务失败";
        try {
            Chart chart = chartService.getById(chartId);
            if (chart == null) {
                log.warn("图表任务不存在，chartId = {}", chartId);
                return false;
            }

            failureMessage = "更新图表执行中状态失败";
            Chart updateChart = new Chart();
            updateChart.setId(chartId);
            updateChart.setStatus(ChartStatusEnum.RUNNING.getValue());
            if (!chartService.updateById(updateChart)) {
                throw new BusinessException(ErrorCode.SYSTEM_ERROR, failureMessage);
            }

            failureMessage = "AI 生成失败";
            String result = aiManager.doChat(CommonConstant.BI_MODEL_ID,
                    ChartPromptUtils.build(chart.getGoal(), chart.getChartType(), chart.getChartData()));
            BiResponse response = ChartResultUtils.parse(result);

            failureMessage = "更新图表成功状态失败";
            Chart updateChartResult = new Chart();
            updateChartResult.setId(chartId);
            updateChartResult.setGenChart(response.getGenChart());
            updateChartResult.setGenResult(response.getGenResult());
            updateChartResult.setStatus(ChartStatusEnum.SUCCEED.getValue());
            if (!chartService.updateById(updateChartResult)) {
                throw new BusinessException(ErrorCode.SYSTEM_ERROR, failureMessage);
            }
            return true;
        } catch (Exception e) {
            log.error("图表任务执行失败，chartId = {}，阶段 = {}", chartId, failureMessage, e);
            handleChartUpdateError(chartId, safeFailureMessage(e, failureMessage));
            return false;
        }
    }

    private String safeFailureMessage(Exception exception, String fallback) {
        if (exception instanceof BusinessException) {
            String message = exception.getMessage();
            if ("AI 响应错误".equals(message) || "AI 生成结果格式错误".equals(message)
                    || "更新图表执行中状态失败".equals(message) || "更新图表成功状态失败".equals(message)) {
                return message;
            }
        }
        return fallback;
    }

    private void handleChartUpdateError(long chartId, String execMessage) {
        Chart updateChartResult = new Chart();
        updateChartResult.setId(chartId);
        updateChartResult.setStatus(ChartStatusEnum.FAILED.getValue());
        updateChartResult.setExecMessage(execMessage);
        try {
            if (!chartService.updateById(updateChartResult)) {
                log.error("更新图表失败状态失败，chartId = {}，execMessage = {}", chartId, execMessage);
            }
        } catch (Exception e) {
            log.error("更新图表失败状态异常，chartId = {}，execMessage = {}", chartId, execMessage, e);
        }
    }

}
