import ApiClient, { type ApiResponse } from '@/shared-util';
import type { InputType, SearchConditionCreateDatas, SearchConditionDetail, SearchConditionListItem, SqlPreviewRequest, SqlPreviewResult } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export interface SearchCondOptions {
  options: { value: string; label: string }[];
  inputType: InputType;
  title: string;
}

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

  /** 검색조건 옵션 목록 + inputType + title 로드 (GlobalFilter 런타임). */
  getOptions: async (searchCondId: number): Promise<SearchCondOptions> => {
    const detail = await searchConditionApi.getSearchCondition(searchCondId);
    const fallback: SearchCondOptions = { options: [], inputType: 'SELECT', title: detail?.title ?? '' };
    if (!detail?.nodes?.length) return fallback;
    const node = detail.nodes[0];
    if (!node.optionSql) return { ...fallback, inputType: node.inputType };
    const results = await searchConditionApi.previewSql({
      optionSql: node.optionSql,
      valueColumn: node.valueColumn,
      labelColumn: node.labelColumn,
      parentColumn: node.parentColumn ?? undefined,
      levelColumn: node.levelColumn ?? undefined,
    });
    return {
      options: results.map((r) => ({ value: String(r.value ?? ''), label: String(r.label ?? r.value ?? '') })),
      inputType: node.inputType,
      title: detail.title,
    };
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
