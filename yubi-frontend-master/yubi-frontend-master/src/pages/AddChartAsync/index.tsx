import { genChartByAiAsyncMqUsingPOST } from '@/services/yubi/chartController';
import type { ChartFormValues } from '@/utils/chartUpload';
import { beforeExcelUpload, getExcelFileError, normalizeUpload } from '@/utils/chartUpload';
import {
  ArrowRightOutlined,
  BarChartOutlined,
  FileExcelOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, Col, Form, Input, message, Row, Select, Space, Upload } from 'antd';
import { useForm } from 'antd/es/form/Form';
import TextArea from 'antd/es/input/TextArea';
import React, { useRef, useState } from 'react';
import '../analysis.less';

const AddChartAsync: React.FC = () => {
  const [form] = useForm();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submittingRef = useRef(false);

  const onFinish = async (values: ChartFormValues) => {
    if (submittingRef.current) return;
    const file = values.file?.[0]?.originFileObj;
    const fileError = getExcelFileError(file);
    if (fileError) {
      message.error(fileError);
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitted(false);
    const { goal, name, chartType } = values;
    try {
      const res = await genChartByAiAsyncMqUsingPOST({ goal, name, chartType }, {}, file, {
        skipErrorHandler: true,
      });
      if (res?.code !== 0 || !res.data?.chartId)
        throw new Error(res?.message || '未返回分析任务编号');
      message.success('分析任务已提交，可在我的分析中查看进度');
      setSubmitted(true);
      form.resetFields();
    } catch (error) {
      message.error('分析失败，' + (error instanceof Error ? error.message : '请稍后重试'));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="analysis-workspace">
      <header className="analysis-heading">
        <div>
          <div className="analysis-eyebrow">从数据到洞察</div>
          <h1>新建分析</h1>
          <p>把表格交给分析平台，让数据回答你的问题。</p>
        </div>
        <a href="/my_chart">
          我的分析 <ArrowRightOutlined />
        </a>
      </header>
      {submitted && (
        <Alert
          className="analysis-submit-feedback"
          type="success"
          showIcon
          message="任务已提交，正在等待处理"
          description="你可以离开此页面，在“我的分析”中刷新查看进度与结果。"
          action={
            <Button href="/my_chart" size="small">
              查看我的分析
            </Button>
          }
          closable
          onClose={() => setSubmitted(false)}
        />
      )}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={15}>
          <Card title="配置分析" className="analysis-card">
            <Form form={form} name="addChart" layout="vertical" onFinish={onFinish}>
              <Form.Item
                name="goal"
                label="分析需求"
                extra="描述你关心的指标、时间范围或对比维度，让结论更贴近问题。"
                rules={[{ required: true, whitespace: true, message: '请输入分析目标' }]}
              >
                <TextArea rows={4} placeholder="请输入你的分析需求，比如：分析网站用户的增长情况" />
              </Form.Item>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="name" label="分析名称">
                    <Input placeholder="请输入图表名称" maxLength={100} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="chartType" label="图表类型">
                    <Select
                      allowClear
                      placeholder="不指定，由分析结果决定"
                      options={['折线图', '柱状图', '堆叠图', '饼图', '雷达图'].map((value) => ({
                        value,
                        label: value,
                      }))}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                name="file"
                label="原始数据"
                extra="支持 .xlsx、.xls，文件不超过 1MB。"
                valuePropName="fileList"
                getValueFromEvent={normalizeUpload}
                rules={[{ required: true, message: '请上传 Excel 文件' }]}
              >
                <Upload
                  name="file"
                  maxCount={1}
                  accept=".xlsx,.xls"
                  beforeUpload={beforeExcelUpload}
                >
                  <Button icon={<UploadOutlined />}>上传 Excel 文件</Button>
                </Upload>
              </Form.Item>
              <div className="analysis-form-note">提交后在后台处理，你可以继续使用平台。</div>
              <Form.Item className="analysis-form-actions">
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={submitting}
                    disabled={submitting}
                  >
                    提交
                  </Button>
                  <Button htmlType="reset" disabled={submitting}>
                    重置
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>
        <Col xs={24} lg={9}>
          <aside className="analysis-side-panel">
            <div className="analysis-side-icon">
              <BarChartOutlined />
            </div>
            <h2>三个步骤，读懂数据</h2>
            <ol className="analysis-steps">
              <li>
                <strong>准备表格</strong>
                <p>首行填写清晰的列名，每一行对应一条数据，避免合并单元格。</p>
              </li>
              <li>
                <strong>提出问题</strong>
                <p>例如：对比每月销售额，并找出增长最快的月份。</p>
              </li>
              <li>
                <strong>查看结果</strong>
                <p>进入我的分析刷新状态，阅读可视化图表与分析结论。</p>
              </li>
            </ol>
            <div className="analysis-side-tip">
              <FileExcelOutlined /> 使用同一张工作表整理本次分析的数据。
            </div>
            <a href="/guide">
              查看使用说明 <ArrowRightOutlined />
            </a>
          </aside>
        </Col>
      </Row>
    </div>
  );
};
export default AddChartAsync;
