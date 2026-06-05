/**
 * ADN(Agent DN) 관리 도메인 타입
 *
 * AS-IS: SWAT IPR20S2023
 * BE: BT-ADMIN-SERVICE-IPRON `/api/ipron/adns`
 *
 * 주의: DN_STATUS 코드는 ADN 전용 값 사용 (공유 DnStatus enum 과 다름).
 *  - DnStatus (ADN) : '8' = 로그인(Login), '9' = 로그아웃(Logout)
 *    출처: TB_CC_COMMONCODE CLASS_CD='DN_STATUS' ADDCOND1_VALUE='ADN' — DB 실확인 2026-06-05
 *  - AdnDefaultState : '1' = READY, '2' = NOT_READY, '3' = WRAPUP
 */

/** ADN 전용 DN_STATUS 코드. '8'=로그인, '9'=로그아웃. */
export type DnStatusCode = '8' | '9';
export type AdnDefaultStateCode = '1' | '2' | '3';

export interface AdnResponse {
  dnId: number;
  tenantId: number;
  tenantName: string | null;
  dnNo: string;

  dnStatus: DnStatusCode | null;
  loginAdn: string | null;

  md5Auth: number; // 0/1
  md5Authid: string | null;

  adnDftState: AdnDefaultStateCode | null;
  origGrpdnId: number | null;

  workUser?: number | null;
  workTime?: string | null; // ISO LocalDateTime
}

export interface AdnCreateRequest {
  tenantId: number;
  dnNo: string;
  md5Auth: number;
  md5Authid?: string;
  md5Authpwd?: string;
  adnDftState: AdnDefaultStateCode;
  origGrpdnId?: number | null;
}

export interface AdnUpdateRequest {
  md5Auth: number;
  md5Authid?: string;
  md5Authpwd?: string;
  adnDftState: AdnDefaultStateCode;
  origGrpdnId?: number | null;
}

export interface AdnCopyRequest {
  sourceDnId: number;
  startDnNo: string;
  finishDnNo: string;
}

export interface AdnDeleteRequest {
  adnIds: number[];
}

export interface AdnTenantStat {
  tenantId: number;
  tenantName: string | null;
  totalCnt: number;
  loggedInCnt: number;
  loggedOutCnt: number;
}

export interface AdnExcelImportResult {
  total: number;
  success: number;
  failures: string[];
}
