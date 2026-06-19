/**
 * IVR DNIS (서비스 번호 관리) 타입 — AS-IS IPR20S6030.
 */

export interface DnisItem {
  dnisNo: string;
  nodeId: number;
  nodeName: string;
  serviceId: number;
  serviceName: string;
  serviceType: number | null;
  serviceTypeName: string;
  dnisName: string;
  tenantId: number;
  tenantName: string;
  telcoKind: number | null;
  telcoKindName: string;
  ainNo: string | null;
  dnisDesc: string | null;
  workUser: number | null;
  workUserName: string;
  workTime: string | null;
}

export interface DnisCreateRequest {
  nodeId: number;
  dnisNo: string;
  serviceId: number;
  dnisName: string;
  tenantId: number;
  telcoKind?: number | null;
  ainNo?: string | null;
  dnisDesc?: string | null;
}

export interface DnisUpdateRequest {
  dnisName?: string;
  telcoKind?: number | null;
  ainNo?: string | null;
  dnisDesc?: string | null;
}

export interface DnisBatchCopyRequest {
  sourceNodeId: number;
  targetNodeIds: number[];
}

export interface DnisBatchCopyResult {
  sourceNodeId: number;
  sourceDnisCount: number;
  nodeResults: Array<{
    targetNodeId: number;
    deletedCount: number;
    insertedCount: number;
    representativeDnisName: string;
  }>;
}

export interface DnisExcelImportResult {
  totalCount: number;
  successCount: number;
  failCount: number;
  errors: string[];
}

/** TelcoKind Enum (BE 와 동일). */
export const TELCO_KIND_OPTIONS = [
  { value: 0, label: '공통' },
  { value: 1, label: 'KT' },
  { value: 2, label: 'SKT' },
  { value: 3, label: 'LGU+' },
] as const;
