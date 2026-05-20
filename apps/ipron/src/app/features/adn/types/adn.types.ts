/**
 * ADN(Agent DN) 관리 도메인 타입
 *
 * AS-IS: SWAT IPR20S2023
 * BE: BT-ADMIN-SERVICE-IPRON `/api/ipron/adns`
 *
 * 주의: BE 의 enum 은 string code 로 직렬화됨.
 *  - DnStatus      : '0' = UNREGISTERED, '1' = NORMAL
 *  - AdnDefaultState : '1' = READY, '2' = NOT_READY, '3' = WRAPUP
 */

export type DnStatusCode = '0' | '1';
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
