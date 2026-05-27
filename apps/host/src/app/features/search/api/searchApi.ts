import ApiClient, { type ApiResponse } from '@/shared-util';
import type { SearchData } from '../types/search';

const bffClient = new ApiClient();

export const searchApi = {
  search: async (q: string, limit?: number): Promise<SearchData> => {
    const response = await bffClient.get<ApiResponse<SearchData>>('/search', { params: { q, limit } });
    return response.data?.data;
  },
};
