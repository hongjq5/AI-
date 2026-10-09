import { Alert } from 'antd';
import type { EChartsInstance, EChartsReactProps } from 'echarts-for-react';
import ReactECharts from 'echarts-for-react';
import React from 'react';

// Initialize synchronously so React can contain failures from both initialization
// and setOption. The library's default async mount discards its rejected promise.
class GuardedECharts extends ReactECharts {
  private ownedChart?: EChartsInstance;
  private resizeObserver?: ResizeObserver;
  state = { resizeFailed: false };

  componentDidMount() {
    this.ownedChart = this.echarts.init(this.ele);
    this.ownedChart?.setOption(this.props.option, { notMerge: true });
    this.resizeObserver = new ResizeObserver(() => {
      try {
        this.ownedChart?.resize();
      } catch {
        this.setState({ resizeFailed: true });
      }
    });
    this.resizeObserver.observe(this.ele);
  }

  componentDidUpdate(previous: EChartsReactProps) {
    if (previous.option !== this.props.option) {
      this.ownedChart?.setOption(this.props.option, { notMerge: true });
    }
  }

  componentWillUnmount() {
    this.resizeObserver?.disconnect();
    this.ownedChart?.dispose();
    this.ownedChart = undefined;
  }

  render() {
    if (this.state.resizeFailed) throw new Error('Chart resize failed');
    return super.render();
  }
}

type ChartPreviewProps = { option: Record<string, unknown>; height?: number };
type ChartPreviewState = { failed: boolean; option: Record<string, unknown> };

class ChartPreview extends React.Component<ChartPreviewProps, ChartPreviewState> {
  state: ChartPreviewState = { failed: false, option: this.props.option };

  static getDerivedStateFromProps(props: ChartPreviewProps, state: ChartPreviewState) {
    return props.option !== state.option ? { failed: false, option: props.option } : null;
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <Alert
          type="warning"
          showIcon
          message="图表暂时无法显示"
          description="这条记录的图表配置无法渲染，你仍可阅读已保存的分析结论。"
        />
      );
    }
    return (
      <GuardedECharts
        option={this.props.option}
        style={{ height: this.props.height ?? 300, width: '100%' }}
        aria-label="分析图表"
      />
    );
  }
}
export default ChartPreview;
