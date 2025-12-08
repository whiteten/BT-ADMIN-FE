import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import qs from 'qs';
import { Log } from './log';
import { createUUID } from './util';

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  key?: string;
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
      withCredentials: false,
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

  #onResponseRejected = (error: AxiosError): Promise<never> => {
    Log.error(`[RES](${(error?.config as ExtendedAxiosRequestConfig)?.key})`, error?.response ?? error);
    this.#responseErrorHandler(error);
    return Promise.reject(error);
  };

  #setConfig(config: InternalAxiosRequestConfig): ExtendedAxiosRequestConfig {
    const extendedConfig = config as ExtendedAxiosRequestConfig;
    extendedConfig.key = createUUID().split('-')[0]; // 로그 트래킹을 위한 key.
    return extendedConfig;
  }

  /**
   * 에러 핸들러
   */
  #responseErrorHandler(_error: AxiosError): void {
    // TODO: 에러 핸들링 로직 구현 필요
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
