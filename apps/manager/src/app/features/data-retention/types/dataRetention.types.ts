/**
 * 데이터 보관주기 관리 관련 타입 정의
 */

/** 카테고리 */
export type RetentionCategory = 'DATA' | 'HISTORY' | 'LOG';

/** 제품 코드 */
export type RetentionProductCode = 'COMMON' | 'IC' | 'IR' | 'AI';

/** 보관주기 정책 목록 아이템 */
export interface RetentionPolicyListItem {
  policyId: number;
  category: RetentionCategory;
  policyName: string;
  productCode: RetentionProductCode;
  retentionMonths: number;
  executionTime: string;
  description: string;
  targetCount: number;
}

/** 보관주기 정책 목록 응답 */
export interface RetentionPolicyListResponse {
  items: RetentionPolicyListItem[];
  page: number;
  size: number;
  total: number;
}

/** 대상 테이블 아이템 */
export interface RetentionTargetItem {
  targetId: number;
  tableName: string;
  sortOrder: number;
  description: string;
}

/** 대상 테이블 조회 응답 */
export interface RetentionTargetsResponse {
  policyId: number;
  policyName: string;
  dateColumn: string;
  description: string;
  targets: RetentionTargetItem[];
}

/** 정책 일괄 수정 요청 항목 */
export interface RetentionPolicyUpdateItem {
  policyId: number;
  retentionMonths: number;
  executionTime: string;
}

/** 정책 일괄 수정 요청 바디 */
export interface RetentionPoliciesUpdateRequest {
  policies: RetentionPolicyUpdateItem[];
}

/** 삭제 실행 이력 아이템 */
export interface RetentionLogItem {
  logId: number;
  policyName: string;
  executedAt: string;
  deletedCount: number;
  status: 'SUCCESS' | 'FAIL' | 'PARTIAL_FAIL';
  errorMessage: string | null;
  executionTimeMs: number;
}

/** 삭제 실행 이력 응답 */
export interface RetentionLogListResponse {
  items: RetentionLogItem[];
  page: number;
  size: number;
  total: number;
}

/** 카테고리 한글 레이블 */
export const RETENTION_CATEGORY_LABELS: Record<RetentionCategory, string> = {
  DATA: '데이터',
  HISTORY: '이력',
  LOG: '로그',
};

/** 제품 코드 한글 레이블 */
export const RETENTION_PRODUCT_CODE_LABELS: Record<RetentionProductCode, string> = {
  COMMON: '공통',
  IC: 'IC',
  IR: 'IR',
  AI: 'AI',
};
