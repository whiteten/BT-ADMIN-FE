/**
 * 테넌트 할당 관리 React Query 훅
 * SD-NODE-MANAGEMENT.md 설계서 기반
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { tenantAllocApi } from '../api/tenantAllocApi';
import type { ClusterConfig, TenantAllocDetail, TenantAllocItem } from '../types';

export const tenantAllocQueryKeys = createAppQueryKeys('tenantAllocs', {
  getTenantAllocs: (params?: Record<string, unknown>) => [params],
  getTenantAllocDetail: (params?: Record<string, unknown>) => [params],
  getClusterConfig: (params?: Record<string, unknown>) => [params],
});

/**
 * 테넌트 할당 목록 조회
 */
export const useGetTenantAllocs = ({ params, queryOptions }: QueryHookWithParamsOptions<TenantAllocItem[]> = {}) => {
  return useQuery({
    queryKey: tenantAllocQueryKeys.getTenantAllocs(params).queryKey,
    queryFn: () => tenantAllocApi.getTenantAllocs(params ?? {}),
    ...queryOptions,
  });
};

/**
 * 테넌트 할당 상세 조회
 */
export const useGetTenantAllocDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<TenantAllocDetail> = {}) => {
  return useQuery({
    queryKey: tenantAllocQueryKeys.getTenantAllocDetail(params).queryKey,
    queryFn: () => tenantAllocApi.getTenantAllocDetail(params ?? {}),
    ...queryOptions,
  });
};

/**
 * 테넌트 할당 등록
 */
export const useCreateTenantAlloc = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: tenantAllocApi.createTenantAlloc,
    ...mutationOptions,
  });
};

/**
 * 테넌트 할당 수정
 */
export const useUpdateTenantAlloc = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: tenantAllocApi.updateTenantAlloc,
    ...mutationOptions,
  });
};

/**
 * 테넌트 할당 삭제
 */
export const useDeleteTenantAlloc = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: tenantAllocApi.deleteTenantAlloc,
    ...mutationOptions,
  });
};

/**
 * 클러스터 설정 조회
 */
export const useGetClusterConfig = ({ params, queryOptions }: QueryHookWithParamsOptions<ClusterConfig> = {}) => {
  return useQuery({
    queryKey: tenantAllocQueryKeys.getClusterConfig(params).queryKey,
    queryFn: () => tenantAllocApi.getClusterConfig(params ?? {}),
    ...queryOptions,
  });
};

/**
 * 클러스터 설정 수정
 */
export const useUpdateClusterConfig = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: tenantAllocApi.updateClusterConfig,
    ...mutationOptions,
  });
};
