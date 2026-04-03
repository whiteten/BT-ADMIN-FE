/**
 * 긴급코드 프로파일 관리 React Query 훅
 * SD-EMERG-PROFILE.md 설계서 기반
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { emergProfileApi } from '../api/emergProfileApi';
import type { EmergCode, EmergProfile, EmergProfileDetail, NodeSimpleResponse } from '../types/emergProfile.types';

export const emergProfileQueryKeys = createQueryKeys('emergProfiles', {
  getProfiles: (params?: Record<string, unknown>) => [params],
  getProfileDetail: (params?: Record<string, unknown>) => [params],
  getCodes: (params?: Record<string, unknown>) => [params],
  getNodes: null,
});

// ─── Profile Queries ─────────────────────────────────────────────────────────

/**
 * 프로파일 목록 조회
 */
export const useGetProfiles = ({ params, queryOptions }: QueryHookWithParamsOptions<EmergProfile[]> = {}) => {
  return useQuery({
    queryKey: emergProfileQueryKeys.getProfiles(params).queryKey,
    queryFn: () => emergProfileApi.getProfiles(params),
    ...queryOptions,
  });
};

/**
 * 프로파일 상세 조회
 */
export const useGetProfileDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<EmergProfileDetail> = {}) => {
  return useQuery({
    queryKey: emergProfileQueryKeys.getProfileDetail(params).queryKey,
    queryFn: () => emergProfileApi.getProfileDetail(params ?? {}),
    ...queryOptions,
  });
};

/**
 * 프로파일 등록
 */
export const useCreateProfile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: emergProfileApi.createProfile,
    ...mutationOptions,
  });
};

/**
 * 프로파일 수정
 */
export const useUpdateProfile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: emergProfileApi.updateProfile,
    ...mutationOptions,
  });
};

/**
 * 프로파일 삭제
 */
export const useDeleteProfile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: emergProfileApi.deleteProfile,
    ...mutationOptions,
  });
};

/**
 * 프로파일 복사
 */
export const useCopyProfile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: emergProfileApi.copyProfile,
    ...mutationOptions,
  });
};

// ─── Code Queries ────────────────────────────────────────────────────────────

/**
 * 코드 목록 조회
 */
export const useGetCodes = ({ params, queryOptions }: QueryHookWithParamsOptions<EmergCode[]> = {}) => {
  return useQuery({
    queryKey: emergProfileQueryKeys.getCodes(params).queryKey,
    queryFn: () => emergProfileApi.getCodes(params ?? {}),
    ...queryOptions,
  });
};

/**
 * 코드 등록
 */
export const useCreateCode = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: emergProfileApi.createCode,
    ...mutationOptions,
  });
};

/**
 * 코드 수정
 */
export const useUpdateCode = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: emergProfileApi.updateCode,
    ...mutationOptions,
  });
};

/**
 * 코드 삭제
 */
export const useDeleteCode = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: emergProfileApi.deleteCode,
    ...mutationOptions,
  });
};

// ─── Node Queries ────────────────────────────────────────────────────────────

/**
 * 노드 목록 조회 (cross-service)
 */
export const useGetNodes = ({ queryOptions }: QueryHookOptions<NodeSimpleResponse[]> = {}) => {
  return useQuery({
    queryKey: emergProfileQueryKeys.getNodes.queryKey,
    queryFn: () => emergProfileApi.getNodes(),
    ...queryOptions,
  });
};
