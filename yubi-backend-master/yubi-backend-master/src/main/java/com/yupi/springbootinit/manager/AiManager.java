package com.yupi.springbootinit.manager;

import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.yucongming.dev.client.YuCongMingClient;
import com.yupi.yucongming.dev.common.BaseResponse;
import com.yupi.yucongming.dev.model.DevChatRequest;
import com.yupi.yucongming.dev.model.DevChatResponse;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;

/**
 * 用于对接 AI 平台
 */
@Service
public class AiManager {

    @Resource
    private YuCongMingClient yuCongMingClient;

    @Value("${bi.ai.enabled:true}")
    private boolean enabled = true;

    @Value("${bi.ai.model-id:0}")
    private long configuredModelId;

    /**
     * AI 对话
     *
     * @param modelId
     * @param message
     * @return
     */
    public String doChat(long modelId, String message) {
        if (!enabled) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "AI 服务尚未启用，请先完成配置");
        }
        DevChatRequest devChatRequest = new DevChatRequest();
        devChatRequest.setModelId(configuredModelId > 0 ? configuredModelId : modelId);
        devChatRequest.setMessage(message);
        BaseResponse<DevChatResponse> response = yuCongMingClient.doChat(devChatRequest);
        if (response == null) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "AI 响应错误");
        }
        if (response.getCode() != 0) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR,
                    "AI 服务返回错误（错误码：" + response.getCode() + "）");
        }
        if (response.getData() == null || StringUtils.isBlank(response.getData().getContent())) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "AI 响应内容为空");
        }
        return response.getData().getContent();
    }
}
