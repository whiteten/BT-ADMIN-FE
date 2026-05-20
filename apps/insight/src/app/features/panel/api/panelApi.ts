import ApiClient, { type DetailResponse, extractDetail } from '@/shared-util';
import type { ComparisonType, TimeUnit } from '../../report/types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export interface QueryRequest {
  reportId: number;
  panelId: number;
  period: { from: string; to: string; unit: TimeUnit };
  searchValues: Record<string, unknown>;
  comparison: ComparisonType | null;
}

export interface QueryResult {
  current: Record<string, unknown>[];
  compare: Record<string, unknown>[] | null;
}

export const panelApi = {
  executeQuery: async (request: QueryRequest): Promise<QueryResult> => {
    const response = await apiClient.post<DetailResponse<QueryResult>>('/insight-statistics-query-execute', request);
    return extractDetail(response);
  },
};
