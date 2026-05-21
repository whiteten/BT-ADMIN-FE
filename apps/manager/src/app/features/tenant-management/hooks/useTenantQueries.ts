/**
 * 테넌트 관리 React Query 훅
 * SD-TENANT-MANAGEMENT.md 설계서 기반
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { tenantApi } from '../api/tenantApi';
import type { CallGroupItem, TenantDetail, TenantListItem } from '../types';

export const tenantQueryKeys = createQueryKeys('tenants', {
  getTenants: (params?: Record<string, unknown>) => [params],
  getTenant: (params?: Record<string, unknown>) => [params],
  getCallGroups: (params?: Record<string, unknown>) => [params],
  checkTenantName: (params?: Record<string, unknown>) => [params],
});

/**
 * 테넌트 목록 조회
 */
export const useGetTenants = ({ params, queryOptions }: QueryHookWithParamsOptions<TenantListItem[]> = {}) => {
  return useQuery({
    queryKey: tenantQueryKeys.getTenants(params).queryKey,
    queryFn: () => tenantApi.getTenants(params),
    ...queryOptions,
  });
};

/**
 * 테넌트 상세 조회
 */
export const useGetTenant = ({ params, queryOptions }: QueryHookWithParamsOptions<TenantDetail> = {}) => {
  return useQuery({
    queryKey: tenantQueryKeys.getTenant(params).queryKey,
    queryFn: () => tenantApi.getTenant(params ?? {}),
    ...queryOptions,
  });
};

/**
 * 테넌트 등록
 */
export const useCreateTenant = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: tenantApi.createTenant,
    ...mutationOptions,
  });
};

/**
 * 테넌트 수정
 */
export const useUpdateTenant = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: tenantApi.updateTenant,
    ...mutationOptions,
  });
};

/**
 * 테넌트 비활성화
 */
export const useDeleteTenant = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: tenantApi.deleteTenant,
    ...mutationOptions,
  });
};

/**
 * 테넌트명 중복체크
 */
export const useCheckTenantName = ({ params, queryOptions }: QueryHookWithParamsOptions<boolean> = {}) => {
  return useQuery({
    queryKey: tenantQueryKeys.checkTenantName(params).queryKey,
    queryFn: () => tenantApi.checkTenantName(params ?? {}),
    enabled: false,
    ...queryOptions,
  });
};

/**
 * 통화그룹 목록 조회
 */
export const useGetCallGroups = ({ params, queryOptions }: QueryHookWithParamsOptions<CallGroupItem[]> = {}) => {
  return useQuery({
    queryKey: tenantQueryKeys.getCallGroups(params).queryKey,
    queryFn: () => tenantApi.getCallGroups(params ?? {}),
    ...queryOptions,
  });
};

/**
 * 통화그룹 등록
 */
export const useCreateCallGroup = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: tenantApi.createCallGroup,
    ...mutationOptions,
  });
};

/**
 * 통화그룹 수정
 */
export const useUpdateCallGroup = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: tenantApi.updateCallGroup,
    ...mutationOptions,
  });
};

/**
 * 통화그룹 삭제
 */
export const useDeleteCallGroup = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: tenantApi.deleteCallGroup,
    ...mutationOptions,
  });
};
