/**
 * 통합 콜트래킹 — 검색 조건 즐겨찾기 API.
 *
 * BFF Flow:
 *  - ipron-tracking-favorites-list
 *  - ipron-tracking-favorites-create
 *  - ipron-tracking-favorites-update
 *  - ipron-tracking-favorites-delete
 *
 * BE: /api/ipron/tracking/favorites
 */
import ApiClient, { type ApiResponse } from '@/shared-util';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export interface TrackingFavorite {
  favId: number;
  name: string;
  criteriaJson: string | null;
  isTeam: 'Y' | 'N';
  sortOrder: number | null;
  userId: number;
  mine: boolean;
  updatedAt: string | null;
}

export interface FavoriteRequest {
  name: string;
  criteriaJson?: string | null;
  isTeam?: 'Y' | 'N';
  sortOrder?: number | null;
}

export const favoriteApi = {
  list: async (): Promise<TrackingFavorite[]> => {
    // BE: ApiResponse<List<T>> → BFF wrap: data.value[] (CLAUDE.md § BFF 응답 래핑 규칙)
    const r = await apiClient.get<ApiResponse<{ value: TrackingFavorite[] } | TrackingFavorite[]>>('/ipron-tracking-favorites-list');
    const d = r.data?.data;
    if (Array.isArray(d)) return d;
    if (d && Array.isArray((d as { value?: TrackingFavorite[] }).value)) return (d as { value: TrackingFavorite[] }).value;
    return [];
  },
  create: async (req: FavoriteRequest): Promise<TrackingFavorite> => {
    const r = await apiClient.post<ApiResponse<TrackingFavorite>>('/ipron-tracking-favorites-create', req);
    const data = r.data?.data;
    if (!data) throw new Error('FAVORITE_CREATE_EMPTY');
    return data;
  },
  update: async (favId: number, req: FavoriteRequest): Promise<TrackingFavorite> => {
    const r = await apiClient.put<ApiResponse<TrackingFavorite>>('/ipron-tracking-favorites-update', req, {
      params: { favId },
    });
    const data = r.data?.data;
    if (!data) throw new Error('FAVORITE_UPDATE_EMPTY');
    return data;
  },
  remove: async (favId: number): Promise<void> => {
    await apiClient.delete<ApiResponse<void>>('/ipron-tracking-favorites-delete', { params: { favId } });
  },
};
