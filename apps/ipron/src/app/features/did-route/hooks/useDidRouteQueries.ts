/**
 * DID라우트 관리 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { type DnGroupOptionItem, type WorktimeOptionItem, didRouteApi } from '../api/didRouteApi';
import type { DidRoute } from '../types';

export const didRouteQueryKeys = createQueryKeys('didRoutes', {
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (params?: Record<string, unknown>) => [params],
  getNodes: null,
  getRoutesByNode: (nodeId?: number) => [nodeId],
  getDnGroupOptions: (tenantId?: number) => [tenantId],
  getWorktimeOptions: (tenantId?: number) => [tenantId],
});

// ─── DID Route Queries ────────────────────────────────────────────────────

/**
 * DID라우트 목록 조회
 */
export const useGetDidRouteList = ({ params, queryOptions }: QueryHookWithParamsOptions<DidRoute[]> = {}) => {
  return useQuery({
    queryKey: didRouteQueryKeys.getList(params).queryKey,
    queryFn: () => didRouteApi.getList(params),
    ...queryOptions,
  });
};

/**
 * DID라우트 상세 조회
 */
export const useGetDidRouteDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<DidRoute> = {}) => {
  return useQuery({
    queryKey: didRouteQueryKeys.getDetail(params).queryKey,
    queryFn: () => didRouteApi.getDetail(params ?? {}),
    ...queryOptions,
  });
};

/**
 * DID라우트 등록
 */
export const useCreateDidRoute = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: didRouteApi.create,
    ...mutationOptions,
  });
};

/**
 * DID라우트 수정
 */
export const useUpdateDidRoute = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: didRouteApi.update,
    ...mutationOptions,
  });
};

/**
 * DID라우트 삭제
 */
export const useDeleteDidRoute = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: didRouteApi.delete,
    ...mutationOptions,
  });
};

/**
 * DID라우트 일괄 삭제 (벌크 1콜)
 */
export const useDeleteDidRouteBatch = ({ mutationOptions }: MutationHookOptions<void, number[]> = {}) => {
  return useMutation({
    mutationFn: (ids: number[]) => didRouteApi.deleteBatch(ids),
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
    queryKey: didRouteQueryKeys.getNodes.queryKey,
    queryFn: () => didRouteApi.getNodes(),
    ...queryOptions,
  });
};

// ─── Route Query (라우트 select용) ─────────────────────────────────────────

interface RouteSimpleResponse {
  routeId: number;
  routeName: string;
  nodeId: number;
}

/**
 * 노드별 발신라우트 목록 (라우트 select용)
 */
export const useGetRoutesByNode = (nodeId?: number, queryOptions?: QueryHookOptions<RouteSimpleResponse[]>['queryOptions']) => {
  return useQuery({
    queryKey: didRouteQueryKeys.getRoutesByNode(nodeId).queryKey,
    queryFn: () => didRouteApi.getRoutesByNode(nodeId!),
    enabled: !!nodeId,
    ...queryOptions,
  });
};

// ─── DN 그룹 콤보 옵션 ─────────────────────────────────────────────────────

/**
 * DN 그룹(IPT 관리 조직) 콤보 옵션
 * SWAT: treeDnGroupByTenantId.do (IPR20S1036.jsp:14)
 */
export const useGetDnGroupOptions = (tenantId: number | null | undefined, queryOptions?: QueryHookOptions<DnGroupOptionItem[]>['queryOptions']) => {
  return useQuery({
    queryKey: didRouteQueryKeys.getDnGroupOptions(tenantId ?? undefined).queryKey,
    queryFn: () => didRouteApi.getDnGroupOptions(tenantId!),
    enabled: tenantId != null,
    ...queryOptions,
  });
};

// ─── 업무시간 콤보 옵션 ────────────────────────────────────────────────────

/**
 * 업무시간 콤보 옵션 (WORKTIME_TYPE='IE')
 * SWAT: common.selWorktimeList (IPR20S1036.jsp:385)
 * DN그룹 onChange 시 선택된 tenantId 로 재조회.
 */
export const useGetWorktimeOptions = (tenantId: number | null | undefined, queryOptions?: QueryHookOptions<WorktimeOptionItem[]>['queryOptions']) => {
  return useQuery({
    queryKey: didRouteQueryKeys.getWorktimeOptions(tenantId ?? undefined).queryKey,
    queryFn: () => didRouteApi.getWorktimeOptions(tenantId!),
    enabled: tenantId != null,
    ...queryOptions,
  });
};
