/**
 * 발신라우트 관리 React Query 훅
 * SD-ROUTE.md 설계서 기반
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { type DodTransOption, type MentOption, type WorktimeOption, routeApi } from '../api/routeApi';
import type { Route, RoutePoint } from '../types';

export const routeQueryKeys = createQueryKeys('routes', {
  getRoutes: (params?: Record<string, unknown>) => [params],
  getRouteDetail: (params?: Record<string, unknown>) => [params],
  getRoutePoints: (params?: Record<string, unknown>) => [params],
  getNodes: null,
  getEndpoints: (params?: Record<string, unknown>) => [params],
  getRoutesByNode: (nodeId?: number) => [nodeId],
  getDodTransOptions: (nodeId?: number) => [nodeId],
  getWorktimeOptions: (nodeId?: number) => [nodeId],
  getMentOptions: (nodeId?: number) => [nodeId],
});

// ─── Route Queries ─────────────────────────────────────────────────────────

/**
 * 라우트 목록 조회
 */
export const useGetRoutes = ({ params, queryOptions }: QueryHookWithParamsOptions<Route[]> = {}) => {
  return useQuery({
    queryKey: routeQueryKeys.getRoutes(params).queryKey,
    queryFn: () => routeApi.getRoutes(params),
    ...queryOptions,
  });
};

/**
 * 라우트 상세 조회
 */
export const useGetRouteDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<Route> = {}) => {
  return useQuery({
    queryKey: routeQueryKeys.getRouteDetail(params).queryKey,
    queryFn: () => routeApi.getRouteDetail(params ?? {}),
    ...queryOptions,
  });
};

/**
 * 라우트 등록
 */
export const useCreateRoute = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: routeApi.createRoute,
    ...mutationOptions,
  });
};

/**
 * 라우트 수정
 */
export const useUpdateRoute = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: routeApi.updateRoute,
    ...mutationOptions,
  });
};

/**
 * 라우트 삭제
 */
export const useDeleteRoute = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: routeApi.deleteRoute,
    ...mutationOptions,
  });
};

// ─── RoutePoint Queries ────────────────────────────────────────────────────

/**
 * 라우트포인트 목록 조회 (배정된 국선)
 */
export const useGetRoutePoints = ({ params, queryOptions }: QueryHookWithParamsOptions<RoutePoint[]> = {}) => {
  return useQuery({
    queryKey: routeQueryKeys.getRoutePoints(params).queryKey,
    queryFn: () => routeApi.getRoutePoints(params ?? {}),
    ...queryOptions,
  });
};

/**
 * 라우트포인트 일괄 업데이트
 */
export const useUpdateRoutePoints = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: routeApi.updateRoutePoints,
    ...mutationOptions,
  });
};

/**
 * 라우트포인트 개별 삭제
 */
export const useDeleteRoutePoint = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: routeApi.deleteRoutePoint,
    ...mutationOptions,
  });
};

/**
 * 라우트 국선 일괄 배정 해제 (벌크 1콜)
 */
export const useDeleteRoutePointsBatch = ({ mutationOptions }: MutationHookOptions<void, { routeId: number; endptIds: number[] }> = {}) => {
  return useMutation({
    mutationFn: routeApi.deleteRoutePointsBatch,
    ...mutationOptions,
  });
};

// ─── Node Query ────────────────────────────────────────────────────────────

interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

/**
 * 노드 목록 조회 (cross-service)
 */
export const useGetNodes = ({ queryOptions }: QueryHookOptions<NodeSimpleResponse[]> = {}) => {
  return useQuery({
    queryKey: routeQueryKeys.getNodes.queryKey,
    queryFn: () => routeApi.getNodes(),
    ...queryOptions,
  });
};

// ─── Endpoint Query (국선배정용) ───────────────────────────────────────────

/**
 * 국선 목록 조회 (국선배정 Dialog에서 사용)
 */
export const useGetEndpoints = ({ params, queryOptions }: QueryHookWithParamsOptions = {}) => {
  return useQuery({
    queryKey: routeQueryKeys.getEndpoints(params).queryKey,
    queryFn: () => routeApi.getEndpoints(params),
    ...queryOptions,
  });
};

// ─── Routes by Node (self-ref FK select) ───────────────────────────────────

/**
 * 동일 노드 라우트 목록 (혼잡라우트/차단라우트/우회라우트 select용)
 */
export const useGetRoutesByNode = (nodeId?: number, queryOptions?: QueryHookOptions<Route[]>['queryOptions']) => {
  return useQuery({
    queryKey: routeQueryKeys.getRoutesByNode(nodeId).queryKey,
    queryFn: () => routeApi.getRoutesByNode(nodeId!),
    enabled: !!nodeId,
    ...queryOptions,
  });
};

// ─── Combo Option Queries (발신라우트 폼 동적 Select용) ───────────────────────

/**
 * DOD 번호변환 콤보 옵션 (nodeId 선택 시 동적 갱신)
 * SWAT: cbCreate('#poDodTransId','dodtrans','search1='+nodeId)
 */
export const useGetDodTransOptions = (nodeId?: number, queryOptions?: QueryHookOptions<DodTransOption[]>['queryOptions']) => {
  return useQuery({
    queryKey: routeQueryKeys.getDodTransOptions(nodeId).queryKey,
    queryFn: () => routeApi.getDodTransOptions(nodeId!),
    enabled: !!nodeId,
    ...queryOptions,
  });
};

/**
 * 업무시간 콤보 옵션 (nodeId 선택 시 동적 갱신)
 * SWAT: cbCreate('#poIeWorktimeId','worktime','nodeId='+nodeId+'&tenantId=0')
 */
export const useGetWorktimeOptions = (nodeId?: number, queryOptions?: QueryHookOptions<WorktimeOption[]>['queryOptions']) => {
  return useQuery({
    queryKey: routeQueryKeys.getWorktimeOptions(nodeId).queryKey,
    queryFn: () => routeApi.getWorktimeOptions(nodeId!),
    enabled: !!nodeId,
    ...queryOptions,
  });
};

/**
 * 안내멘트 콤보 옵션 (nodeId 선택 시 동적 갱신)
 * SWAT: cbCreate('#poWorktimeMentId','ment','nodeId='+nodeId+'&tenantId=0')
 */
export const useGetMentOptions = (nodeId?: number, queryOptions?: QueryHookOptions<MentOption[]>['queryOptions']) => {
  return useQuery({
    queryKey: routeQueryKeys.getMentOptions(nodeId).queryKey,
    queryFn: () => routeApi.getMentOptions(nodeId!),
    enabled: !!nodeId,
    ...queryOptions,
  });
};
