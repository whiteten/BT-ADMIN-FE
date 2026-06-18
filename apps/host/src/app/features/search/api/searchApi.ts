import ApiClient, { type ApiResponse } from '@/shared-util';
import type { SearchData } from '../types/search';

const bffClient = new ApiClient();

export const searchApi = {
  /** 매뉴얼 doc 검색 — 메뉴 검색은 FE가 navigation 기반으로 처리하므로 서버는 docs만 반환 */
  searchDocs: async (q: string, limit?: number): Promise<SearchData> => {
    const response = await bffClient.get<ApiResponse<SearchData>>('/search', { params: { q, limit } });
    return response.data?.data;
  },
};
