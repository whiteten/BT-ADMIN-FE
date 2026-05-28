/**
 * 휴식/ACW 사유 코드 타입 (BE DTO 매칭).
 *
 * BE: BT-ADMIN-SERVICE-IPRON/.../codemgmt/reasoncode
 * - REASONCODE: TB_IC_REASONCODE 복합 PK (companyId, tenantId, codeType, reasonCode)
 *   - codeType 30 = 휴식 / 60 = ACW
 *
 * SWAT 정합: IPR20S4040 (ACW/휴식사유코드 — 탭 2개).
 */

// ──────────────────────────────────────────────────────────
//  Tenant Stats (상단 카드 슬라이더 — ADN 패턴)
// ──────────────────────────────────────────────────────────

export interface CtiCodeTenantStat {
  tenantId: number;
  tenantName: string;
  restCnt: number;
  acwCnt: number;
  totalCnt: number;
}

// ──────────────────────────────────────────────────────────
//  REASON_CODE
// ──────────────────────────────────────────────────────────

export const REASON_CODE_TYPE_REST = 30;
export const REASON_CODE_TYPE_ACW = 60;

export interface ReasonCodeResponse {
  companyId: number;
  tenantId: number;
  tenantName?: string | null;
  codeType: number; // 30 | 60
  codeTypeName: string; // "휴식 사유" | "ACW 사유"
  reasonCode: number;
  reasonName: string;
  reasonDesc?: string | null;
  workUser?: number | null;
  workTime?: string | null;
  usageCount?: number | null;
}

export interface ReasonCodeCreateRequest {
  tenantId: number;
  codeType: number;
  reasonCode?: number | null; // null = 서버 자동 채번
  reasonName: string;
  reasonDesc?: string;
}

export interface ReasonCodeUpdateRequest {
  reasonName: string;
  reasonDesc?: string;
}

export interface ReasonCodeCopyRequest {
  sourceTenantId: number;
  targetTenantIds: number[];
  codeTypes: number[];
  overwrite: boolean;
  excludeReserved: boolean;
}

export interface ReasonCodeCopyResult {
  added: number;
  updated: number;
  skipped: number;
}

export interface ReasonCodeListParams {
  tenantId?: number;
  codeType?: number;
}
