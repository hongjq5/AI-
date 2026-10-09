import type { RequestConfig } from '@umijs/max';
import { history } from '@umijs/max';
import { message } from 'antd';

interface ResponseStructure {
  code: number;
  data?: unknown;
  message?: string;
}

type BusinessError = Error & { info?: Partial<ResponseStructure> };

function throwBusinessError(response: unknown) {
  const res = response as ResponseStructure | null | undefined;
  if (res?.code === 0) return;

  const errorMessage =
    typeof res?.message === 'string' && res.message.trim() ? res.message : '请求失败，请稍后重试';
  const error: BusinessError = new Error(errorMessage);
  error.name = 'BizError';
  error.info = { code: res?.code, data: res?.data, message: errorMessage };
  throw error;
}

export const errorConfig: RequestConfig = {
  errorConfig: {
    errorThrower: throwBusinessError,
    errorHandler: (error: any, opts: any) => {
      if (opts?.skipErrorHandler) throw error;

      if (error.name === 'BizError') {
        const businessError = error as BusinessError;
        if (businessError.info?.code === 40100) {
          const { pathname, search, hash } = history.location;
          if (pathname !== '/user/login') {
            const redirect = `${pathname}${search || ''}${hash || ''}`;
            history.replace(`/user/login?redirect=${encodeURIComponent(redirect)}`);
          }
        }
        message.error(businessError.message || '请求失败，请稍后重试');
      } else if (error.response) {
        message.error(`请求失败（HTTP ${error.response.status}），请稍后重试`);
      } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        message.error('请求超时，请稍后重试');
      } else if (error.request) {
        message.error('网络连接失败，请检查网络后重试');
      } else {
        message.error('请求失败，请稍后重试');
      }
    },
  },
  responseInterceptors: [
    (response) => {
      // 当前 Umi 版本默认只检查 success=false；后端使用 code/data/message。
      throwBusinessError(response.data);
      return response;
    },
  ],
};
