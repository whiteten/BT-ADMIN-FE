/**
 * OAuth2 클라이언트 관리 타입 정의
 */

/**
 * OAuth2 클라이언트 백엔드 응답 타입
 */
export interface ClientBackendResponse {
  clientId: number;
  clientKey: string;
  clientName: string;
  description?: string;
  tenantId?: string;
  /** 권한(Scopes) - authKey 문자열 배열 */
  scopes: string[];
  /** 역할 목록 */
  roles?: string[];
  /** Grant Types - 백엔드에서 문자열로 옴 */
  grantTypes: string;
  /** 활성 여부 - "Y" 또는 "N" */
  isActive: string;
  /** 클라이언트 시크릿 (생성/재생성 시에만 반환) */
  clientSecret?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * OAuth2 클라이언트 프론트엔드 타입 (변환된 형태)
 */
export interface Client {
  clientId: number;
  clientKey: string;
  clientName: string;
  description?: string;
  tenantId?: string;
  /** 권한(Scopes) - authKey 문자열 배열 */
  scopes: string[];
  /** 역할 목록 */
  roles?: string[];
  /** Grant Types - 배열로 변환 */
  grantTypes: string[];
  /** 활성 여부 - boolean으로 변환 */
  isActive: boolean;
  /** 클라이언트 시크릿 (생성/재생성 시에만 반환) */
  clientSecret?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * 클라이언트 생성 요청 DTO (백엔드 형식)
 */
export interface ClientCreateRequest {
  clientKey: string;
  clientName: string;
  description?: string;
  roles?: string[];
  scopes?: string[];
  isActive?: string; // "Y" 또는 "N"
}

/**
 * 클라이언트 수정 요청 DTO (백엔드 형식)
 */
export interface ClientUpdateRequest {
  clientKey: string; // 필수!
  clientName: string;
  description?: string;
  roles?: string[];
  scopes?: string[];
  isActive?: string; // "Y" 또는 "N"
}

/**
 * 백엔드 응답을 프론트엔드 타입으로 변환
 */
export function transformClientResponse(backendClient: ClientBackendResponse): Client {
  return {
    ...backendClient,
    grantTypes: backendClient.grantTypes ? backendClient.grantTypes.split(',').map((s) => s.trim()) : [],
    isActive: backendClient.isActive === 'Y',
  };
}

/**
 * 프론트엔드 폼 데이터를 백엔드 요청 형식으로 변환
 */
export function transformToBackendFormat(isActive: boolean): string {
  return isActive ? 'Y' : 'N';
}

/**
 * Grant Type 옵션
 */
export const GRANT_TYPE_OPTIONS = [
  { label: 'Authorization Code', value: 'authorization_code' },
  { label: 'Client Credentials', value: 'client_credentials' },
  { label: 'Refresh Token', value: 'refresh_token' },
  { label: 'Password', value: 'password' },
];
