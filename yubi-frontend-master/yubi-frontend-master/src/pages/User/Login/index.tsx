import Footer from '@/components/Footer';
import { getLoginUserUsingGET, userLoginUsingPOST } from '@/services/yubi/userController';
import { Link } from '@@/exports';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Helmet, history, useModel } from '@umijs/max';
import { Alert, Button, Form, Input, message } from 'antd';
import React, { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Settings from '../../../../config/defaultSettings';

function getRedirect() {
  const redirect = new URL(window.location.href).searchParams.get('redirect');
  if (
    !redirect ||
    !redirect.startsWith('/') ||
    redirect.startsWith('//') ||
    redirect.includes('\\')
  ) {
    return '/';
  }
  try {
    const destination = new URL(redirect, window.location.origin);
    if (
      destination.origin !== window.location.origin ||
      destination.pathname.startsWith('/user/')
    ) {
      return '/';
    }
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return '/';
  }
}

const Login: React.FC = () => {
  const { setInitialState } = useModel('@@initialState');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submitLock = useRef(false);

  const handleSubmit = async (values: API.UserLoginRequest) => {
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    setError('');
    try {
      const res = await userLoginUsingPOST(values, { skipErrorHandler: true });
      if (res.code !== 0) throw new Error(res.message || '登录失败，请重试');
      const userRes = await getLoginUserUsingGET({ skipErrorHandler: true });
      if (userRes.code !== 0 || !userRes.data) {
        throw new Error(userRes.message || '获取登录用户信息失败');
      }
      flushSync(() => {
        setInitialState((state) => ({ ...state, currentUser: userRes.data }));
      });
      message.success('登录成功');
      history.push(getRedirect());
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : '登录失败，请稍后重试');
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="bi-auth-page">
      <Helmet>
        <title>登录 · {Settings.title}</title>
      </Helmet>
      <main className="bi-auth-main">
        <section className="bi-auth-card" aria-labelledby="login-title">
          <div className="bi-auth-brand">
            <img src="/logo.svg" alt="数据分析平台标识" width="44" height="44" />
            <span>{Settings.title}</span>
          </div>
          <h1 id="login-title">欢迎回到数据工作台</h1>
          <p className="bi-auth-description">让表格成为图表，让数据回答问题。</p>
          {error && <Alert className="bi-auth-error" type="error" showIcon message={error} />}
          <Form layout="vertical" onFinish={handleSubmit} requiredMark={false} size="large">
            <Form.Item
              name="userAccount"
              label="账号"
              rules={[{ required: true, message: '请输入账号' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="请输入用户名" autoComplete="username" />
            </Form.Item>
            <Form.Item
              name="userPassword"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={submitting}
              disabled={submitting}
            >
              登录
            </Button>
          </Form>
          <p className="bi-auth-switch">
            还没有账号？<Link to="/user/register">创建账号</Link>
          </p>
        </section>
        <p className="bi-auth-note">上传 Excel · 描述分析需求 · 查看图表与结论</p>
      </main>
      <Footer />
    </div>
  );
};
export default Login;
