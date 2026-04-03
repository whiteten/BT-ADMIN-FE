/**
 * 긴급코드 프로파일 관리 타입 정의
 * SD-EMERG-PROFILE.md 설계서 기반
 */

// ─── Backend Response DTOs ───────────────────────────────────────────────────

/**
 * 백엔드 프로파일 목록 응답
 * GET /api/ipron/emerg-profiles
 */
export interface ProfileBackendResponse {
  emergencyCodeProfileId: number;
  emergencyCodeProfileName: string;
  nodeId: number;
  nodeName: string | null;
  codeCount: number;
}

/**
 * 백엔드 프로파일 상세 응답
 * GET /api/ipron/emerg-profiles/{profileId}
 */
export interface ProfileDetailBackendResponse {
  emergencyCodeProfileId: number;
  emergencyCodeProfileName: string;
  nodeId: number;
  nodeName: string | null;
  codes: CodeBackendResponse[];
}

/**
 * 백엔드 코드 응답
 * GET /api/ipron/emerg-profiles/{profileId}/codes
 */
export interface CodeBackendResponse {
  emergencyCodeProfileId: number;
  emergencyCode: string;
  emergencyCodeName: string;
  routeId: number | null;
  routeName: string | null;
  emergencyCodeDesc: string | null;
}

/**
 * 백엔드 노드 목록 응답 (간단 버전 - manager-node-list 재사용)
 */
export interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

// ─── Frontend 변환 타입 ──────────────────────────────────────────────────────

/**
 * 프론트엔드용 프로파일 목록 아이템
 */
export interface EmergProfile {
  emergencyCodeProfileId: number;
  emergencyCodeProfileName: string;
  nodeId: number;
  nodeName: string;
  codeCount: number;
}

/**
 * 프론트엔드용 프로파일 상세
 */
export interface EmergProfileDetail {
  emergencyCodeProfileId: number;
  emergencyCodeProfileName: string;
  nodeId: number;
  nodeName: string;
  codes: EmergCode[];
}

/**
 * 프론트엔드용 긴급코드
 */
export interface EmergCode {
  emergencyCodeProfileId: number;
  emergencyCode: string;
  emergencyCodeName: string;
  routeId: number | null;
  routeName: string | null;
  emergencyCodeDesc: string | null;
}

/**
 * 노드별 프로파일 그룹
 */
export interface NodeProfileGroup {
  nodeId: number;
  nodeName: string;
  profiles: EmergProfile[];
}

// ─── 요청 타입 ───────────────────────────────────────────────────────────────

/**
 * 프로파일 등록 요청
 */
export interface ProfileCreateData {
  emergencyCodeProfileName: string;
  nodeId: number;
}

/**
 * 프로파일 수정 요청
 */
export interface ProfileUpdateData {
  emergencyCodeProfileName: string;
}

/**
 * 프로파일 복사 요청
 */
export interface ProfileCopyData {
  emergencyCodeProfileName: string;
  targetNodeId: number;
}

/**
 * 코드 등록 요청
 */
export interface CodeCreateData {
  emergencyCode: string;
  emergencyCodeName: string;
  routeId?: number | null;
  emergencyCodeDesc?: string | null;
}

/**
 * 코드 수정 요청
 */
export interface CodeUpdateData {
  emergencyCodeName: string;
  routeId?: number | null;
  emergencyCodeDesc?: string | null;
}
