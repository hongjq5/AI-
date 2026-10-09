package com.yupi.springbootinit.utils;

import com.yupi.springbootinit.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.*;

class ChartFileUtilsTest {
    @ParameterizedTest
    @ValueSource(strings = {"data.xlsx", "DATA.XLSX", "data.xls", "DATA.XLS", "报告.v1.xlsx"})
    void acceptsExcelNamesAtTheSizeLimit(String filename) {
        assertDoesNotThrow(() -> ChartFileUtils.validate(
                new MockMultipartFile("file", filename, null, new byte[1024 * 1024])));
    }

    @ParameterizedTest
    @ValueSource(strings = {"data", "data.csv", "data.xlsx.exe", "data.xlsx ", ""})
    void rejectsOtherFileNames(String filename) {
        assertThrows(BusinessException.class, () -> ChartFileUtils.validate(
                new MockMultipartFile("file", filename, null, new byte[] {1})));
    }

    @Test
    void missingFilenameIsUnsupported() {
        assertFalse(ChartFileUtils.isSupportedExtension(null));
    }
}
