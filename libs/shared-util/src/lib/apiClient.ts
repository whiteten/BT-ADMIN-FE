import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import qs from 'qs';
import { LOG } from './log';
import { toast } from './toast';
import { createUUID, getCookie } from './util';

const Log = new LOG('Api');
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  key?: string;
  _retry?: boolean;
}

export interface ApiClientOptions {
  serviceURL?: string;
  timeout?: number;
}

export default class ApiClient {
  #instance: AxiosInstance;

  constructor(options: ApiClientOptions = {}) {
    const { serviceURL = '', timeout = 1000 * 30 } = options;
    const baseURL = `/api${serviceURL}`;
    this.#instance = axios.create({
      baseURL,
      timeout,
      withCredentials: true,
      paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'comma' }),
    });
    this.#initInterceptors();
  }

  #initInterceptors(): void {
    this.#instance.interceptors.request.use(this.#onRequestFulfilled, this.#onRequestRejected);
    this.#instance.interceptors.response.use(this.#onResponseFulfilled, this.#onResponseRejected);
  }

  #onRequestFulfilled = (config: InternalAxiosRequestConfig): ExtendedAxiosRequestConfig => {
    const extendedConfig = this.#setConfig(config);
    const method = extendedConfig.method?.toUpperCase();
    const reqUrl = `${extendedConfig.baseURL}${extendedConfig.url}`;
    const reqMsg = `[${method}] ${reqUrl}`;
    Log.success(`[REQ](${extendedConfig.key})`, reqMsg, extendedConfig);
    return extendedConfig;
  };

  #onRequestRejected = (error: AxiosError): Promise<never> => {
    Log.error('[REQ]', error?.response ?? error);
    return Promise.reject(error);
  };

  #onResponseFulfilled = <T = unknown>(response: AxiosResponse<T>): AxiosResponse<T> => {
    Log.success(`[RES](${(response?.config as ExtendedAxiosRequestConfig)?.key})`, response?.data);
    return response;
  };

  #onResponseRejected = async (error: AxiosError): Promise<never> => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig | undefined;
    Log.error(`[RES](${originalRequest?.key})`, error?.response ?? error);
    // 403 에러 && CSRF 요청이 아님 && 재시도가 아닌 경우 -> CSRF 토큰 재발급 후 재시도
    if (error.response?.status === 403 && originalRequest && !originalRequest.url?.includes('/csrf') && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await this.#refreshCsrfToken();
        return this.#instance(originalRequest);
      } catch (csrfError) {
        Log.error('[CSRF] 토큰 재발급 실패', csrfError);
        return Promise.reject(error);
      }
    }
    this.#responseErrorHandler(error);
    return Promise.reject(error);
  };

  #setConfig(config: InternalAxiosRequestConfig): ExtendedAxiosRequestConfig {
    // X-CSRF-TOKEN 헤더 설정
    const token = getCookie('XSRF-TOKEN');
    config.headers['X-CSRF-TOKEN'] = token;
    const extendedConfig = config as ExtendedAxiosRequestConfig;
    extendedConfig.key = createUUID().split('-')[0]; // 로그 트래킹을 위한 key.
    return extendedConfig;
  }

  async #refreshCsrfToken(): Promise<void> {
    Log.info('[CSRF] 토큰 재발급 요청');
    await axios.get('/api/auth/csrf', { params: { t: Date.now() } });
    Log.success('[CSRF] 토큰 재발급 완료');
  }

  /**
   * 에러 핸들러
   */
  #responseErrorHandler(_error: AxiosError): void {
    // TODO: 에러 핸들링 로직 구현 필요
    const msg = JSON.stringify(_error.response, null, 2);
    toast.error(msg);
  }

  get<T = unknown, R = AxiosResponse<T>, D = unknown>(url: string, config?: AxiosRequestConfig<D> | undefined): Promise<R> {
    return this.#instance.get<T, R, D>(url, config);
  }

  post<T = unknown, R = AxiosResponse<T>, D = unknown>(url: string, data?: D | undefined, config?: AxiosRequestConfig<D> | undefined): Promise<R> {
    return this.#instance.post<T, R, D>(url, data, config);
  }

  put<T = unknown, R = AxiosResponse<T>, D = unknown>(url: string, data?: D | undefined, config?: AxiosRequestConfig<D> | undefined): Promise<R> {
    return this.#instance.put<T, R, D>(url, data, config);
  }

  delete<T = unknown, R = AxiosResponse<T>, D = unknown>(url: string, config?: AxiosRequestConfig<D> | undefined): Promise<R> {
    return this.#instance.delete<T, R, D>(url, config);
  }
}
