/**
 * 기능코드 프로파일 관리 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { devfuncProfileApi } from '../api/devfuncProfileApi';
import type { DevfuncCode, DevfuncProfile, ProfileTreeNodeResponse, TenantSimpleResponse } from '../types';

export const devfuncProfileQueryKeys = createAppQueryKeys('devfuncProfiles', {
  getProfiles: (params?: Record<string, unknown>) => [params],
  getProfileTree: null,
  getProfileDetail: (params?: Record<string, unknown>) => [params],
  getCodes: (params?: Record<string, unknown>) => [params],
  getTenants: null,
});

// ─── Profile Queries ─────────────────────────────────────────────────────────

export const useGetProfiles = ({ params, queryOptions }: QueryHookWithParamsOptions<DevfuncProfile[]> = {}) => {
  return useQuery({
    queryKey: devfuncProfileQueryKeys.getProfiles(params).queryKey,
    queryFn: () => devfuncProfileApi.getProfiles(params),
    ...queryOptions,
  });
};

export const useGetProfileTree = ({ queryOptions }: QueryHookOptions<ProfileTreeNodeResponse[]> = {}) => {
  return useQuery({
    queryKey: devfuncProfileQueryKeys.getProfileTree.queryKey,
    queryFn: () => devfuncProfileApi.getProfileTree(),
    ...queryOptions,
  });
};

export const useGetProfileDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<DevfuncProfile> = {}) => {
  return useQuery({
    queryKey: devfuncProfileQueryKeys.getProfileDetail(params).queryKey,
    queryFn: () => devfuncProfileApi.getProfileDetail(params ?? {}),
    ...queryOptions,
  });
};

export const useCreateProfile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: devfuncProfileApi.createProfile,
    ...mutationOptions,
  });
};

export const useUpdateProfile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: devfuncProfileApi.updateProfile,
    ...mutationOptions,
  });
};

export const useDeleteProfile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: devfuncProfileApi.deleteProfile,
    ...mutationOptions,
  });
};

export const useCopyProfile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: devfuncProfileApi.copyProfile,
    ...mutationOptions,
  });
};

// ─── Code Queries ────────────────────────────────────────────────────────────

export const useGetCodes = ({ params, queryOptions }: QueryHookWithParamsOptions<DevfuncCode[]> = {}) => {
  return useQuery({
    queryKey: devfuncProfileQueryKeys.getCodes(params).queryKey,
    queryFn: () => devfuncProfileApi.getCodes(params ?? {}),
    ...queryOptions,
  });
};

export const useCreateCode = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: devfuncProfileApi.createCode,
    ...mutationOptions,
  });
};

export const useUpdateCode = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: devfuncProfileApi.updateCode,
    ...mutationOptions,
  });
};

export const useDeleteCode = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: devfuncProfileApi.deleteCode,
    ...mutationOptions,
  });
};

// ─── Tenant Queries ─────────────────────────────────────────────────────────

export const useGetTenants = ({ queryOptions }: QueryHookOptions<TenantSimpleResponse[]> = {}) => {
  return useQuery({
    queryKey: devfuncProfileQueryKeys.getTenants.queryKey,
    queryFn: () => devfuncProfileApi.getTenants(),
    ...queryOptions,
  });
};
