describe('request error handling', () => {
  jest.mock('@umijs/max', () => ({
    history: {
      location: { pathname: '/charts', search: '?page=2', hash: '#result' },
      replace: jest.fn(),
    },
  }));

  jest.mock('antd', () => ({
    message: { error: jest.fn(), warning: jest.fn() },
    notification: { open: jest.fn() },
  }));

  const { history } = require('@umijs/max');
  const { message } = require('antd');
  const { errorConfig } = require('../src/requestConfig');
  const { errorThrower, errorHandler } = errorConfig.errorConfig;

  function businessError(response: unknown) {
    try {
      errorThrower(response);
    } catch (error) {
      return error as Error;
    }
    throw new Error('Expected a failed response to reject');
  }

  function interceptResponse(data: unknown) {
    return (errorConfig.responseInterceptors || []).reduce(
      (response: any, interceptor: any) => interceptor(response),
      { data },
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    history.location = { pathname: '/charts', search: '?page=2', hash: '#result' };
  });

  test('accepts the backend success envelope without a template success flag', () => {
    expect(() => errorThrower({ code: 0, data: { id: 12 }, message: 'ok' })).not.toThrow();
    expect(interceptResponse({ code: 0, data: { id: 12 }, message: 'ok' })).toEqual({
      data: { code: 0, data: { id: 12 }, message: 'ok' },
    });
  });

  test('rejects backend errors even when Umi cannot find the template success flag', () => {
    expect(() => interceptResponse({ code: 40000, data: null, message: '文件格式不支持' })).toThrow(
      '文件格式不支持',
    );
  });

  test('uses the backend business error message and presents it once', () => {
    const error = businessError({ code: 40000, data: null, message: '文件格式不支持' });
    expect(error).toMatchObject({ name: 'BizError', message: '文件格式不支持' });
    errorHandler(error, {});
    expect(message.error).toHaveBeenCalledTimes(1);
    expect(message.error).toHaveBeenCalledWith('文件格式不支持');
  });

  test.each([undefined, null, { code: 50000, message: { detail: 'internal' } }])(
    'handles malformed responses with a readable fallback (%p)',
    (response) => {
      const error = businessError(response);
      expect(error).toMatchObject({ name: 'BizError', message: expect.any(String) });
      expect((error as Error).message).not.toBe('');
      expect((error as Error).message).not.toContain('[object Object]');
      errorHandler(error, {});
      expect(message.error).toHaveBeenCalledWith((error as Error).message);
    },
  );

  test('skipErrorHandler preserves the error and leaves notification and navigation to the caller', () => {
    const error = businessError({ code: 40100, data: null, message: '未登录' });
    expect(() => errorHandler(error, { skipErrorHandler: true })).toThrow(error);
    expect(message.error).not.toHaveBeenCalled();
    expect(history.replace).not.toHaveBeenCalled();
  });

  test('an expired session preserves the current local page as the login return location', () => {
    errorHandler(businessError({ code: 40100, data: null, message: '请先登录' }), {});
    expect(history.replace).toHaveBeenCalledWith(
      '/user/login?redirect=%2Fcharts%3Fpage%3D2%23result',
    );
  });

  test('an error received on the login page does not redirect back to login', () => {
    history.location = { pathname: '/user/login', search: '?redirect=%2Fcharts', hash: '' };
    errorHandler(businessError({ code: 40100, data: null, message: '未登录' }), {});
    expect(history.replace).not.toHaveBeenCalled();
  });

  test('non-authentication errors do not navigate away from the current page', () => {
    errorHandler(businessError({ code: 50000, data: null, message: '系统错误' }), {});
    expect(history.replace).not.toHaveBeenCalled();
  });

  test.each([
    [{ response: { status: 503 } }, /503/],
    [{ code: 'ECONNABORTED', request: {} }, /超时/],
    [{ request: {} }, /网络/],
    [new Error('private implementation detail'), /请求/],
  ])(
    'reports actionable network failures without exposing internal errors (%p)',
    (error, expected) => {
      errorHandler(error, {});
      expect(message.error).toHaveBeenCalledTimes(1);
      expect(message.error).toHaveBeenCalledWith(expect.stringMatching(expected));
      expect(message.error.mock.calls[0][0]).not.toContain('private implementation detail');
    },
  );

  test('response interceptors do not add a duplicate business-error notification', () => {
    const response = { data: { code: 40000, data: null, message: '文件错误', success: false } };
    try {
      interceptResponse(response.data);
    } catch {
      // The error handler owns all notifications after the interceptor rejects.
    }
    errorHandler(businessError(response.data), {});
    expect(message.error).toHaveBeenCalledTimes(1);
  });
});
