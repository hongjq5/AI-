import React from 'react';
import { render, screen } from '@testing-library/react';

const mockInit = jest.fn();
jest.mock('echarts-for-react', () => {
  const ReactRuntime = require('react');
  return {
    __esModule: true,
    default: class extends ReactRuntime.Component {
      echarts = { init: mockInit };
      ele: HTMLDivElement | null = null;
      render() {
        return (
          <div
            ref={(element) => {
              this.ele = element;
            }}
          />
        );
      }
    },
  };
});
const ChartPreview = require('../src/components/ChartPreview').default;
const init = mockInit;

function chartInstance() {
  return { setOption: jest.fn(), resize: jest.fn(), dispose: jest.fn() };
}

beforeEach(() => {
  init.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

test('invalid ECharts configuration is contained and the adjacent conclusion remains visible', () => {
  const chart = chartInstance();
  chart.setOption.mockImplementation(() => {
    throw new Error('xAxis "0" not found');
  });
  init.mockReturnValue(chart);
  render(
    <>
      <ChartPreview option={{ series: [{ type: 'line', data: [1, 2] }] }} />
      <p>已保存的分析结论</p>
    </>,
  );
  expect(screen.getByText('图表暂时无法显示')).toBeTruthy();
  expect(screen.getByText('已保存的分析结论')).toBeTruthy();
  expect(chart.dispose).toHaveBeenCalledTimes(1);
});

test('initialization errors are contained without an unhandled async rejection', () => {
  init.mockImplementation(() => {
    throw new Error('Canvas unavailable');
  });
  render(<ChartPreview option={{ series: [] }} />);
  expect(screen.getByText('图表暂时无法显示')).toBeTruthy();
});

test('new valid data recovers from a rendering failure and disposes only its owned instance', () => {
  const broken = chartInstance();
  broken.setOption.mockImplementation(() => {
    throw new Error('invalid configuration');
  });
  const valid = chartInstance();
  init.mockReturnValueOnce(broken).mockReturnValueOnce(valid);
  const { rerender, unmount } = render(<ChartPreview option={{ series: [{}] }} />);
  expect(screen.getByText('图表暂时无法显示')).toBeTruthy();
  const nextOption = { series: [{ type: 'pie', data: [{ value: 5, name: 'A' }] }] };
  rerender(<ChartPreview option={nextOption} />);
  expect(screen.queryByText('图表暂时无法显示')).toBeNull();
  expect(valid.setOption).toHaveBeenCalledWith(nextOption, { notMerge: true });
  expect(broken.dispose).toHaveBeenCalledTimes(1);
  unmount();
  expect(valid.dispose).toHaveBeenCalledTimes(1);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('a later invalid option is contained and disposes the previous chart', () => {
  const chart = chartInstance();
  init.mockReturnValue(chart);
  const { rerender } = render(<ChartPreview option={{ series: [] }} />);
  chart.setOption.mockImplementationOnce(() => {
    throw new Error('invalid update');
  });
  rerender(<ChartPreview option={{ series: [{ type: 'unknown' }] }} />);
  expect(screen.getByText('图表暂时无法显示')).toBeTruthy();
  expect(chart.dispose).toHaveBeenCalledTimes(1);
});
