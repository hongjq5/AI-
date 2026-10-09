package com.yupi.springbootinit.utils;

import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.ThrowUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.Locale;

/** 图表上传统一约束，文件内容由 ExcelUtils 解析。 */
public final class ChartFileUtils {
    public static final long MAX_FILE_SIZE = 1024 * 1024L;

    private ChartFileUtils() {
    }

    public static void validate(MultipartFile file) {
        ThrowUtils.throwIf(file == null || file.isEmpty(), ErrorCode.PARAMS_ERROR, "请上传非空 Excel 文件");
        ThrowUtils.throwIf(file.getSize() > MAX_FILE_SIZE, ErrorCode.PARAMS_ERROR, "文件超过 1MB");
        ThrowUtils.throwIf(!isSupportedExtension(file.getOriginalFilename()),
                ErrorCode.PARAMS_ERROR, "仅支持 xlsx、xls 格式的 Excel 文件");
    }

    public static boolean isSupportedExtension(String filename) {
        if (filename == null) {
            return false;
        }
        int dot = filename.lastIndexOf('.');
        if (dot < 0) {
            return false;
        }
        String extension = filename.substring(dot + 1).toLowerCase(Locale.ROOT);
        return "xlsx".equals(extension) || "xls".equals(extension);
    }
}
