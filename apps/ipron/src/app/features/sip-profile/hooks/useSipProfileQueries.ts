/**
 * SIP 프로파일 관리 React Query 훅
 * SD-SIP-PROFILE.md 설계서 기반
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { sipProfileApi } from '../api/sipProfileApi';
import type { SipHeaderGroup, SipHeaderRelay, SipProfile } from '../types';

export const sipProfileQueryKeys = createAppQueryKeys('sipProfiles', {
  getProfiles: (params?: Record<string, unknown>) => [params],
  getProfileDetail: (params?: Record<string, unknown>) => [params],
  getHeaderGroups: null,
  getHeaderRelays: (params?: Record<string, unknown>) => [params],
});

// ─── Profile Queries ─────────────────────────────────────────────────────────

/**
 * 프로파일 목록 조회
 */
export const useGetSipProfiles = ({ params, queryOptions }: QueryHookWithParamsOptions<SipProfile[]> = {}) => {
  return useQuery({
    queryKey: sipProfileQueryKeys.getProfiles(params).queryKey,
    queryFn: () => sipProfileApi.getProfiles(params),
    ...queryOptions,
  });
};

/**
 * 프로파일 상세 조회
 */
export const useGetSipProfileDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<SipProfile> = {}) => {
  return useQuery({
    queryKey: sipProfileQueryKeys.getProfileDetail(params).queryKey,
    queryFn: () => sipProfileApi.getProfileDetail(params ?? {}),
    ...queryOptions,
  });
};

/**
 * 프로파일 등록
 */
export const useCreateSipProfile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: sipProfileApi.createProfile,
    ...mutationOptions,
  });
};

/**
 * 프로파일 수정
 */
export const useUpdateSipProfile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: sipProfileApi.updateProfile,
    ...mutationOptions,
  });
};

/**
 * 프로파일 삭제
 */
export const useDeleteSipProfile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: sipProfileApi.deleteProfile,
    ...mutationOptions,
  });
};

// ─── Header Group Queries ────────────────────────────────────────────────────

/**
 * 헤더 그룹 목록 조회
 */
export const useGetSipHeaderGroups = ({ queryOptions }: QueryHookOptions<SipHeaderGroup[]> = {}) => {
  return useQuery({
    queryKey: sipProfileQueryKeys.getHeaderGroups.queryKey,
    queryFn: () => sipProfileApi.getHeaderGroups(),
    ...queryOptions,
  });
};

/**
 * 헤더 그룹 등록
 */
export const useCreateSipHeaderGroup = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: sipProfileApi.createHeaderGroup,
    ...mutationOptions,
  });
};

/**
 * 헤더 그룹 수정
 */
export const useUpdateSipHeaderGroup = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: sipProfileApi.updateHeaderGroup,
    ...mutationOptions,
  });
};

/**
 * 헤더 그룹 삭제
 */
export const useDeleteSipHeaderGroup = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: sipProfileApi.deleteHeaderGroup,
    ...mutationOptions,
  });
};

// ─── Header Relay Queries ────────────────────────────────────────────────────

/**
 * 헤더 릴레이 목록 조회
 */
export const useGetSipHeaderRelays = ({ params, queryOptions }: QueryHookWithParamsOptions<SipHeaderRelay[]> = {}) => {
  return useQuery({
    queryKey: sipProfileQueryKeys.getHeaderRelays(params).queryKey,
    queryFn: () => sipProfileApi.getHeaderRelays(params),
    ...queryOptions,
  });
};

/**
 * 헤더 릴레이 등록
 */
export const useCreateSipHeaderRelay = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: sipProfileApi.createHeaderRelay,
    ...mutationOptions,
  });
};

/**
 * 헤더 릴레이 수정
 */
export const useUpdateSipHeaderRelay = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: sipProfileApi.updateHeaderRelay,
    ...mutationOptions,
  });
};

/**
 * 헤더 릴레이 삭제
 */
export const useDeleteSipHeaderRelay = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: sipProfileApi.deleteHeaderRelay,
    ...mutationOptions,
  });
};

// ─── Group Members Queries ───────────────────────────────────────────────────

/**
 * 그룹 멤버 일괄 업데이트 (replace)
 */
export const useUpdateSipGroupMembers = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: sipProfileApi.updateGroupMembers,
    ...mutationOptions,
  });
};
