/**
 * BSR 그룹별 CTI큐 배정 타입 (BE DTO 매칭).
 *
 * BE: BT-ADMIN-SERVICE-IPRON `/api/ipron/bsr-groups/{bsrGroupId}/ctiq-mappings`
 */

export interface BsrCtiqMappingResponse {
  ctiqId: number;
  gdnId: number | null;
  ctiqName: string | null;
  bsrGroupId: number | null;
  bsrGroupName: string | null;
  tenantId: number | null;
  tenantName: string | null;
  gdnNo: string | null;
  gdnName: string | null;
  treeName: string | null;
  bsrWeight: number | null;
  bsrYn: number | null;
  bsrDistributeYn: number | null;
}

export interface BsrCtiqMappingUpdateItem {
  ctiqId: number;
  bsrWeight?: number;
  bsrYn?: number;
  bsrDistributeYn?: number;
}

export interface BsrCtiqMappingUpdateRequest {
  items: BsrCtiqMappingUpdateItem[];
}

export interface BsrCtiqAssignRequest {
  targetBsrGroupId: number;
  ctiqIds: number[];
}

export interface BsrGroupComboItem {
  value: string;
  name: string;
}

// ──────────────────────────────────────────────────────────
//  v2 신설: CTI큐 배정 검색 (PLAN §2-2)
// ──────────────────────────────────────────────────────────

export interface BsrCtiqSearchParams {
  tenantId: number;
  keyword?: string;
  treeIds?: number[];
  scope?: 'unassigned' | 'all'; // 기본 unassigned
  limit?: number; // 기본·상한 50
}

/** BE BsrCtiqSearchResponse { total, items } 래핑 */
export interface BsrCtiqSearchResult {
  total: number;
  items: BsrCtiqSearchItem[];
}

export interface BsrCtiqSearchItem {
  ctiqId: number;
  ctiqName: string | null;
  gdnNo: string | null;
  gdnName: string | null;
  treeName: string | null;
  bsrGroupId: number | null;
  bsrGroupName: string | null;
}

// ──────────────────────────────────────────────────────────
//  v2 신설: CTI큐 배정 해제 (PLAN §2-2)
// ──────────────────────────────────────────────────────────

export interface BsrCtiqUnassignRequest {
  ctiqIds: number[];
}
