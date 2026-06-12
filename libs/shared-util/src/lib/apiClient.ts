import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import qs from 'qs';
import { LOG } from './log';
import { createShortId, getCookie } from './util';

const Log = new LOG('Api');

/** API 에러 이벤트명 */
export const API_ERROR_EVENT = 'api-error' as const;

/** API 에러 이벤트 타입 */
export type ApiErrorEvent = CustomEvent<AxiosError>;

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  key?: string;
  _retry?: boolean;
  silent?: boolean;
}

export interface ApiRequestConfig extends AxiosRequestConfig {
  silent?: boolean;
}

export interface ApiClientOptions {
  serviceURL?: string;
  timeout?: number;
}

export default class ApiClient {
  #instance: AxiosInstance;

  constructor(options: ApiClientOptions = {}) {
    const { serviceURL = '', timeout = 1000 * 60 * 3 } = options;
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
    // 요청 취소(AbortController/axios cancel)는 정상 흐름 — ERROR 로깅 제외
    if (!axios.isCancel(error) && error.code !== 'ERR_CANCELED') {
      Log.error(`[RES](${originalRequest?.key})`, error?.response ?? error);
    }
    // 403 에러 && CSRF 요청이 아님 && 재시도가 아닌 경우 -> CSRF 토큰 재발급 후 재시도
    if (error.response?.status === 403 && originalRequest && !originalRequest.url?.includes('/csrf') && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await this.#refreshCsrfToken();
        // 로그인 API는 CSRF 토큰 재발급만 하고 재시도하지 않음 (중복 로그인 이력 방지)
        if (originalRequest.url?.includes('/login')) {
          return Promise.reject(error);
        }
        return this.#instance(originalRequest);
      } catch (csrfError) {
        Log.error('[CSRF] 토큰 재발급 실패', csrfError);
        return Promise.reject(error);
      }
    }
    if (!originalRequest?.silent) {
      this.#responseErrorHandler(error);
    }
    return Promise.reject(error);
  };

  #setConfig(config: InternalAxiosRequestConfig): ExtendedAxiosRequestConfig {
    // X-CSRF-TOKEN 헤더 설정.
    // 쿠키가 없을 때(아직 미발급/만료) null 을 그대로 넣으면 잘못된 헤더로 403 이 발생하므로,
    // 토큰이 존재할 때만 헤더를 설정한다. 누락 시에는 응답 인터셉터의 403 → 토큰 재발급 → 재시도
    // 복구 로직이 동작한다. (axios 는 withCredentials 시 X-XSRF-TOKEN 도 자동 주입한다.)
    const token = getCookie('XSRF-TOKEN');
    if (token) {
      config.headers['X-CSRF-TOKEN'] = token;
    }
    const extendedConfig = config as ExtendedAxiosRequestConfig;
    extendedConfig.key = createShortId(); // 로그 트래킹을 위한 key.
    return extendedConfig;
  }

  async #refreshCsrfToken(): Promise<void> {
    Log.info('[CSRF] 토큰 재발급 요청');
    await axios.get('/api/auth/csrf', { params: { t: Date.now() } });
    Log.success('[CSRF] 토큰 재발급 완료');
  }

  /**
   * 에러 핸들러.
   * 응답 본문에 {@code skipGlobalHandler: true} 플래그가 있으면 전역 핸들러를
   * 우회하여, 호출한 컴포넌트의 onError가 직접 처리할 수 있도록 한다.
   */
  #responseErrorHandler(error: AxiosError): void {
    // 요청 config 의 skipGlobalHandler 플래그 (blob 응답 등 data 파싱 불가 시)
    const config = error.config as Record<string, unknown> | undefined;
    if (config?.['skipGlobalHandler'] === true) return;
    // 응답 본문의 skipGlobalHandler 플래그
    const data = error.response?.data as { skipGlobalHandler?: boolean } | undefined;
    if (data?.skipGlobalHandler === true) return;
    window.dispatchEvent(new CustomEvent(API_ERROR_EVENT, { detail: error }));
  }

  get<T = unknown, R = AxiosResponse<T>, D = unknown>(url: string, config?: ApiRequestConfig): Promise<R> {
    return this.#instance.get<T, R, D>(url, config);
  }

  post<T = unknown, R = AxiosResponse<T>, D = unknown>(url: string, data?: D | undefined, config?: ApiRequestConfig): Promise<R> {
    return this.#instance.post<T, R, D>(url, data, config);
  }

  put<T = unknown, R = AxiosResponse<T>, D = unknown>(url: string, data?: D | undefined, config?: ApiRequestConfig): Promise<R> {
    return this.#instance.put<T, R, D>(url, data, config);
  }

  delete<T = unknown, R = AxiosResponse<T>, D = unknown>(url: string, config?: ApiRequestConfig): Promise<R> {
    return this.#instance.delete<T, R, D>(url, config);
  }

  patch<T = unknown, R = AxiosResponse<T>, D = unknown>(url: string, data?: D | undefined, config?: ApiRequestConfig): Promise<R> {
    return this.#instance.patch<T, R, D>(url, data, config);
  }
}
