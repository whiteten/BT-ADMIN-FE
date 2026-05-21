/**
 * COS 설정 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { type NodeTenantItem, cosApi } from '../api/cosApi';
import type { Cos } from '../types';

export const cosQueryKeys = createQueryKeys('cos', {
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (cosId?: number) => [cosId],
  getRefCount: (cosId?: number) => [cosId],
  getNodeTenants: null,
});

// ─── 조회 훅 ──────────────────────────────────────────────────────────────

/**
 * COS 목록 조회 (tenantId 필터)
 */
export const useGetCosList = ({ params, queryOptions }: QueryHookWithParamsOptions<Cos[]> = {}) => {
  return useQuery({
    queryKey: cosQueryKeys.getList(params).queryKey,
    queryFn: () => cosApi.getList(params),
    ...queryOptions,
  });
};

/**
 * COS 상세 조회
 */
export const useGetCosDetail = (cosId?: number, { queryOptions }: QueryHookOptions<Cos> = {}) => {
  return useQuery({
    queryKey: cosQueryKeys.getDetail(cosId).queryKey,
    queryFn: () => cosApi.getDetail(cosId!),
    enabled: !!cosId,
    ...queryOptions,
  });
};

/**
 * COS 참조 DN 수 조회
 */
export const useGetCosRefCount = (cosId?: number, { queryOptions }: QueryHookOptions<number> = {}) => {
  return useQuery({
    queryKey: cosQueryKeys.getRefCount(cosId).queryKey,
    queryFn: () => cosApi.getRefCount(cosId!),
    enabled: !!cosId,
    ...queryOptions,
  });
};

/**
 * 노드-테넌트 매핑 목록 (테넌트 탭 구성용)
 */
export const useGetNodeTenants = ({ queryOptions }: QueryHookOptions<NodeTenantItem[]> = {}) => {
  return useQuery({
    queryKey: cosQueryKeys.getNodeTenants.queryKey,
    queryFn: () => cosApi.getNodeTenants(),
    ...queryOptions,
  });
};

// ─── CUD 훅 ────────────────────────────────────────────────────────────────

/**
 * COS 등록
 */
export const useCreateCos = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: cosApi.create,
    ...mutationOptions,
  });
};

/**
 * COS 수정
 */
export const useUpdateCos = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: cosApi.update,
    ...mutationOptions,
  });
};

/**
 * COS 삭제
 */
export const useDeleteCos = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: cosApi.delete,
    ...mutationOptions,
  });
};
