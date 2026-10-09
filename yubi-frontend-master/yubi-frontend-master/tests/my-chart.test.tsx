import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@@/exports', () => ({ useModel: () => ({ initialState: {} }) }), { virtual: true });
jest.mock('@/services/yubi/chartController', () => ({ listMyChartByPageUsingPOST: jest.fn() }));
jest.mock('@/components/ChartPreview', () => ({
  __esModule: true,
  default: ({ option }: { option: object }) => (
    <pre data-testid="chart-option">{JSON.stringify(option)}</pre>
  ),
}));
const MyChart = require('../src/pages/MyChart').default;
const api = require('../src/services/yubi/chartController');

function respond(records: API.Chart[]) {
  api.listMyChartByPageUsingPOST.mockResolvedValue({
    code: 0,
    data: { records, total: records.length },
  });
}

test('malformed historical chart data has a local fallback and preserves the conclusion', async () => {
  respond([
    {
      id: 1,
      name: '历史分析',
      status: 'succeed',
      genChart: 'not-json',
      genResult: '增长趋势已确认',
    },
  ]);
  render(<MyChart />);
  expect(await screen.findByText('增长趋势已确认')).toBeTruthy();
  expect(screen.getByText('图表暂时无法显示')).toBeTruthy();
  expect(screen.queryByTestId('chart-option')).toBeNull();
});

test('successful analysis renders its conclusion without mutating the API record', async () => {
  const record = {
    id: 2,
    name: '增长分析',
    status: 'succeed',
    goal: '查看增长',
    genChart: '{"title":{"text":"旧标题"},"series":[]}',
    genResult: '本月增长 10%',
  };
  const original = record.genChart;
  respond([record]);
  render(<MyChart />);
  expect(await screen.findByText('本月增长 10%')).toBeTruthy();
  expect(JSON.parse(screen.getByTestId('chart-option').textContent ?? '{}').title).toBeUndefined();
  expect(record.genChart).toBe(original);
});

test('refresh reloads the current query and displays the latest task state', async () => {
  respond([{ id: 3, name: '销售分析', status: 'running' }]);
  render(<MyChart />);
  await screen.findByText('销售分析');
  respond([{ id: 3, name: '销售分析', status: 'failed', execMessage: 'AI 服务当前未启用' }]);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /刷新状态/ }).className).not.toContain(
      'ant-btn-loading',
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: /刷新状态/ }));
  expect(await screen.findByText('AI 服务当前未启用')).toBeTruthy();
  expect(api.listMyChartByPageUsingPOST).toHaveBeenCalledTimes(2);
  expect(api.listMyChartByPageUsingPOST.mock.calls[1][0]).toEqual(
    api.listMyChartByPageUsingPOST.mock.calls[0][0],
  );
});

test('a query failure offers a retry and does not pretend the library is empty', async () => {
  api.listMyChartByPageUsingPOST.mockRejectedValueOnce(new Error('网络中断'));
  render(<MyChart />);
  expect(await screen.findByText(/网络中断/)).toBeTruthy();
  expect(screen.queryByText('还没有分析记录')).toBeNull();
  respond([]);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /刷新状态/ }).className).not.toContain(
      'ant-btn-loading',
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: /刷新状态/ }));
  expect(await screen.findByText('还没有分析记录')).toBeTruthy();
});

test('expired sessions remain eligible for the global authentication redirect', async () => {
  api.listMyChartByPageUsingPOST.mockRejectedValueOnce(
    Object.assign(new Error('请先登录'), { name: 'BizError', info: { code: 40100 } }),
  );
  render(<MyChart />);
  expect(await screen.findByText(/请先登录/)).toBeTruthy();
  expect(api.listMyChartByPageUsingPOST).toHaveBeenCalledWith(
    expect.objectContaining({ current: 1 }),
  );
});
