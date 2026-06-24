import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  IngestError,
  IngestHistory,
  IngestMapping,
  IngestMappingListItem,
  IngestMappingSaveDatas,
  TargetFieldDef,
} from '../types';

// 캠페인 적재 API. ApiClient가 기본 base '/api' 를 자동으로 붙이므로 serviceURL에는 '/api'를 넣지 않는다.
// 최종 요청 경로: /api + /campaign/ingestion + <path> → 프록시가 캠페인 서비스(:8903)로 전달.
const apiClient = new ApiClient({ serviceURL: '/campaign/ingestion' });

export const ingestionApi = {
  /** 표준 대상 필드 20개 카탈로그 */
  getTargetFields: async (): Promise<TargetFieldDef[]> => {
    const res = await apiClient.get<ApiResponse<TargetFieldDef[]>>('/target-fields');
    return res.data?.data ?? [];
  },

  /** 매핑 목록 */
  getMappingList: async (): Promise<IngestMappingListItem[]> => {
    const res = await apiClient.get<ApiResponse<IngestMappingListItem[]>>('/mappings');
    return res.data?.data ?? [];
  },

  /** 매핑 단건(헤더 + 컬럼) */
  getMapping: async (mappingId: number): Promise<IngestMapping | null> => {
    const res = await apiClient.get<ApiResponse<IngestMapping>>(`/mappings/${mappingId}`);
    return res.data?.data ?? null;
  },

  createMapping: async (datas: IngestMappingSaveDatas): Promise<IngestMapping | undefined> => {
    const res = await apiClient.post<ApiResponse<IngestMapping>>('/mappings', datas);
    return res.data?.data;
  },

  updateMapping: async (mappingId: number, datas: IngestMappingSaveDatas): Promise<IngestMapping | undefined> => {
    const res = await apiClient.put<ApiResponse<IngestMapping>>(`/mappings/${mappingId}`, datas);
    return res.data?.data;
  },

  deleteMapping: async (mappingId: number): Promise<void> => {
    await apiClient.delete(`/mappings/${mappingId}`);
  },

  /** 적재 실행(파일 업로드) */
  runIngestion: async ({ mappingId, file }: { mappingId: number; file: File }): Promise<IngestHistory | undefined> => {
    const form = new FormData();
    form.append('mappingId', String(mappingId));
    form.append('file', file);
    const res = await apiClient.post<ApiResponse<IngestHistory>>('/run', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data?.data;
  },

  /** 적재 이력 목록 */
  getHistoryList: async (): Promise<IngestHistory[]> => {
    const res = await apiClient.get<ApiResponse<IngestHistory[]>>('/histories');
    return res.data?.data ?? [];
  },

  /** 적재 실패 행 목록 */
  getHistoryErrors: async (historyId: number): Promise<IngestError[]> => {
    const res = await apiClient.get<ApiResponse<IngestError[]>>(`/histories/${historyId}/errors`);
    return res.data?.data ?? [];
  },
};
