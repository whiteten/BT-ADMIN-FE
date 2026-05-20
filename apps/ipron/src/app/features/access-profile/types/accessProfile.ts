/**
 * 접근코드 프로파일 관리 타입 정의
 * SD-ACCESS-PROFILE.md 설계서 기반
 * Backend: AccessProfileController (BT-ADMIN-SERVICE-IPRON)
 */

// ─── Backend Response DTOs ───────────────────────────────────────────────────

/**
 * 백엔드 프로파일 응답
 * GET /api/ipron/access-profiles
 */
export interface AccessProfileResponse {
  accessCodeProfileId: number;
  accessCodeProfileName: string;
  tenantId: number;
  tenantName: string | null;
  nodeId: number;
  nodeName: string | null;
  codeCount: number | null;
  workUser: number | null;
  workTime: string | null;
}

/**
 * 백엔드 접근코드 응답
 * GET /api/ipron/access-profiles/{profileId}/codes
 */
export interface AccessCodeResponse {
  accessCodeProfileId: number;
  accessCode: string;
  accessCodeName: string;
  minDigits: number;
  maxDigits: number;
  routeId: number | null;
  routeName: string | null;
  accessCodeDesc: string | null;
  workUser: number | null;
  workTime: string | null;
}

/**
 * 트리 노드 응답
 * GET /api/ipron/access-profiles/tree
 */
export interface ProfileTreeNodeResponse {
  id: string;
  parentId: string | null;
  label: string;
  type: 'node' | 'tenant' | 'profile';
  nodeId: number | null;
  tenantId: number | null;
  profileId: number | null;
  codeCount: number | null;
}

/**
 * 테넌트 간략 정보 (복사 대상 선택용)
 * cross-service: manager-tenant-list
 */
export interface TenantSimpleResponse {
  tenantId: number;
  tenantName: string;
}

/**
 * 노드 간략 정보 (cross-service: manager-node-list)
 */
export interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

/**
 * 발신라우트 간략 정보 (노드별 필터)
 */
export interface RouteSimpleResponse {
  routeId: number;
  routeName: string;
  nodeId: number;
}

// ─── Frontend 도메인 타입 ────────────────────────────────────────────────────

/**
 * 프론트엔드용 프로파일
 */
export interface AccessProfile {
  accessCodeProfileId: number;
  accessCodeProfileName: string;
  tenantId: number;
  tenantName: string;
  nodeId: number;
  nodeName: string;
  codeCount: number;
}

/**
 * 프론트엔드용 접근코드
 */
export interface AccessCode {
  accessCodeProfileId: number;
  accessCode: string;
  accessCodeName: string;
  minDigits: number;
  maxDigits: number;
  routeId: number | null;
  routeName: string | null;
  accessCodeDesc: string | null;
}

// ─── 요청 타입 ───────────────────────────────────────────────────────────────

export interface ProfileCreateData {
  accessCodeProfileName: string;
  tenantId: number;
  nodeId: number;
}

export interface ProfileUpdateData {
  accessCodeProfileName: string;
}

export interface ProfileCopyData {
  accessCodeProfileName: string;
  targetNodeId: number;
  targetTenantId: number;
}

export interface CodeCreateData {
  accessCode: string;
  accessCodeName: string;
  minDigits: number;
  maxDigits: number;
  routeId: number;
  accessCodeDesc?: string | null;
}

export interface CodeUpdateData {
  accessCodeName: string;
  minDigits: number;
  maxDigits: number;
  routeId: number;
  accessCodeDesc?: string | null;
}
