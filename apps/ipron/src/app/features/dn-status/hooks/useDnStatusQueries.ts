/**
 * 교환기 번호자원 현황 (dn-status) React Query 훅.
 *
 * - nodes/dr/gdns: 진입 시 로드. 자동갱신 토글 ON 이면 refetchInterval=60000 (IMPL-DECISIONS §데이터 갱신).
 * - drDns/bands: 필수 param 있을 때만 호출(enabled 가드 — BE @RequestParam 예외 방지).
 * - createBand/deleteBand: 성공 후 bands invalidate.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions } from '@/shared-util';
import { dnStatusApi } from '../api/dnStatusApi';
import type { DnBandStatus, DnStatusOverview, DrDn, DrLink, GdnTypeStat } from '../types';

const AUTO_REFRESH_MS = 60000;

export const dnStatusQueryKeys = createQueryKeys('dnStatus', {
  nodes: null,
  drLinks: null,
  gdnStats: null,
  drDns: (params: { fromNodeId: number; toNodeId: number }) => [params],
  bands: (params: { nodeId: number }) => [params],
});

interface AutoRefreshOption {
  /** 자동갱신 토글 — true 면 60초 폴링 */
  autoRefresh?: boolean;
}

/** ① 노드×DN타입×할당 집계 */
export const useDnStatusNodes = ({ autoRefresh, queryOptions }: QueryHookOptions<DnStatusOverview> & AutoRefreshOption = {}) =>
  useQuery({
    queryKey: dnStatusQueryKeys.nodes.queryKey,
    queryFn: () => dnStatusApi.getNodes(),
    refetchInterval: autoRefresh ? AUTO_REFRESH_MS : false,
    ...queryOptions,
  });

/** ② DR 수용 방향성 링크 집계 */
export const useDnStatusDrLinks = ({ autoRefresh, queryOptions }: QueryHookOptions<DrLink[]> & AutoRefreshOption = {}) =>
  useQuery({
    queryKey: dnStatusQueryKeys.drLinks.queryKey,
    queryFn: () => dnStatusApi.getDrLinks(),
    refetchInterval: autoRefresh ? AUTO_REFRESH_MS : false,
    ...queryOptions,
  });

/** ④ 노드×GDN타입 집계 */
export const useDnStatusGdnStats = ({ autoRefresh, queryOptions }: QueryHookOptions<GdnTypeStat[]> & AutoRefreshOption = {}) =>
  useQuery({
    queryKey: dnStatusQueryKeys.gdnStats.queryKey,
    queryFn: () => dnStatusApi.getGdnStats(),
    refetchInterval: autoRefresh ? AUTO_REFRESH_MS : false,
    ...queryOptions,
  });

/** ②-상세 DR 백업 DN 목록 — params 있을 때만 (enabled 가드) */
export const useDnStatusDrDns = (params: { fromNodeId: number; toNodeId: number } | null, { queryOptions }: QueryHookOptions<DrDn[]> = {}) =>
  useQuery({
    queryKey: dnStatusQueryKeys.drDns(params ?? { fromNodeId: 0, toNodeId: 0 }).queryKey,
    queryFn: () => dnStatusApi.getDrDns(params!),
    enabled: !!params,
    ...queryOptions,
  });

/** ③ 노드별 번호 대역 현황 — nodeId 있을 때만 (enabled 가드) */
export const useDnStatusBands = (params: { nodeId: number } | null, { queryOptions }: QueryHookOptions<DnBandStatus> = {}) =>
  useQuery({
    queryKey: dnStatusQueryKeys.bands(params ?? { nodeId: 0 }).queryKey,
    queryFn: () => dnStatusApi.getBands(params!),
    enabled: !!params,
    ...queryOptions,
  });

/** ③-등록 번호 대역 등록 */
export const useCreateDnBand = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: dnStatusApi.createBand,
    ...mutationOptions,
  });

/** ③-삭제 번호 대역 삭제 */
export const useDeleteDnBand = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: dnStatusApi.deleteBand,
    ...mutationOptions,
  });
