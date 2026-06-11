import dayjs from 'dayjs';
import ApiClient, { type ApiResponse, downloadBlob, extractFileName } from '@/shared-util';
import type { GlobalConditions } from '../../global-filter/types';
import type { ComparisonType, TimeUnit } from '../../report/types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export interface QueryRequest {
  reportId: number;
  panelId: number;
  period: { from: string; to: string; unit: TimeUnit };
  searchValues: Record<string, unknown>;
  comparison: ComparisonType | null;
  /** 글로벌 공통 검색조건 (제외요일·구간검색·시간창). 기간/단위처럼 전체 패널 적용. */
  conditions?: GlobalConditions;
  /** KPI 모드 — 이 패널의 KPI 슬롯 필드만 전체 집계(1행). 상단 KPI 요약 카드 전용. */
  kpiMode?: boolean;
}

export interface QueryResult {
  current: Record<string, unknown>[];
  compare: Record<string, unknown>[] | null;
}

/** SQL 미리보기 응답 — 실행 쿼리와 동일하게 빌드된 SQL (NamedParameter 바인딩 형태) */
export interface SqlPreviewResult {
  sql: string;
  params: Record<string, unknown>;
  resolvedView: string;
  timeUnit: string;
  compareSql: string | null;
  compareParams: Record<string, unknown> | null;
  /** SQL 외 조회 후 계산되는 필드 (보고서 계산필드 + 데이터셋 CALC) */
  calcFields: { fieldName: string; displayName: string; expression: string | null }[];
}

export const panelApi = {
  executeQuery: async (request: QueryRequest): Promise<QueryResult> => {
    const response = await apiClient.post<ApiResponse<QueryResult>>('/insight-statistics-query-execute', request);
    return response.data?.data;
  },

  /** 패널 쿼리 SQL 미리보기 — 실행 없이 빌드된 SQL 반환 (BFF flow 경유) */
  previewSql: async (request: QueryRequest): Promise<SqlPreviewResult> => {
    const response = await apiClient.post<ApiResponse<SqlPreviewResult>>('/insight-statistics-query-sql-preview', request);
    return response.data?.data;
  },

  /** 그리드 패널 Excel 내보내기 — 서버 생성 xlsx blob 다운로드 (BFF flow 경유) */
  exportExcel: async (request: QueryRequest): Promise<void> => {
    const response = await apiClient.post<Blob>('/insight-statistics-export-excel', request, { responseType: 'blob' });
    const fileName = extractFileName(response.headers['content-disposition'], `report_${dayjs().format('YYYYMMDD')}.xlsx`);
    downloadBlob(response.data, fileName);
  },
};
