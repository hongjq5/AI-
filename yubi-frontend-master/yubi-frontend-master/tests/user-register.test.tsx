import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { message } from 'antd';

const mockPush = jest.fn();
const mockSetInitialState = jest.fn();
jest.mock('@umijs/max', () => ({
  history: { push: mockPush },
  useModel: () => ({ setInitialState: mockSetInitialState }),
  Helmet: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));
jest.mock('@@/exports', () => ({ Link: 'a' }), { virtual: true });
jest.mock('@/services/yubi/userController', () => ({
  userRegisterUsingPOST: jest.fn(),
  userLoginUsingPOST: jest.fn(),
  getLoginUserUsingGET: jest.fn(),
}));

const Register = require('../src/pages/User/Register').default;
const Login = require('../src/pages/User/Login').default;
const userApi = require('../src/services/yubi/userController');

beforeEach(() => {
  window.history.replaceState({}, '', '/user/login');
  jest.spyOn(message, 'success').mockImplementation(() => undefined as any);
  jest.spyOn(message, 'error').mockImplementation(() => undefined as any);
});

afterEach(() => jest.restoreAllMocks());

function fillRegister(account = 'testuser', password = 'password123', confirmation = password) {
  fireEvent.change(screen.getByLabelText('账号'), { target: { value: account } });
  fireEvent.change(screen.getByLabelText('密码'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('确认密码'), { target: { value: confirmation } });
}

test.each([
  ['abc', 'password123', 'password123', '账号至少 4 个字符'],
  ['testuser', 'short', 'short', '密码至少 8 个字符'],
  ['testuser', 'password123', 'different123', '两次输入的密码不一致'],
])(
  'register rejects invalid credentials: %s / %s',
  async (account, password, confirmation, error) => {
    render(<Register />);
    fillRegister(account, password, confirmation);
    fireEvent.click(screen.getByRole('button', { name: '创建账号' }));
    expect(await screen.findByText(error)).toBeTruthy();
    expect(userApi.userRegisterUsingPOST).not.toHaveBeenCalled();
  },
);

test('register sends the real API payload once and returns to login after success', async () => {
  let resolve: (value: unknown) => void = () => {};
  userApi.userRegisterUsingPOST.mockReturnValue(new Promise((done) => (resolve = done)));
  const { container } = render(<Register />);
  fillRegister();
  fireEvent.submit(container.querySelector('form')!);
  fireEvent.submit(container.querySelector('form')!);
  await waitFor(() => expect(userApi.userRegisterUsingPOST).toHaveBeenCalledTimes(1));
  expect(userApi.userRegisterUsingPOST).toHaveBeenCalledWith(
    { userAccount: 'testuser', userPassword: 'password123', checkPassword: 'password123' },
    { skipErrorHandler: true },
  );
  await act(async () => resolve({ code: 0, data: 7 }));
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/user/login'));
});

test('registration errors keep the form and allow retry', async () => {
  userApi.userRegisterUsingPOST.mockRejectedValue(new Error('账号已存在'));
  render(<Register />);
  fillRegister();
  fireEvent.click(screen.getByRole('button', { name: '创建账号' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', '账号已存在');
  expect((screen.getByLabelText('账号') as HTMLInputElement).value).toBe('testuser');
  await waitFor(() =>
    expect((screen.getByRole('button', { name: '创建账号' }) as HTMLButtonElement).disabled).toBe(
      false,
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: '创建账号' }));
  await waitFor(() => expect(userApi.userRegisterUsingPOST).toHaveBeenCalledTimes(2));
});

test.each([
  ['https://example.com', '/'],
  ['//example.com', '/'],
  ['/\\example.com', '/'],
  ['/user/login', '/'],
  ['/my_chart?name=test', '/my_chart?name=test'],
])('login validates redirect %s', async (redirect, expected) => {
  window.history.replaceState({}, '', `/user/login?redirect=${encodeURIComponent(redirect)}`);
  const user = { id: 9, userAccount: 'testuser' };
  userApi.userLoginUsingPOST.mockResolvedValue({ code: 0, data: user });
  userApi.getLoginUserUsingGET.mockResolvedValue({ code: 0, data: user });
  render(<Login />);
  fireEvent.change(screen.getByPlaceholderText('请输入用户名'), { target: { value: 'testuser' } });
  fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: /登\s*录/ }));
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith(expected));
});
