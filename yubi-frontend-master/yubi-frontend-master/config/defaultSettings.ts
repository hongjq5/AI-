import { ProLayoutProps } from '@ant-design/pro-components';

/**
 * @name
 */
const Settings: ProLayoutProps & {
  pwa?: boolean;
  logo?: string;
} = {
  navTheme: 'light',
  colorPrimary: '#0f766e',
  layout: 'mix',
  contentWidth: 'Fluid',
  fixedHeader: false,
  fixSiderbar: true,
  colorWeak: false,
  title: 'AI 数据分析与可视化平台',
  pwa: true,
  logo: '/logo.svg',
  iconfontUrl: '',
  token: {
    bgLayout: '#f3f7f6',
    colorTextAppListIcon: '#0f766e',
  },
};

export default Settings;
