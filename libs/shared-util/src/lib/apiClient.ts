import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import qs from 'qs';
import { getBasePath } from './basePath';
import { LOG } from './log';
import { createShortId, getCookie } from './util';

const Log = new LOG('Api');

/**
 * 운영자 모드 스코프 헤더 주입 (sessionStorage 의 operator-scope-store 를 직접 파싱 — 순환의존 회피).
 *
 * view-all(전체) 판정은 이제 <b>서버가 토큰 operatorMode 클레임으로</b> 한다. 따라서 FE 는
 * X-View-All-Tenants 를 보내지 않는다(operatorMode 자체로는 아무 헤더도 안 붙임). 대행(act-as)
 * 대상만 FE 헤더로 남는다:
 *   - actAsTenantId 있음 → X-Act-As-Tenant:<id> (BFF 가 isSystemAdmin 검증 후 X-Tenant-Id override)
 *
 * ⚠ actAsTenantFromBody(=true) 예외 — "전체(view-all)" 상태에서의 등록 버그 대응:
 *   운영자 전체 모드에서는 actAsTenantId 가 null 이라 X-Tenant-Id override 가 없어, 백엔드 active 가
 *   로그인 테넌트로 폴백해 TenantGuard 가 403 을 낸다(TENANT_OWNED 엔티티 한정).
 *   → create mutation 이 actAsTenantFromBody:true 를 지정하면, 전체 모드에서도 요청 body 의
 *     top-level tenantId 를 X-Act-As-Tenant 로 승격한다("폼에서 고른 테넌트 = 그 요청의 작업 대상").
 *   보안: BFF 가 X-Act-As-Tenant 를 isSystemAdmin 재검증 후에만 수용하므로 FE 승격은 안전.
 */
function applyOperatorScopeHeaders(config: InternalAxiosRequestConfig): void {
  try {
    const raw = sessionStorage.getItem('operator-scope-store');
    if (!raw) return;
    const state = (JSON.parse(raw) as { state?: { operatorMode?: boolean; actAsTenantId?: string | null } }).state;
    if (!state?.operatorMode) return;
    if (state.actAsTenantId) {
      config.headers['X-Act-As-Tenant'] = state.actAsTenantId;
      return;
    }
    // 전체(view-all) 상태 — view-all 은 서버(토큰)가 판단하므로 FE 는 헤더를 안 붙인다.
    // 단, 등록 요청이 body 의 tenantId 를 작업 대상으로 선언하면(actAsTenantFromBody) 그 값으로 승격.
    const bodyTenantId = (config as ExtendedAxiosRequestConfig).actAsTenantFromBody ? readBodyTenantId(config.data) : null;
    if (bodyTenantId != null) {
      config.headers['X-Act-As-Tenant'] = String(bodyTenantId);
    }
  } catch {
    // sessionStorage 접근 불가/파싱 실패 시 무시 (일반 콘솔로 동작)
  }
}

/** 요청 body 에서 top-level tenantId(숫자/문자) 를 안전하게 추출. 없거나 형태가 다르면 null. */
function readBodyTenantId(data: unknown): number | string | null {
  if (data == null || typeof data !== 'object') return null;
  const tid = (data as { tenantId?: unknown }).tenantId;
  if (typeof tid === 'number' || (typeof tid === 'string' && tid.trim() !== '')) return tid;
  return null;
}

/** API 에러 이벤트명 */
export const API_ERROR_EVENT = 'api-error' as const;

/** API 에러 이벤트 타입 */
export type ApiErrorEvent = CustomEvent<AxiosError>;

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  key?: string;
  _retry?: boolean;
  silent?: boolean;
  redirectOnForbidden?: boolean;
  actAsTenantFromBody?: boolean;
}

export interface ApiRequestConfig extends AxiosRequestConfig {
  silent?: boolean;
  /**
   * 403 권한없음(body code='FORBIDDEN') 응답 시 forbidden 페이지로 이동할지 여부.
   * 미지정 시 GET은 이동(페이지 조회 거부로 간주), 그 외 메서드는 토스트로 안내.
   * POST 등으로 body에 조건을 실어 "조회"하는 경우 true로 지정하면 GET과 동일하게 이동시킨다.
   */
  redirectOnForbidden?: boolean;
  /**
   * 운영자 "전체(view-all)" 모드에서, 요청 body 의 top-level tenantId 를 작업 대상 테넌트로 승격한다.
   * TENANT_OWNED 엔티티의 등록 mutation 이 지정한다("폼에서 고른 테넌트 = 그 요청의 작업 대상").
   * 지정하지 않으면 전체 모드는 대상 테넌트 override 없이 나가, 백엔드 active 가 로그인 테넌트로
   * 폴백해 등록이 403(TenantGuard) 이 된다. 상세: applyOperatorScopeHeaders 주석 참조.
   */
  actAsTenantFromBody?: boolean;
}

export interface ApiClientOptions {
  serviceURL?: string;
  timeout?: number;
}

export default class ApiClient {
  #instance: AxiosInstance;

  constructor(options: ApiClientOptions = {}) {
    const { serviceURL = '', timeout = 1000 * 60 * 3 } = options;
    const baseURL = `${getBasePath()}/api${serviceURL}`;
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
    // 요청 취소(AbortController/axios cancel)는 정상 흐름 — 조용히 reject.
    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }
    Log.error(`[RES](${originalRequest?.key})`, error?.response ?? error);
    // 권한 없음(@PreAuthorize 거부) 403은 CSRF 토큰 만료가 아니다 — BE가 body의 code를 'FORBIDDEN'으로 내려준다.
    // 이 경우 CSRF 재발급 루틴을 건너뛰고(헛도는 재발급+재시도 방지) 곧장 에러 핸들러로 보낸다.
    const isForbidden = (error.response?.data as { code?: string } | undefined)?.code === 'FORBIDDEN';
    // 403 에러 && 권한없음 아님 && CSRF 요청이 아님 && 재시도가 아닌 경우 -> CSRF 토큰 재발급 후 재시도
    if (error.response?.status === 403 && !isForbidden && originalRequest && !originalRequest.url?.includes('/csrf') && !originalRequest._retry) {
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
    // 운영자 모드(통합운영) 헤더 주입.
    //  - view-all(전체)은 서버(토큰 operatorMode)가 판단 → FE 는 헤더를 안 붙인다.
    //  - 특정 테넌트 대행: X-Act-As-Tenant:<id> → BFF 가 isSystemAdmin 검증 후 X-Tenant-Id override
    // shared-store 를 import 하면 순환의존이 생기므로, persist(sessionStorage) 값을 직접 읽는다.
    // (보안 게이트는 BFF 에 있으므로 비-관리자가 헤더를 넣어도 무시됨)
    applyOperatorScopeHeaders(config);
    const extendedConfig = config as ExtendedAxiosRequestConfig;
    extendedConfig.key = createShortId(); // 로그 트래킹을 위한 key.
    return extendedConfig;
  }

  async #refreshCsrfToken(): Promise<void> {
    Log.info('[CSRF] 토큰 재발급 요청');
    await axios.get(`${getBasePath()}/api/auth/csrf`, { params: { t: Date.now() } });
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
