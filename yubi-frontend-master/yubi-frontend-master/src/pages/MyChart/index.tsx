import { listMyChartByPageUsingPOST } from '@/services/yubi/chartController';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Empty, List, Space, Tag } from 'antd';
import Search from 'antd/es/input/Search';
import React, { useEffect, useState } from 'react';
import ChartPreview from '@/components/ChartPreview';
import '../analysis.less';

const initialQuery: API.ChartQueryRequest = {
  current: 1,
  pageSize: 4,
  sortField: 'createTime',
  sortOrder: 'desc',
};
const statusLabels: Record<string, { text: string; color: string }> = {
  wait: { text: '等待处理', color: 'gold' },
  running: { text: '分析中', color: 'processing' },
  succeed: { text: '已完成', color: 'success' },
  failed: { text: '分析失败', color: 'error' },
};

function readChartOption(json?: string): Record<string, unknown> | undefined {
  try {
    const option = JSON.parse(json ?? '');
    if (!option || typeof option !== 'object' || Array.isArray(option)) return undefined;
    return { ...option, title: undefined };
  } catch {
    return undefined;
  }
}

function AnalysisResult({ chart }: { chart: API.Chart }) {
  if (chart.status === 'succeed') {
    const option = readChartOption(chart.genChart);
    return (
      <>
        {option ? (
          <ChartPreview option={option} />
        ) : (
          <Alert
            type="warning"
            showIcon
            message="图表暂时无法显示"
            description="这条记录的图表内容无效，你仍可阅读已保存的分析结论。"
          />
        )}
        <section className="analysis-saved-conclusion">
          <h3>分析结论</h3>
          <p className="analysis-conclusion">{chart.genResult || '这条记录没有保存分析结论。'}</p>
        </section>
      </>
    );
  }
  if (chart.status === 'failed') {
    return (
      <Alert
        type="error"
        showIcon
        message="本次分析未完成"
        description={chart.execMessage || '请检查表格与分析需求后重新提交。'}
      />
    );
  }
  if (chart.status === 'wait' || chart.status === 'running') {
    return (
      <Alert
        type="info"
        showIcon
        message={chart.status === 'wait' ? '任务正在排队' : '正在生成图表与结论'}
        description={chart.execMessage || '稍后点击“刷新状态”，查看最新处理进度。'}
      />
    );
  }
  return (
    <Alert type="warning" showIcon message="暂时无法确认任务状态" description="请刷新后重试。" />
  );
}

const MyChartPage: React.FC = () => {
  const [searchParams, setSearchParams] = useState<API.ChartQueryRequest>(initialQuery);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [chartList, setChartList] = useState<API.Chart[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await listMyChartByPageUsingPOST(searchParams);
        if (res?.code !== 0 || !res.data) throw new Error(res?.message || '未返回分析记录');
        if (active) {
          setChartList(res.data.records ?? []);
          setTotal(res.data.total ?? 0);
        }
      } catch (error) {
        if (active)
          setLoadError(
            '获取分析记录失败，' + (error instanceof Error ? error.message : '请稍后重试'),
          );
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, [searchParams, refreshVersion]);

  return (
    <div className="analysis-workspace">
      <header className="analysis-heading">
        <div>
          <div className="analysis-eyebrow">你的数据工作台</div>
          <h1>我的分析</h1>
          <p>跟踪处理进度，回看图表与结论。点击刷新获取最新状态。</p>
        </div>
        <Button type="primary" href="/add_chart_async" icon={<PlusOutlined />}>
          新建分析
        </Button>
      </header>
      <Card className="analysis-toolbar analysis-card">
        <Search
          aria-label="按分析名称搜索"
          placeholder="请输入图表名称"
          enterButton="搜索"
          allowClear
          loading={loading}
          onSearch={(name) => setSearchParams({ ...initialQuery, name: name.trim() })}
        />
        <Button
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => setRefreshVersion((value) => value + 1)}
        >
          刷新状态
        </Button>
      </Card>
      {loadError && (
        <Alert
          className="analysis-list-error"
          type="error"
          showIcon
          message={loadError}
          description="可点击“刷新状态”重试；已有记录仍保留在下方。"
        />
      )}
      <List
        className="analysis-record-list"
        grid={{ gutter: 24, xs: 1, sm: 1, md: 1, lg: 2, xl: 2, xxl: 2 }}
        pagination={
          total > 0
            ? {
                current: searchParams.current,
                pageSize: searchParams.pageSize,
                total,
                showSizeChanger: false,
                onChange: (current) => setSearchParams((params) => ({ ...params, current })),
              }
            : false
        }
        loading={loading}
        locale={{
          emptyText:
            loading || loadError ? (
              <span />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={searchParams.name ? '没有找到匹配的分析记录' : '还没有分析记录'}
              >
                {!searchParams.name && (
                  <Button href="/add_chart_async" type="primary">
                    开始第一次分析
                  </Button>
                )}
              </Empty>
            ),
        }}
        dataSource={chartList}
        renderItem={(item) => {
          const status = statusLabels[item.status ?? ''];
          return (
            <List.Item key={item.id}>
              <Card
                className="analysis-card analysis-record"
                title={<span className="analysis-record-title">{item.name || '未命名分析'}</span>}
                extra={<Tag color={status?.color}>{status?.text || '未知状态'}</Tag>}
              >
                <Space className="analysis-record-meta" wrap>
                  {item.chartType && <Tag>{item.chartType}</Tag>}
                  {item.createTime && <span>{item.createTime.replace('T', ' ').slice(0, 16)}</span>}
                </Space>
                {item.goal && (
                  <p className="analysis-record-goal">
                    <strong>分析需求</strong>
                    {item.goal}
                  </p>
                )}
                <AnalysisResult chart={item} />
              </Card>
            </List.Item>
          );
        }}
      />
    </div>
  );
};
export default MyChartPage;
