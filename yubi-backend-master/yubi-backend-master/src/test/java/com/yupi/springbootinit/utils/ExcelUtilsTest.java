package com.yupi.springbootinit.utils;

import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ExcelUtilsTest {

    @ParameterizedTest
    @ValueSource(strings = {"xls", "xlsx"})
    void convertsBothFormatsWithoutShiftingMissingCells(String format) throws IOException {
        MockMultipartFile file = workbookFile(format, new String[][]{
                {"Date", null, "Visitors", "Notes"},
                {"2026-10-01", null, "10", "ok"},
                {null, "repeat", "20"}
        });

        assertEquals("Date,,Visitors,Notes\n2026-10-01,,10,ok\n,repeat,20,\n",
                ExcelUtils.excelToCsv(file));
    }

    @ParameterizedTest
    @ValueSource(strings = {"xls", "xlsx"})
    void escapesCommasQuotesAndLineBreaksInCsv(String format) throws IOException {
        MockMultipartFile file = workbookFile(format, new String[][]{
                {"Region,name", "Comment", "Details", "Return"},
                {"east,west", "He said \"ok\"", "line1\nline2", "line1\rline2"}
        });

        assertEquals("\"Region,name\",Comment,Details,Return\n"
                        + "\"east,west\",\"He said \"\"ok\"\"\",\"line1\nline2\",\"line1\rline2\"\n",
                ExcelUtils.excelToCsv(file));
    }

    @ParameterizedTest
    @ValueSource(strings = {"xls", "xlsx"})
    void rejectsEmptyWorkbook(String format) throws IOException {
        assertParamsError(workbookFile(format, new String[0][]));
    }

    @ParameterizedTest
    @ValueSource(strings = {"xls", "xlsx"})
    void rejectsHeaderWithoutData(String format) throws IOException {
        assertParamsError(workbookFile(format, new String[][]{{"Date", "Visitors"}}));
    }

    @ParameterizedTest
    @ValueSource(strings = {"xls", "xlsx"})
    void rejectsWhitespaceOnlyData(String format) throws IOException {
        assertParamsError(workbookFile(format, new String[][]{
                {"Date", "Visitors"}, {" ", "\t"}
        }));
    }

    @Test
    void rejectsInvalidExcelContent() {
        assertParamsError(new MockMultipartFile("file", "data.xlsx",
                "application/octet-stream", "not an Excel file".getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void rejectsMissingAndEmptyFile() {
        assertParamsError(null);
        assertParamsError(new MockMultipartFile("file", "data.xlsx", "application/octet-stream", new byte[0]));
    }

    @Test
    void reportsReadFailureAsInvalidInput() throws IOException {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getInputStream()).thenThrow(new IOException("read failed"));

        assertParamsError(file);
    }

    private static void assertParamsError(MultipartFile file) {
        BusinessException exception = assertThrows(BusinessException.class, () -> ExcelUtils.excelToCsv(file));
        assertEquals(ErrorCode.PARAMS_ERROR.getCode(), exception.getCode());
    }

    private static MockMultipartFile workbookFile(String format, String[][] values) throws IOException {
        try (Workbook workbook = "xls".equals(format) ? new HSSFWorkbook() : new XSSFWorkbook();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("data");
            for (int rowIndex = 0; rowIndex < values.length; rowIndex++) {
                Row row = sheet.createRow(rowIndex);
                for (int columnIndex = 0; columnIndex < values[rowIndex].length; columnIndex++) {
                    if (values[rowIndex][columnIndex] != null) {
                        row.createCell(columnIndex).setCellValue(values[rowIndex][columnIndex]);
                    }
                }
            }
            workbook.write(output);
            return new MockMultipartFile("file", "data." + format,
                    "application/octet-stream", output.toByteArray());
        }
    }
}
