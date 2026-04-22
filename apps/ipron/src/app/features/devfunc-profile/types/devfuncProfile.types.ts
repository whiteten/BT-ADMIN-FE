/**
 * 기능코드 프로파일 관리 타입 정의
 * Backend: DevfuncProfileController 기반
 */

// ─── Backend Response DTOs ───────────────────────────────────────────────────

/**
 * 프로파일 트리 노드 (GET /api/ipron/devfunc-profiles/tree)
 */
export interface ProfileTreeNodeResponse {
  id: string;
  parentId: string | null;
  label: string;
  type: 'tenant' | 'profile';
  tenantId: number;
  profileId: number | null;
  codeCount: number | null;
}

/**
 * 프로파일 상세 응답 (GET /api/ipron/devfunc-profiles/{id})
 */
export interface DevfuncProfileResponse {
  devfuncCodeProfileId: number;
  devfuncCodeProfileName: string;
  tenantId: number;
  tenantName: string | null;
  codeCount: number | null;
  workUser: number | null;
  workTime: string | null;
}

/**
 * 코드 응답 (GET /api/ipron/devfunc-profiles/{id}/codes)
 */
export interface DevfuncCodeResponse {
  devfuncCodeProfileId: number;
  devfuncCode: string;
  devfuncCodeName: string;
  minDigits: number;
  maxDigits: number;
  devfuncCodeDesc: string | null;
  workUser: number | null;
  workTime: string | null;
}

// ─── Frontend 도메인 타입 ────────────────────────────────────────────────────

/**
 * 트리에서 사용하는 테넌트 그룹
 */
export interface TenantProfileGroup {
  tenantId: number;
  tenantName: string;
  profiles: DevfuncProfile[];
}

/**
 * 프론트엔드용 프로파일
 */
export interface DevfuncProfile {
  devfuncCodeProfileId: number;
  devfuncCodeProfileName: string;
  tenantId: number;
  tenantName: string;
  codeCount: number;
}

/**
 * 프론트엔드용 기능코드
 */
export interface DevfuncCode {
  devfuncCodeProfileId: number;
  devfuncCode: string;
  devfuncCodeName: string;
  minDigits: number;
  maxDigits: number;
  devfuncCodeDesc: string | null;
}

// ─── 요청 타입 ───────────────────────────────────────────────────────────────

export interface ProfileCreateData {
  devfuncCodeProfileName: string;
  tenantId: number;
}

export interface ProfileUpdateData {
  devfuncCodeProfileName: string;
}

export interface ProfileCopyData {
  devfuncCodeProfileName: string;
  targetTenantId: number;
}

export interface CodeCreateData {
  devfuncCode: string;
  devfuncCodeName: string;
  minDigits: number;
  maxDigits: number;
  devfuncCodeDesc?: string | null;
}

export interface CodeUpdateData {
  devfuncCodeName: string;
  minDigits: number;
  maxDigits: number;
  devfuncCodeDesc?: string | null;
}

/**
 * 테넌트 간략 정보 (복사 대상 선택용)
 */
export interface TenantSimpleResponse {
  tenantId: number;
  tenantName: string;
}
