import { genChartByAiUsingPOST } from '@/services/yubi/chartController';
import type { ChartFormValues } from '@/utils/chartUpload';
import { beforeExcelUpload, getExcelFileError, normalizeUpload } from '@/utils/chartUpload';
import { ArrowRightOutlined, UploadOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  message,
  Row,
  Select,
  Space,
  Spin,
  Upload,
} from 'antd';
import TextArea from 'antd/es/input/TextArea';
import React, { useRef, useState } from 'react';
import ChartPreview from '@/components/ChartPreview';
import '../analysis.less';

const AddChart: React.FC = () => {
  const [chart, setChart] = useState<API.BiResponse>();
  const [option, setOption] = useState<Record<string, unknown>>();
  const [submitting, setSubmitting] = useState(false);
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
    setChart(undefined);
    setOption(undefined);
    const { goal, name, chartType } = values;
    try {
      const res = await genChartByAiUsingPOST({ goal, name, chartType }, {}, file, {
        skipErrorHandler: true,
      });
      if (res?.code !== 0 || !res.data) throw new Error(res?.message || '未返回分析结果');
      const chartOption = JSON.parse(res.data.genChart ?? '');
      if (!chartOption || typeof chartOption !== 'object' || Array.isArray(chartOption))
        throw new Error('图表代码解析错误');
      setChart(res.data);
      setOption(chartOption);
      message.success('分析成功');
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
          <h1>即时分析</h1>
          <p>上传表格并提出问题，在当前页面查看图表与分析结论。</p>
        </div>
        <a href="/add_chart_async">
          需要后台处理？新建分析 <ArrowRightOutlined />
        </a>
      </header>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={11}>
          <Card title="配置分析" className="analysis-card">
            <Form name="addChart" layout="vertical" onFinish={onFinish}>
              <Form.Item
                name="goal"
                label="分析需求"
                rules={[{ required: true, whitespace: true, message: '请输入分析目标' }]}
              >
                <TextArea rows={4} placeholder="请输入你的分析需求，比如：分析网站用户的增长情况" />
              </Form.Item>
              <Form.Item name="name" label="分析名称">
                <Input placeholder="请输入图表名称" maxLength={100} />
              </Form.Item>
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
              <Form.Item
                name="file"
                label="原始数据"
                extra="支持 .xlsx、.xls，文件不超过 1MB。首行请填写列名。"
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
              <div className="analysis-form-note">
                提交后请保持页面打开；处理时间取决于数据量与服务响应。
              </div>
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
        <Col xs={24} lg={13}>
          <Spin spinning={submitting} tip="正在分析数据…">
            <div className="analysis-result-stack">
              <Card title="可视化图表" className="analysis-card">
                {option ? (
                  <ChartPreview option={option} height={320} />
                ) : (
                  <Empty
                    className="analysis-empty"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="提交数据后，图表将在这里呈现"
                  />
                )}
              </Card>
              <Card title="分析结论" className="analysis-card">
                {chart?.genResult ? (
                  <p className="analysis-conclusion">{chart.genResult}</p>
                ) : (
                  <p className="analysis-muted">围绕你的分析需求，提炼数据趋势与关键发现。</p>
                )}
              </Card>
            </div>
          </Spin>
        </Col>
      </Row>
    </div>
  );
};
export default AddChart;
