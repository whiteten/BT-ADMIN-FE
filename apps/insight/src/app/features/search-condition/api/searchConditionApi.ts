import ApiClient, { type ApiResponse } from '@/shared-util';
import type { SearchCondMeta, SearchConditionCreateDatas, SearchConditionDetail, SearchConditionListItem, SqlPreviewRequest, SqlPreviewResult } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const searchConditionApi = {
  getSearchConditions: async (params?: Record<string, unknown>): Promise<SearchConditionListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: SearchConditionListItem[] }>>('/insight-statistics-search-condition-list', { params });
    return response.data?.data?.items ?? [];
  },

  getSearchCondition: async (searchCondId: number): Promise<SearchConditionDetail> => {
    const response = await apiClient.get<ApiResponse<SearchConditionDetail>>('/insight-statistics-search-condition-detail', { params: { searchCondId } });
    return response.data?.data;
  },

  createSearchCondition: async (data: SearchConditionCreateDatas): Promise<SearchConditionDetail> => {
    const response = await apiClient.post<ApiResponse<SearchConditionDetail>>('/insight-statistics-search-condition-create', data);
    return response.data?.data;
  },

  updateSearchCondition: async (searchCondId: number, data: SearchConditionCreateDatas): Promise<SearchConditionDetail> => {
    const response = await apiClient.put<ApiResponse<SearchConditionDetail>>('/insight-statistics-search-condition-update', data, { params: { searchCondId } });
    return response.data?.data;
  },

  deleteSearchCondition: async (searchCondId: number): Promise<void> => {
    await apiClient.delete('/insight-statistics-search-condition-delete', { params: { searchCondId } });
  },

  /**
   * 장표 런타임 — 검색조건 단계 메타(stages) 로드.
   * detail 을 재사용해 optionSql 을 제외한 경량 단계 정보만 추출. depth → sortOrder 순 정렬.
   */
  getStages: async (searchCondId: number): Promise<SearchCondMeta> => {
    const detail = await searchConditionApi.getSearchCondition(searchCondId);
    const stages = (detail?.nodes ?? [])
      .map((n) => ({
        nodeCode: n.nodeCode,
        nodeLabel: n.nodeLabel,
        inputType: n.inputType,
        nodeDepth: n.nodeDepth,
        parentNodeCode: n.parentNodeCode ?? null,
        sortOrder: n.sortOrder ?? 0,
      }))
      .sort((a, b) => a.nodeDepth - b.nodeDepth || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return { searchCondId, title: detail?.title ?? '', stages };
  },

  /**
   * 장표 런타임 cascade — 한 단계(node)의 옵션을 부모 선택값 기준으로 조회.
   * nodeCode null 이면 루트 단계. parentValue 는 단일/다중 모두 배열로 전송 (IN 확장).
   */
  resolveStageOptions: async (searchCondId: number, nodeCode: string | null, parentValue?: string | string[] | null): Promise<SqlPreviewResult[]> => {
    const pv = parentValue == null ? undefined : Array.isArray(parentValue) ? parentValue : [parentValue];
    const response = await apiClient.post<Record<string, unknown>>(
      '/insight-statistics-search-condition-resolve',
      { nodeCode: nodeCode ?? null, parentValue: pv },
      { params: { searchCondId } },
    );
    const raw = (response as unknown as { data: { data: unknown } })?.data?.data;
    if (Array.isArray(raw)) return raw as SqlPreviewResult[];
    if (raw && typeof raw === 'object') {
      const arr = (raw as Record<string, unknown>).value ?? (raw as Record<string, unknown>).items;
      if (Array.isArray(arr)) return arr as SqlPreviewResult[];
    }
    return [];
  },

  /**
   * SQL 미리보기.
   * 백엔드는 ApiResponse<List<T>>를 반환 — BFF 단일 스텝 통과 후 data가 배열 직접 노출.
   */
  previewSql: async (data: SqlPreviewRequest): Promise<SqlPreviewResult[]> => {
    const response = await apiClient.post<Record<string, unknown>>('/insight-statistics-search-condition-preview', data);
    const raw = (response as unknown as { data: { data: unknown } })?.data?.data;
    if (Array.isArray(raw)) return raw as SqlPreviewResult[];
    if (raw && typeof raw === 'object') {
      const arr = (raw as Record<string, unknown>).value ?? (raw as Record<string, unknown>).items;
      if (Array.isArray(arr)) return arr as SqlPreviewResult[];
    }
    return [];
  },
};
