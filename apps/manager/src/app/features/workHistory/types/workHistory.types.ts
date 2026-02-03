/**
 * 작업이력 관련 타입 정의
 */

/** 작업이력 목록 아이템 */
export interface WorkHistoryListItem {
  workId: string;
  traceId: string;
  tenantId: string;
  httpMethod: string;
  httpStatus: number;
  requestUri: string;
  requestIp: string;
  durationMs: number;
  startedAt: string;
  userId: number | null;
  userName: string;
  action: string;
  status: 'SUCCESS' | 'FAIL' | 'PARTIAL_FAIL';
  hasIdsLog: boolean;
}

/** 작업이력 마스터 상세 */
export interface WorkHistoryMaster {
  workId: string;
  traceId: string;
  tenantId: string;
  httpMethod: string;
  httpStatus: number;
  requestUri: string;
  requestIp: string;
  durationMs: number;
  startedAt: string;
  completedAt: string;
  userAgent: string;
  deviceType: string;
  userId: number | null;
  userName: string;
  clientType: string | null;
  mfeId: string | null;
  menuCode: string | null;
  action: string;
  description: string | null;
  status: 'SUCCESS' | 'FAIL' | 'PARTIAL_FAIL';
  errorCode: string | null;
  errorMessage: string | null;
}

/** API 호출 상세 */
export interface ApiCallDetail {
  detailId: number;
  seq: number;
  serviceName: string;
  apiPath: string;
  httpMethod: string;
  httpStatus: number;
  status: string;
  elapsedMs: number;
  errorCode: string | null;
  errorMessage: string | null;
}

/** IDS 동기화 로그 */
export interface IdsSyncLog {
  id: number;
  programId: string;
  actionType: string;
  targetTable: string;
  success: boolean;
  errorMessage: string | null;
  durationMs: number;
  createdAt: string;
}

/** 데이터 변경 이력 */
export interface DataChangeLog {
  id: number;
  actionType: string;
  tableName: string;
  rowKey: string;
  beforeData: string | null;
  afterData: string | null;
  createdBy: string;
  createdAt: string;
}

/** 작업이력 상세 응답 */
export interface WorkHistoryDetail {
  master: WorkHistoryMaster;
  apiCalls: ApiCallDetail[];
  idsLogs: IdsSyncLog[];
  dataChanges: DataChangeLog[];
}

/** 작업이력 목록 조회 파라미터 (기간 + 테넌트 서버에서 필터링) */
export interface WorkHistoryListParams {
  fromDate?: string; // yyyy-MM-dd
  fromTime?: string; // HH:mm
  toDate?: string; // yyyy-MM-dd
  toTime?: string; // HH:mm
}

/** 페이징 응답 타입 */
export interface PagedResponse<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}
