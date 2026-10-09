import {
  ArrowRightOutlined,
  FileExcelOutlined,
  FormOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, Col, Row, Tag } from 'antd';
import React from 'react';
import '../analysis.less';

const Guide: React.FC = () => (
  <div className="analysis-workspace">
    <header className="analysis-heading">
      <div>
        <div className="analysis-eyebrow">开始使用</div>
        <h1>使用说明</h1>
        <p>准备一份表格，带着问题开始分析。</p>
      </div>
      <Button type="primary" href="/add_chart_async">
        新建分析 <ArrowRightOutlined />
      </Button>
    </header>
    <Row gutter={[24, 24]}>
      <Col xs={24} md={8}>
        <Card className="analysis-card analysis-guide-step">
          <FileExcelOutlined />
          <h2>1. 整理 Excel</h2>
          <p>
            支持 .xlsx 与 .xls，大小不超过
            1MB。将数据放在第一张工作表中，首行使用清晰的列名，避免合并单元格与空表。
          </p>
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card className="analysis-card analysis-guide-step">
          <FormOutlined />
          <h2>2. 写下分析需求</h2>
          <p>
            明确关注的指标、时间段和比较维度。可以指定图表类型，也可以留空。为分析命名，便于稍后搜索。
          </p>
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card className="analysis-card analysis-guide-step">
          <LineChartOutlined />
          <h2>3. 查看图表与结论</h2>
          <p>
            提交后进入“我的分析”，点击“刷新状态”查看进度。任务完成后，同一张卡片中会展示图表与分析结论。
          </p>
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card className="analysis-card" title="选择适合的分析方式">
          <div className="analysis-guide-choice">
            <h3>新建分析</h3>
            <p>后台处理任务。提交成功后可以离开页面，再到我的分析中查看结果。</p>
            <a href="/add_chart_async">
              创建后台分析 <ArrowRightOutlined />
            </a>
          </div>
          <div className="analysis-guide-choice">
            <h3>即时分析</h3>
            <p>在当前页面等待图表和结论，适合希望直接查看结果的场景。提交后请保持页面打开。</p>
            <a href="/add_chart">
              进入即时分析 <ArrowRightOutlined />
            </a>
          </div>
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card className="analysis-card" title="理解任务状态">
          <dl className="analysis-status-guide">
            <dt>
              <Tag color="gold">等待处理</Tag>
            </dt>
            <dd>任务已提交，等待开始分析。</dd>
            <dt>
              <Tag color="processing">分析中</Tag>
            </dt>
            <dd>正在处理数据并生成结果。</dd>
            <dt>
              <Tag color="success">已完成</Tag>
            </dt>
            <dd>可以查看保存的图表与分析结论。</dd>
            <dt>
              <Tag color="error">分析失败</Tag>
            </dt>
            <dd>查看卡片中的失败原因，修正后重新提交。</dd>
          </dl>
        </Card>
      </Col>
    </Row>
    <Alert
      className="analysis-guide-notice"
      type="info"
      showIcon
      message="分析结果需要结合原始数据判断"
      description="AI 分析依赖可用的模型服务。若提示服务未启用或不可用，请在服务恢复后重试。图表与结论仅作为理解数据的辅助，请核对关键数字。"
    />
  </div>
);
export default Guide;
