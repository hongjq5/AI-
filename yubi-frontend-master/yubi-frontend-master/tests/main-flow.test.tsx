import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { message } from 'antd';

const mockSetInitialState = jest.fn();
const mockPush = jest.fn();
jest.mock('@umijs/max', () => ({
  useModel: () => ({ initialState: {}, setInitialState: mockSetInitialState }),
  history: { push: mockPush },
  Helmet: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));
jest.mock('@@/exports', () => ({ Link: 'a' }), { virtual: true });
jest.mock('@ant-design/use-emotion-css', () => ({ useEmotionCss: () => 'login-container' }));
jest.mock('@/services/yubi/chartController', () => ({
  listChartByPageUsingPOST: jest.fn().mockResolvedValue({ code: 0, data: {} }),
  genChartByAiUsingPOST: jest.fn(),
  genChartByAiAsyncMqUsingPOST: jest.fn(),
  genChartByAiAsyncUsingPOST: jest.fn(),
}));
jest.mock('@/services/yubi/userController', () => ({
  userLoginUsingPOST: jest.fn(),
  getLoginUserUsingGET: jest.fn(),
}));
// ECharts uses a canvas; assert the option passed across the rendering boundary.
jest.mock('@/components/ChartPreview', () => ({
  __esModule: true,
  default: ({ option }: { option: object }) => <pre>{JSON.stringify(option)}</pre>,
}));

const Login = require('../src/pages/User/Login').default;
const AddChart = require('../src/pages/AddChart').default;
const AddChartAsync = require('../src/pages/AddChartAsync').default;
const chartApi = require('../src/services/yubi/chartController');
const userApi = require('../src/services/yubi/userController');

let success: jest.SpyInstance;
let error: jest.SpyInstance;
let uploadRequest: jest.SpyInstance;

beforeEach(() => {
  chartApi.listChartByPageUsingPOST.mockResolvedValue({ code: 0, data: {}, message: 'ok' });
  success = jest.spyOn(message, 'success').mockImplementation(() => undefined as any);
  error = jest.spyOn(message, 'error').mockImplementation(() => undefined as any);
  uploadRequest = jest.spyOn(XMLHttpRequest.prototype, 'open');
  jest.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function chooseFile(container: HTMLElement, file: File) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
}

function enterGoal() {
  fireEvent.change(
    screen.getByPlaceholderText('请输入你的分析需求，比如：分析网站用户的增长情况'),
    {
      target: { value: '分析用户增长' },
    },
  );
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: /提\s*交/ }));
}

test('login rerenders never request protected chart data', () => {
  const { rerender } = render(<Login />);
  rerender(<Login />);
  expect(chartApi.listChartByPageUsingPOST).not.toHaveBeenCalled();
});

test('login stores the user data instead of the API envelope', async () => {
  const user = { id: 7, userName: '测试用户', userRole: 'user' };
  userApi.userLoginUsingPOST.mockResolvedValue({ code: 0, data: user, message: 'ok' });
  userApi.getLoginUserUsingGET.mockResolvedValue({ code: 0, data: user, message: 'ok' });
  render(<Login />);
  fireEvent.change(screen.getByPlaceholderText('请输入用户名'), { target: { value: 'testuser' } });
  fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: /登\s*录/ }));
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  const update = mockSetInitialState.mock.calls[0][0];
  expect(update({}).currentUser).toEqual(user);
});

test.each([
  ['同步', AddChart, 'genChartByAiUsingPOST'],
  ['异步', AddChartAsync, 'genChartByAiAsyncMqUsingPOST'],
])('%s submission requires a file before sending any request', async (_, Page, method) => {
  render(<Page />);
  enterGoal();
  submit();
  expect(await screen.findByText('请上传 Excel 文件')).toBeTruthy();
  expect(chartApi[method]).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();
});

test.each([
  ['同步', AddChart, 'genChartByAiUsingPOST', 'sample.XLSX'],
  ['异步', AddChartAsync, 'genChartByAiAsyncMqUsingPOST', 'sample.XLS'],
])('%s accepts Excel files without uploading before submit', async (_, Page, method, filename) => {
  chartApi[method].mockResolvedValue({
    code: 0,
    data: { chartId: 9, genChart: '{"series":[]}', genResult: '分析结果' },
    message: 'ok',
  });
  const { container } = render(<Page />);
  enterGoal();
  const file = new File(['data'], filename);
  await chooseFile(container, file);
  await waitFor(() => expect(screen.getByText(filename)).toBeTruthy());
  expect(uploadRequest).not.toHaveBeenCalled();
  submit();
  await waitFor(() =>
    expect(chartApi[method]).toHaveBeenCalledWith(
      expect.objectContaining({ goal: '分析用户增长' }),
      {},
      file,
      { skipErrorHandler: true },
    ),
  );
  await waitFor(() => expect(success).toHaveBeenCalledTimes(1));
});

test.each([
  ['CSV', 'data.csv', 'data'],
  ['empty', 'data.xlsx', ''],
  ['oversized', 'data.xls', 'x'.repeat(1024 * 1024 + 1)],
])('rejects %s files before they enter the upload list', async (_, filename, contents) => {
  const { container } = render(<AddChart />);
  await chooseFile(container, new File([contents], filename));
  await waitFor(() => expect(error).toHaveBeenCalled());
  expect(screen.queryByText(filename)).toBeNull();
  expect(uploadRequest).not.toHaveBeenCalled();
});

test('invalid chart JSON shows only failure and releases the submit button', async () => {
  chartApi.genChartByAiUsingPOST.mockResolvedValue({
    code: 0,
    data: { chartId: 9, genChart: 'not-json', genResult: '分析结果' },
    message: 'ok',
  });
  const { container } = render(<AddChart />);
  enterGoal();
  await chooseFile(container, new File(['data'], 'data.xlsx'));
  submit();
  await waitFor(() => expect(error).toHaveBeenCalled());
  expect(success).not.toHaveBeenCalled();
  expect((screen.getByRole('button', { name: /提\s*交/ }) as HTMLButtonElement).disabled).toBe(
    false,
  );
  expect(screen.queryByText('分析结果')).toBeNull();
});

test('an async request failure preserves the file and permits retry', async () => {
  chartApi.genChartByAiAsyncMqUsingPOST.mockRejectedValue(new Error('网络中断'));
  const { container } = render(<AddChartAsync />);
  enterGoal();
  await chooseFile(container, new File(['data'], 'data.xls'));
  submit();
  await waitFor(() => expect(error).toHaveBeenCalled());
  expect(success).not.toHaveBeenCalled();
  expect(screen.getByText('data.xls')).toBeTruthy();
  expect((screen.getByRole('button', { name: /提\s*交/ }) as HTMLButtonElement).disabled).toBe(
    false,
  );
});

test('default async submission dispatches through the queue endpoint', async () => {
  chartApi.genChartByAiAsyncMqUsingPOST.mockResolvedValue({ code: 0, data: { chartId: 18 } });
  const { container } = render(<AddChartAsync />);
  enterGoal();
  await chooseFile(container, new File(['data'], 'data.xlsx'));
  submit();
  await waitFor(() => expect(chartApi.genChartByAiAsyncMqUsingPOST).toHaveBeenCalledTimes(1));
  expect(chartApi.genChartByAiAsyncUsingPOST).not.toHaveBeenCalled();
  expect((await screen.findByRole('link', { name: '查看我的分析' })).getAttribute('href')).toBe(
    '/my_chart',
  );
});
