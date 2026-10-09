import { userLogoutUsingPOST } from '@/services/yubi/userController';
import { LogoutOutlined } from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import { message, Spin } from 'antd';
import type { MenuInfo } from 'rc-menu/lib/interface';
import React, { useRef, useState } from 'react';
import HeaderDropdown from '../HeaderDropdown';

export const AvatarName = () => {
  const { initialState } = useModel('@@initialState');
  const user = initialState?.currentUser;
  return (
    <span>
      {user?.userName?.trim() || (user?.id ? `用户 ${String(user.id).slice(-6)}` : '我的账号')}
    </span>
  );
};

export const AvatarDropdown: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { initialState, setInitialState } = useModel('@@initialState');
  const pending = useRef(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const onMenuClick = async ({ key }: MenuInfo) => {
    if (key !== 'logout' || pending.current) return;
    pending.current = true;
    setLoggingOut(true);
    try {
      const res = await userLogoutUsingPOST({ skipErrorHandler: true });
      if (res.code !== 0 || !res.data) throw new Error(res.message || '退出失败，请重试');
      await setInitialState((state) => ({ ...state, currentUser: undefined }));
      history.replace('/user/login');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '退出失败，请重试');
    } finally {
      pending.current = false;
      setLoggingOut(false);
    }
  };

  if (!initialState?.currentUser) return <Spin size="small" />;

  return (
    <HeaderDropdown
      trigger={['click']}
      menu={{
        onClick: onMenuClick,
        items: [
          {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: loggingOut ? '正在退出…' : '退出登录',
            disabled: loggingOut,
          },
        ],
      }}
    >
      {children}
    </HeaderDropdown>
  );
};
