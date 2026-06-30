/**
 * 트래킹 검색 즐겨찾기 — React Query hooks.
 *
 * React 19 + MFE 환경에서 useMutation 의 onSuccess + useQueryClient.invalidateQueries 가
 * commitLayoutEffect 충돌 → onSuccess 콜백 제거 + 호출 측에서 명시적으로 refetch().
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { type FavoriteRequest, favoriteApi } from '../api/favoriteApi';

const KEY = ['tracking-favorites', 'list'] as const;

export function useGetFavorites() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => favoriteApi.list(),
    staleTime: 30_000,
  });
}

export function useCreateFavorite() {
  return useMutation({
    mutationFn: (req: FavoriteRequest) => favoriteApi.create(req),
  });
}

export function useUpdateFavorite() {
  return useMutation({
    mutationFn: (p: { favId: number; req: FavoriteRequest }) => favoriteApi.update(p.favId, p.req),
  });
}

export function useDeleteFavorite() {
  return useMutation({
    mutationFn: (favId: number) => favoriteApi.remove(favId),
  });
}
