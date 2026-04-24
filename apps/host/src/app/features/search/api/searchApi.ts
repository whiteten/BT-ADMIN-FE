import ApiClient from '@/shared-util';
import type { SearchData, SearchResponse } from '../types/search';

const bffClient = new ApiClient();

export const searchApi = {
  search: async (q: string, limit?: number): Promise<SearchData> => {
    const response = await bffClient.get<SearchResponse>('/search', { params: { q, limit } });
    return response.data.data;
  },
};
