describe('initial login state', () => {
  jest.mock('@umijs/max', () => ({
    history: {
      location: { pathname: '/charts', search: '', hash: '' },
      push: jest.fn(),
    },
    Link: () => null,
  }));
  jest.mock('@/services/yubi/userController', () => ({ getLoginUserUsingGET: jest.fn() }));
  jest.mock('@/components/Footer', () => () => null);
  jest.mock('@/components/RightContent', () => ({ Question: () => null }));
  jest.mock('@/components/RightContent/AvatarDropdown', () => ({
    AvatarDropdown: () => null,
    AvatarName: () => null,
  }));
  jest.mock('@ant-design/icons', () => ({ LinkOutlined: () => null }));
  jest.mock('@ant-design/pro-components', () => ({ SettingDrawer: () => null }));

  const { history } = require('@umijs/max');
  const { getLoginUserUsingGET } = require('@/services/yubi/userController');
  const { getInitialState } = require('../src/app');

  beforeEach(() => {
    jest.clearAllMocks();
    history.location = { pathname: '/charts', search: '', hash: '' };
  });

  test('the initial user probe preserves the login return route set by request error handling', async () => {
    getLoginUserUsingGET.mockImplementationOnce(async () => {
      // The request handler has already redirected before rejecting the API call.
      history.location = { pathname: '/user/login', search: '?redirect=%2Fcharts', hash: '' };
      throw new Error('未登录');
    });
    await getInitialState();
    expect(history.push).not.toHaveBeenCalled();
    expect(history.location.search).toBe('?redirect=%2Fcharts');
  });

  test('initial user state contains the user data from a successful backend response', async () => {
    getLoginUserUsingGET.mockResolvedValueOnce({
      code: 0,
      data: { id: 12, userName: '用户' },
      message: 'ok',
    });
    const state = await getInitialState();
    expect(state.currentUser).toEqual({ id: 12, userName: '用户' });
  });

  test.each(['/user/login', '/user/register'])(
    'public route %s does not probe a protected API',
    async (pathname) => {
      history.location.pathname = pathname;
      expect(await getInitialState()).toEqual({});
      expect(getLoginUserUsingGET).not.toHaveBeenCalled();
      expect(history.push).not.toHaveBeenCalled();
    },
  );
});
