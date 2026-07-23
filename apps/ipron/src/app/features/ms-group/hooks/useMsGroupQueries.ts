/**
 * MS 관리 React Query 훅
 * SD-MS-MANAGEMENT.md 설계서 기반
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { msGroupApi } from '../api/msGroupApi';
import type { MediaServer, MsGroup, MsGroupMember, NodeMsSettingResponse } from '../types';

export const msGroupQueryKeys = createAppQueryKeys('msGroups', {
  getMsGroups: (params?: Record<string, unknown>) => [params],
  getMsGroupDetail: (params?: Record<string, unknown>) => [params],
  getMsGroupMembers: (params?: Record<string, unknown>) => [params],
  getMediaServers: (params?: Record<string, unknown>) => [params],
  getMediaServerDetail: (params?: Record<string, unknown>) => [params],
  getNodes: null,
  getNodeMsSetting: (params?: Record<string, unknown>) => [params],
});

// ─── MS Group Queries ─────────────────────────────────────────────────────

/**
 * MS그룹 목록 조회
 */
export const useGetMsGroups = ({ params, queryOptions }: QueryHookWithParamsOptions<MsGroup[]> = {}) => {
  return useQuery({
    queryKey: msGroupQueryKeys.getMsGroups(params).queryKey,
    queryFn: () => msGroupApi.getMsGroups(params),
    ...queryOptions,
  });
};

/**
 * MS그룹 상세 조회
 */
export const useGetMsGroupDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<MsGroup> = {}) => {
  return useQuery({
    queryKey: msGroupQueryKeys.getMsGroupDetail(params).queryKey,
    queryFn: () => msGroupApi.getMsGroupDetail(params ?? {}),
    ...queryOptions,
  });
};

/**
 * MS그룹 등록
 */
export const useCreateMsGroup = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: msGroupApi.createMsGroup,
    ...mutationOptions,
  });
};

/**
 * MS그룹 수정
 */
export const useUpdateMsGroup = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: msGroupApi.updateMsGroup,
    ...mutationOptions,
  });
};

/**
 * MS그룹 삭제
 */
export const useDeleteMsGroup = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: msGroupApi.deleteMsGroup,
    ...mutationOptions,
  });
};

// ─── MS Group Member Queries ──────────────────────────────────────────────

/**
 * MS그룹 멤버 목록 조회
 */
export const useGetMsGroupMembers = ({ params, queryOptions }: QueryHookWithParamsOptions<MsGroupMember[]> = {}) => {
  return useQuery({
    queryKey: msGroupQueryKeys.getMsGroupMembers(params).queryKey,
    queryFn: () => msGroupApi.getMsGroupMembers(params ?? {}),
    ...queryOptions,
  });
};

/**
 * MS그룹 멤버 일괄 업데이트
 */
export const useUpdateMsGroupMembers = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: msGroupApi.updateMsGroupMembers,
    ...mutationOptions,
  });
};

// ─── Media Server Queries ─────────────────────────────────────────────────

/**
 * 미디어서버 목록 조회
 */
export const useGetMediaServers = ({ params, queryOptions }: QueryHookWithParamsOptions<MediaServer[]> = {}) => {
  return useQuery({
    queryKey: msGroupQueryKeys.getMediaServers(params).queryKey,
    queryFn: () => msGroupApi.getMediaServers(params),
    ...queryOptions,
  });
};

/**
 * 미디어서버 상세 조회
 */
export const useGetMediaServerDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<MediaServer> = {}) => {
  return useQuery({
    queryKey: msGroupQueryKeys.getMediaServerDetail(params).queryKey,
    queryFn: () => msGroupApi.getMediaServerDetail(params ?? {}),
    ...queryOptions,
  });
};

/**
 * 미디어서버 등록
 */
export const useCreateMediaServer = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: msGroupApi.createMediaServer,
    ...mutationOptions,
  });
};

/**
 * 미디어서버 수정
 */
export const useUpdateMediaServer = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: msGroupApi.updateMediaServer,
    ...mutationOptions,
  });
};

/**
 * 미디어서버 삭제
 */
export const useDeleteMediaServer = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: msGroupApi.deleteMediaServer,
    ...mutationOptions,
  });
};

// ─── Node Query ─────────────────────────────────────────────────────────────

interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
  msGroupId: number | null;
}

/**
 * 노드 목록 조회 (cross-service)
 */
export const useGetNodes = ({ queryOptions }: QueryHookOptions<NodeSimpleResponse[]> = {}) => {
  return useQuery({
    queryKey: msGroupQueryKeys.getNodes.queryKey,
    queryFn: () => msGroupApi.getNodes(),
    ...queryOptions,
  });
};

// ─── Node MS Setting ──────────────────────────────────────────────────────

export const useGetNodeMsSetting = ({ params, queryOptions }: QueryHookWithParamsOptions<NodeMsSettingResponse> = {}) => {
  return useQuery({
    queryKey: msGroupQueryKeys.getNodeMsSetting(params).queryKey,
    queryFn: () => msGroupApi.getNodeMsSetting(params ?? {}),
    ...queryOptions,
  });
};

export const useUpdateNodeMsSetting = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: msGroupApi.updateNodeMsSetting,
    ...mutationOptions,
  });
};
