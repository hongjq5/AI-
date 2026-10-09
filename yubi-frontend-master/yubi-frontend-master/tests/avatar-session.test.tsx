import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { message } from 'antd';

const mockState = { currentUser: { id: 7, userName: '' } };
const mockSetInitialState = jest.fn();
const mockReplace = jest.fn();
jest.mock('@umijs/max', () => ({
  useModel: () => ({ initialState: mockState, setInitialState: mockSetInitialState }),
  history: { replace: mockReplace },
}));
jest.mock('@/services/yubi/userController', () => ({ userLogoutUsingPOST: jest.fn() }));
jest.mock('@ant-design/use-emotion-css', () => ({ useEmotionCss: () => '' }));
jest.mock('@/components/HeaderDropdown', () => ({
  __esModule: true,
  default: ({ menu, children }: any) => (
    <div>
      {children}
      <button onClick={() => menu.onClick({ key: 'logout' })}>退出登录</button>
    </div>
  ),
}));
const { AvatarDropdown, AvatarName } = require('../src/components/RightContent/AvatarDropdown');
const { userLogoutUsingPOST } = require('../src/services/yubi/userController');

afterEach(() => jest.restoreAllMocks());

test('a registered user without a nickname can see identity and log out', () => {
  render(
    <AvatarDropdown>
      <AvatarName />
    </AvatarDropdown>,
  );
  expect(screen.getByText('用户 7')).toBeTruthy();
  expect(screen.getByRole('button', { name: '退出登录' })).toBeTruthy();
});

test('logout waits for the backend, prevents duplicate requests and clears session state', async () => {
  let finish: (value: unknown) => void = () => {};
  userLogoutUsingPOST.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  render(
    <AvatarDropdown>
      <AvatarName />
    </AvatarDropdown>,
  );
  fireEvent.click(screen.getByRole('button', { name: '退出登录' }));
  fireEvent.click(screen.getByRole('button', { name: '退出登录' }));
  expect(userLogoutUsingPOST).toHaveBeenCalledTimes(1);
  expect(mockSetInitialState).not.toHaveBeenCalled();
  await act(async () => finish({ code: 0, data: true }));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/user/login'));
  expect(mockSetInitialState.mock.calls[0][0](mockState).currentUser).toBeUndefined();
});

test('logout failure retains the current session and permits retry', async () => {
  const showError = jest.spyOn(message, 'error').mockImplementation(() => undefined as any);
  userLogoutUsingPOST.mockRejectedValueOnce(new Error('网络中断'));
  render(
    <AvatarDropdown>
      <AvatarName />
    </AvatarDropdown>,
  );
  fireEvent.click(screen.getByRole('button', { name: '退出登录' }));
  await waitFor(() => expect(showError).toHaveBeenCalled());
  expect(mockSetInitialState).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
  userLogoutUsingPOST.mockResolvedValueOnce({ code: 0, data: true });
  fireEvent.click(screen.getByRole('button', { name: '退出登录' }));
  await waitFor(() => expect(mockReplace).toHaveBeenCalled());
});
