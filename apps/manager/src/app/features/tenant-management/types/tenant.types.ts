/**
 * 테넌트 관리 타입 정의
 * SD-TENANT-MANAGEMENT.md 설계서 기반
 */

// ─── 상수 ─────────────────────────────────────────────────────────────────────

/** 계약상태 코드 (AS-IS 공통코드 TB_CC_COMMONCODE CLASS_CD=CONTRACT_STATUS) */
export type ContractStatus = '1' | '2' | '3' | '9';

/** 계약상태 라벨 */
export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  '1': '요청',
  '2': '계약',
  '3': '정지',
  '9': '해지',
};

/** 계약상태 색상 */
export const CONTRACT_STATUS_COLORS: Record<string, string> = {
  '1': '#e67700',
  '2': '#2563eb',
  '3': '#f59f00',
  '9': '#ff4d4f',
};

/** 통계 집계 옵션 */
export const STAT_TYPE_LABELS: Record<number, string> = {
  0: '인입기준 적재',
  1: '실시간 적재',
};

// ─── Backend Response DTOs ───────────────────────────────────────────────────

/**
 * 백엔드 테넌트 목록 응답 아이템
 * GET /api/manager/tenants
 */
export interface TenantBackendResponse {
  tenantId: number;
  tenantName: string;
  tenantAlias: string;
  companyId: number | null;
  companyName: string | null;
  contractStartDate: string | null;
  contractFinshDate: string | null;
  contractMonth: number | null;
  expireDate: string | null;
  contractStatus: string | null;
  contractStatusName: string | null;
  managerName: string | null;
  managerTelNo: string | null;
  didLicAmount: number | null;
  dodLicAmount: number | null;
  maxCoAmount: number | null;
  maxExtAmount: number | null;
  maxCtiAmount: number | null;
  maxEmsAmount: number | null;
  maxArsAmount: number | null;
  maxVlcAmount: number | null;
  activeYn: number;
}

/**
 * 백엔드 테넌트 상세 응답
 * GET /api/manager/tenants/{id}
 */
export interface TenantDetailBackendResponse extends TenantBackendResponse {
  tntAddr1: string | null;
  tntAddr2: string | null;
  tntTelNo: string | null;
  tntFaxNo: string | null;
  managerMobileNo: string | null;
  managerEmail: string | null;
  dashInitHour: string | null;
  dashInitMinute: string | null;
  accQwaittimeUseYn: number | null;
  ivrQwaittimeUseYn: number | null;
  custTalkMax: number | null;
  statType: number | null;
}

/**
 * 백엔드 통화그룹 응답
 */
export interface CallGroupBackendResponse {
  tenantId: number;
  tenantName: string;
  gubun: number; // 0=발신, 1=착신
  useYn: number;
}

// ─── Frontend 변환 타입 ──────────────────────────────────────────────────────

/**
 * 프론트엔드용 테넌트 목록 아이템 (카드 표시용)
 */
export interface TenantListItem {
  tenantId: number;
  tenantName: string;
  tenantAlias: string;
  companyName: string | null;
  contractStatus: string | null;
  contractStatusName: string | null;
  contractStartDate: string | null;
  contractFinshDate: string | null;
  contractMonth: number | null;
  managerName: string | null;
  maxCoAmount: number | null;
  didLicAmount: number | null;
  maxCtiAmount: number | null;
  maxExtAmount: number | null;
  activeYn: number;
}

/**
 * 프론트엔드용 테넌트 상세 정보
 */
export interface TenantDetail {
  tenantId: number;
  tenantName: string;
  tenantAlias: string;
  companyId: number | null;
  companyName: string | null;
  contractStartDate: string | null;
  contractFinshDate: string | null;
  contractMonth: number | null;
  expireDate: string | null;
  contractStatus: string | null;
  contractStatusName: string | null;
  tntAddr1: string | null;
  tntAddr2: string | null;
  tntTelNo: string | null;
  tntFaxNo: string | null;
  managerName: string | null;
  managerTelNo: string | null;
  managerMobileNo: string | null;
  managerEmail: string | null;
  didLicAmount: number | null;
  dodLicAmount: number | null;
  maxCoAmount: number | null;
  maxExtAmount: number | null;
  maxCtiAmount: number | null;
  maxEmsAmount: number | null;
  maxArsAmount: number | null;
  maxVlcAmount: number | null;
  dashInitHour: string | null;
  dashInitMinute: string | null;
  activeYn: number;
  accQwaittimeUseYn: number | null;
  ivrQwaittimeUseYn: number | null;
  custTalkMax: number | null;
  statType: number | null;
}

/**
 * 테넌트 등록 요청 데이터
 */
export interface TenantCreateData {
  tenantName: string;
  tenantAlias: string;
  companyId?: number | null;
  contractStartDate?: string | null;
  contractFinshDate?: string | null;
  contractMonth?: number | null;
  expireDate?: string | null;
  contractStatus?: string | null;
  tntAddr1?: string | null;
  tntAddr2?: string | null;
  tntTelNo?: string | null;
  tntFaxNo?: string | null;
  managerName?: string | null;
  managerTelNo?: string | null;
  managerMobileNo?: string | null;
  managerEmail?: string | null;
  didLicAmount?: number | null;
  dodLicAmount?: number | null;
  maxCoAmount?: number | null;
  maxExtAmount?: number | null;
  maxCtiAmount?: number | null;
  maxEmsAmount?: number | null;
  maxArsAmount?: number | null;
  maxVlcAmount?: number | null;
  dashInitHour?: string | null;
  dashInitMinute?: string | null;
  accQwaittimeUseYn?: number | null;
  ivrQwaittimeUseYn?: number | null;
  custTalkMax: number;
  statType: number;
}

/**
 * 테넌트 수정 요청 데이터
 */
export interface TenantUpdateData extends TenantCreateData {
  activeYn?: number | null;
}

/**
 * 통화그룹 아이템
 */
export interface CallGroupItem {
  tenantId: number;
  tenantName: string;
  gubun: number; // 0=발신, 1=착신
  useYn: number;
}

/**
 * 통화그룹 등록 요청 데이터
 */
export interface CallGroupCreateData {
  targetTenantId: number;
  gubun: number;
  useYn: number;
}

/**
 * 통화그룹 수정 요청 데이터
 */
export interface CallGroupUpdateData {
  useYn: number;
}

/** 통화그룹 구분 라벨 */
export const CALL_GROUP_GUBUN_LABELS: Record<number, string> = {
  0: '발신',
  1: '착신',
};
