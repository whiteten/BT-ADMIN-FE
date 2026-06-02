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
}

export interface QueryResult {
  current: Record<string, unknown>[];
  compare: Record<string, unknown>[] | null;
}

export const panelApi = {
  executeQuery: async (request: QueryRequest): Promise<QueryResult> => {
    const response = await apiClient.post<ApiResponse<QueryResult>>('/insight-statistics-query-execute', request);
    return response.data?.data;
  },

  /** 그리드 패널 Excel 내보내기 — 서버 생성 xlsx blob 다운로드 (BFF flow 경유) */
  exportExcel: async (request: QueryRequest): Promise<void> => {
    const response = await apiClient.post<Blob>('/insight-statistics-export-excel', request, { responseType: 'blob' });
    const fileName = extractFileName(response.headers['content-disposition'], `report_${dayjs().format('YYYYMMDD')}.xlsx`);
    downloadBlob(response.data, fileName);
  },
};
