import Footer from '@/components/Footer';
import { userRegisterUsingPOST } from '@/services/yubi/userController';
import { Link } from '@@/exports';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Helmet, history } from '@umijs/max';
import { Alert, Button, Form, Input, message } from 'antd';
import React, { useRef, useState } from 'react';
import Settings from '../../../../config/defaultSettings';

const Register: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submitLock = useRef(false);

  const handleSubmit = async (values: API.UserRegisterRequest) => {
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    setError('');
    try {
      const res = await userRegisterUsingPOST(values, { skipErrorHandler: true });
      if (res.code !== 0 || !res.data) throw new Error(res.message || '注册失败，请重试');
      message.success('账号创建成功，请登录');
      history.push('/user/login');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : '注册失败，请稍后重试');
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="bi-auth-page">
      <Helmet>
        <title>注册 · {Settings.title}</title>
      </Helmet>
      <main className="bi-auth-main">
        <section className="bi-auth-card" aria-labelledby="register-title">
          <div className="bi-auth-brand">
            <img src="/logo.svg" alt="数据分析平台标识" width="44" height="44" />
            <span>{Settings.title}</span>
          </div>
          <h1 id="register-title">开启你的数据分析空间</h1>
          <p className="bi-auth-description">创建账号，集中管理你的分析任务与结果。</p>
          {error && <Alert className="bi-auth-error" type="error" showIcon message={error} />}
          <Form layout="vertical" onFinish={handleSubmit} requiredMark={false} size="large">
            <Form.Item
              name="userAccount"
              label="账号"
              rules={[
                { required: true, whitespace: true, message: '请输入账号' },
                { min: 4, message: '账号至少 4 个字符' },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="至少 4 个字符"
                autoComplete="username"
              />
            </Form.Item>
            <Form.Item
              name="userPassword"
              label="密码"
              rules={[
                { required: true, whitespace: true, message: '请输入密码' },
                { min: 8, message: '密码至少 8 个字符' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="至少 8 个字符"
                autoComplete="new-password"
              />
            </Form.Item>
            <Form.Item
              name="checkPassword"
              label="确认密码"
              dependencies={['userPassword']}
              rules={[
                { required: true, message: '请再次输入密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    return !value || getFieldValue('userPassword') === value
                      ? Promise.resolve()
                      : Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="再次输入密码"
                autoComplete="new-password"
              />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={submitting}
              disabled={submitting}
            >
              创建账号
            </Button>
          </Form>
          <p className="bi-auth-switch">
            已有账号？<Link to="/user/login">返回登录</Link>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
};
export default Register;
