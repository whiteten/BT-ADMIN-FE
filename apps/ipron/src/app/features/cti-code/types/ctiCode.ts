/**
 * CTI 코드 관리 타입 (BE DTO 매칭).
 *
 * BE: BT-ADMIN-SERVICE-IPRON/.../codemgmt/{reasoncode, mediatype, category}
 * - REASONCODE: TB_IC_REASONCODE 복합 PK (companyId, tenantId, codeType, reasonCode)
 *   - codeType 30 = 휴식 / 60 = ACW
 * - MEDIA_TYPE: TB_CC_COMMONCODE 한정 (CLASS_CD = IC_/IR_/OWMS_MEDIA_TYPE)
 * - Category: 5 카테고리 메타 (좌측 리스트용)
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
//  Category
// ──────────────────────────────────────────────────────────

export type CategoryScope = 'TENANT' | 'SYSTEM';
export type CategoryDomain = 'REASON_CODE' | 'MEDIA_TYPE';

export interface CtiCodeCategory {
  categoryId: string; // 'reason-rest' | 'reason-acw' | 'media-ic' | 'media-ir' | 'media-owms'
  label: string;
  scope: CategoryScope;
  domain: CategoryDomain;
  classCd: string | null;
  codeType: number | null;
  itemCount: number;
  locked: boolean;
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

// ──────────────────────────────────────────────────────────
//  MEDIA_TYPE
// ──────────────────────────────────────────────────────────

export const MEDIA_TYPE_CLASSES = ['IC_MEDIA_TYPE', 'IR_MEDIA_TYPE', 'OWMS_MEDIA_TYPE'] as const;
export type MediaTypeClassCd = (typeof MEDIA_TYPE_CLASSES)[number];

export interface MediaTypeResponse {
  classCd: string;
  className?: string | null;
  codeCd: string;
  codeName?: string | null;
  relationJob?: string | null;
  systemKind?: string | null;
  addcond1Name?: string | null;
  addcond1Value?: string | null;
  addcond2Name?: string | null;
  addcond2Value?: string | null;
  addcond3Name?: string | null;
  addcond3Value?: string | null;
  editYn?: number | null;
  hideYn?: number | null;
  sortSeq?: number | null;
  bigo?: string | null;
  workUser?: number | null;
  workTime?: string | null;
  locked: boolean; // EDIT_YN=0
}

export interface MediaTypeUpsertRequest {
  classCd: string;
  codeCd: string;
  className?: string;
  codeName?: string;
  relationJob?: string;
  systemKind?: string;
  addcond1Name?: string;
  addcond1Value?: string;
  addcond2Name?: string;
  addcond2Value?: string;
  addcond3Name?: string;
  addcond3Value?: string;
  editYn?: number;
  hideYn?: number;
  sortSeq?: number;
  bigo?: string;
}

export interface MediaTypeListParams {
  classCd?: string;
}
