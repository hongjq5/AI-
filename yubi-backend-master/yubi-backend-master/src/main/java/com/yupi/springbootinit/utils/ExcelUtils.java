package com.yupi.springbootinit.utils;

import cn.hutool.core.collection.CollUtil;
import com.alibaba.excel.EasyExcel;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;

/**
 * Excel 相关工具类
 */
@Slf4j
public class ExcelUtils {

    /**
     * excel 转 csv
     *
     * @param multipartFile
     * @return
     */
    public static String excelToCsv(MultipartFile multipartFile) {
        if (multipartFile == null || multipartFile.isEmpty()) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Excel 文件不能为空");
        }
        List<Map<Integer, String>> rows;
        try (InputStream inputStream = multipartFile.getInputStream()) {
            // 由文件内容自动识别 XLS / XLSX，避免已通过校验的 XLS 解析失败。
            rows = EasyExcel.read(inputStream)
                    .sheet()
                    .headRowNumber(0)
                    .doReadSync();
        } catch (IOException | RuntimeException e) {
            log.error("表格处理错误", e);
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Excel 文件无法读取，请检查文件内容");
        }
        if (CollUtil.isEmpty(rows) || !hasValues(rows.get(0))
                || rows.stream().skip(1).noneMatch(ExcelUtils::hasValues)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Excel 文件必须包含表头和有效数据");
        }

        // 使用列索引保留空单元格，所有行保持相同列数。
        int columnCount = rows.stream()
                .flatMap(row -> row.keySet().stream())
                .mapToInt(Integer::intValue)
                .max().orElse(-1) + 1;
        StringBuilder csv = new StringBuilder();
        for (Map<Integer, String> row : rows) {
            for (int column = 0; column < columnCount; column++) {
                if (column > 0) {
                    csv.append(',');
                }
                csv.append(escapeCsv(row.get(column)));
            }
            csv.append('\n');
        }
        return csv.toString();
    }

    private static boolean hasValues(Map<Integer, String> row) {
        return row.values().stream().anyMatch(StringUtils::isNotBlank);
    }

    private static String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        if (StringUtils.containsAny(value, ",\"\r\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
