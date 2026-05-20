/**
 * IVR 미디어 관리 React Query 훅 (IPR20S6041)
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { ivrMediaApi } from '../api/ivrMediaApi';
import type { IrMediaServer, IrSttMaster, IrSystemUsage, IrTtsMaster } from '../types/ivrMedia.types';

export const ivrMediaQueryKeys = createQueryKeys('ivrMedia', {
  getMediaServer: (params?: Record<string, unknown>) => [params],
  getTtsMasters: null,
  getTts: (params?: Record<string, unknown>) => [params],
  getSttMasters: null,
  getStt: (params?: Record<string, unknown>) => [params],
  getForcusSystems: (params?: Record<string, unknown>) => [params],
  getNodes: null,
});

// ─── Media Server ──────────────────────────────────────────────────────────

export const useGetMediaServer = ({ params, queryOptions }: QueryHookWithParamsOptions<IrMediaServer | null> = {}) => {
  return useQuery({
    queryKey: ivrMediaQueryKeys.getMediaServer(params).queryKey,
    queryFn: () => ivrMediaApi.getMediaServer(params ?? {}),
    ...queryOptions,
  });
};

export const useUpsertMediaServer = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrMediaApi.upsertMediaServer,
    ...mutationOptions,
  });
};

export const useDeleteMediaServer = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrMediaApi.deleteMediaServer,
    ...mutationOptions,
  });
};

// ─── TTS Master ────────────────────────────────────────────────────────────

export const useGetTtsMasters = ({ queryOptions }: QueryHookOptions<IrTtsMaster[]> = {}) => {
  return useQuery({
    queryKey: ivrMediaQueryKeys.getTtsMasters.queryKey,
    queryFn: () => ivrMediaApi.getTtsMasters(),
    ...queryOptions,
  });
};

export const useGetTts = ({ params, queryOptions }: QueryHookWithParamsOptions<IrTtsMaster> = {}) => {
  return useQuery({
    queryKey: ivrMediaQueryKeys.getTts(params).queryKey,
    queryFn: () => ivrMediaApi.getTts(params ?? {}),
    ...queryOptions,
  });
};

export const useCreateTts = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrMediaApi.createTts,
    ...mutationOptions,
  });
};

export const useUpdateTts = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrMediaApi.updateTts,
    ...mutationOptions,
  });
};

export const useDeleteTts = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrMediaApi.deleteTts,
    ...mutationOptions,
  });
};

// ─── STT Master ────────────────────────────────────────────────────────────

export const useGetSttMasters = ({ queryOptions }: QueryHookOptions<IrSttMaster[]> = {}) => {
  return useQuery({
    queryKey: ivrMediaQueryKeys.getSttMasters.queryKey,
    queryFn: () => ivrMediaApi.getSttMasters(),
    ...queryOptions,
  });
};

export const useGetStt = ({ params, queryOptions }: QueryHookWithParamsOptions<IrSttMaster> = {}) => {
  return useQuery({
    queryKey: ivrMediaQueryKeys.getStt(params).queryKey,
    queryFn: () => ivrMediaApi.getStt(params ?? {}),
    ...queryOptions,
  });
};

export const useCreateStt = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrMediaApi.createStt,
    ...mutationOptions,
  });
};

export const useUpdateStt = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrMediaApi.updateStt,
    ...mutationOptions,
  });
};

export const useDeleteStt = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrMediaApi.deleteStt,
    ...mutationOptions,
  });
};

// ─── 시스템 / 노드 (재사용) ────────────────────────────────────────────────

export const useGetForcusSystems = ({ params, queryOptions }: QueryHookWithParamsOptions<IrSystemUsage[]> = {}) => {
  return useQuery({
    queryKey: ivrMediaQueryKeys.getForcusSystems(params).queryKey,
    queryFn: () => ivrMediaApi.getForcusSystems(params ?? {}),
    ...queryOptions,
  });
};

export const useGetNodes = ({ queryOptions }: QueryHookOptions<{ nodeId: number; nodeName: string }[]> = {}) => {
  return useQuery({
    queryKey: ivrMediaQueryKeys.getNodes.queryKey,
    queryFn: () => ivrMediaApi.getNodes(),
    ...queryOptions,
  });
};
