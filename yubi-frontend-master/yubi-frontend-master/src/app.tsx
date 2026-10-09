import Footer from '@/components/Footer';
import { getLoginUserUsingGET } from '@/services/yubi/userController';
import { DownOutlined, UserOutlined } from '@ant-design/icons';
import type { ProSettings } from '@ant-design/pro-components';
import type { RunTimeLayoutConfig } from '@umijs/max';
import { history } from '@umijs/max';
import defaultSettings from '../config/defaultSettings';
import { AvatarDropdown, AvatarName } from './components/RightContent/AvatarDropdown';
import { errorConfig } from './requestConfig';

const loginPath = '/user/login';
const isPublicPage = (pathname: string) => ['/user/login', '/user/register'].includes(pathname);

export async function getInitialState(): Promise<{
  currentUser?: API.LoginUserVO;
  settings?: Partial<ProSettings>;
}> {
  if (isPublicPage(history.location.pathname)) return {};
  try {
    const res = await getLoginUserUsingGET();
    return { currentUser: res.data };
  } catch (error) {
    // Preserve any return route already supplied by the request error handler.
    if (!isPublicPage(history.location.pathname)) history.push(loginPath);
    return {};
  }
}

export const layout: RunTimeLayoutConfig = ({ initialState }) => ({
  ...defaultSettings,
  rightContentRender: () => (
    <AvatarDropdown>
      <button type="button" className="bi-account-button" aria-label="账号菜单">
        <UserOutlined />
        <span className="bi-account-name">
          <AvatarName />
        </span>
        <DownOutlined />
      </button>
    </AvatarDropdown>
  ),
  footerRender: () => <Footer />,
  onPageChange: () => {
    if (!initialState?.currentUser && !isPublicPage(history.location.pathname)) {
      history.push(loginPath);
    }
  },
  ...initialState?.settings,
});

export const request = {
  baseURL: 'http://localhost:8080',
  withCredentials: true,
  ...errorConfig,
};
