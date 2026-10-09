package com.yupi.springbootinit.utils;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.vo.BiResponse;
import org.apache.commons.lang3.StringUtils;

import java.io.IOException;

/** 校验 AI 返回的图表必须能由前端 JSON.parse 安全解析。 */
public final class ChartResultUtils {
    private static final ObjectMapper JSON = new ObjectMapper()
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);

    private ChartResultUtils() {
    }

    public static BiResponse parse(String result) {
        if (StringUtils.isBlank(result)) {
            throw invalidResult();
        }
        String[] parts = result.split("【【【【【", 3);
        if (parts.length != 3 || StringUtils.isBlank(parts[1]) || StringUtils.isBlank(parts[2])) {
            throw invalidResult();
        }
        String chart = parts[1].trim();
        try {
            JsonNode node = JSON.readTree(chart);
            if (node == null || !node.isObject()) {
                throw invalidResult();
            }
        } catch (IOException e) {
            throw invalidResult();
        }
        BiResponse response = new BiResponse();
        response.setGenChart(chart);
        response.setGenResult(parts[2].trim());
        return response;
    }

    private static BusinessException invalidResult() {
        return new BusinessException(ErrorCode.SYSTEM_ERROR, "AI 生成结果格式错误");
    }
}
