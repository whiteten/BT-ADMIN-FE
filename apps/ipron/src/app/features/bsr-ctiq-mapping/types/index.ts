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
