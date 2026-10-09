package com.yupi.springbootinit.model.enums;

/** 图表任务状态，值与数据库及前端约定保持一致。 */
public enum ChartStatusEnum {
    WAIT("wait"),
    RUNNING("running"),
    SUCCEED("succeed"),
    FAILED("failed");

    private final String value;

    ChartStatusEnum(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
