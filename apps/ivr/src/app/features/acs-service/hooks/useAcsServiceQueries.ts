/**
 * ACS 서비스 관리 React Query 훅.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { acsServiceApi } from '../api/acsServiceApi';
import type { AcsDialConfig, AcsHoliday, AcsService, AcsSystemControl, AcsWorktime } from '../types/acsService.types';

export const acsServiceQueryKeys = createQueryKeys('acsServices', {
  getAcsServices: null,
  getAcsService: (acsId?: number) => [acsId],
  getAcsWorktimes: (params?: Record<string, unknown>) => [params],
  getAssignedWorktimes: (acsId?: number) => [acsId],
  getAcsHolidays: (params?: Record<string, unknown>) => [params],
  getAssignedHolidays: (acsId?: number) => [acsId],
  getDialConfig: null,
  getSystemControls: (params?: Record<string, unknown>) => [params],
});

// ─── ACS 서비스 마스터 ─────────────────────────────────────────

export const useGetAcsServices = ({ queryOptions }: QueryHookOptions<AcsService[]> = {}) => {
  return useQuery({
    queryKey: acsServiceQueryKeys.getAcsServices.queryKey,
    queryFn: () => acsServiceApi.getAcsServices(),
    ...queryOptions,
  });
};

export const useUpdateAcsService = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: acsServiceApi.updateAcsService,
    ...mutationOptions,
  });
};

export const useUpdateAcsServiceUse = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: acsServiceApi.updateAcsServiceUse,
    ...mutationOptions,
  });
};

export const useDeleteAcsService = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: acsServiceApi.deleteAcsService,
    ...mutationOptions,
  });
};

// ─── 업무시간 ─────────────────────────────────────────────────

export const useGetAcsWorktimes = ({ params, queryOptions }: QueryHookWithParamsOptions<AcsWorktime[]> = {}) => {
  return useQuery({
    queryKey: acsServiceQueryKeys.getAcsWorktimes(params).queryKey,
    queryFn: () => acsServiceApi.getAcsWorktimes(params as { excludeAcsId?: number }),
    ...queryOptions,
  });
};

export const useGetAssignedWorktimes = ({ params, queryOptions }: QueryHookWithParamsOptions<AcsWorktime[]> = {}) => {
  return useQuery({
    queryKey: acsServiceQueryKeys.getAssignedWorktimes(params?.acsId as number).queryKey,
    queryFn: () => acsServiceApi.getAssignedWorktimes(params?.acsId as number),
    ...queryOptions,
  });
};

export const useCreateAcsWorktime = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: acsServiceApi.createAcsWorktime, ...mutationOptions });
};

export const useUpdateAcsWorktime = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: acsServiceApi.updateAcsWorktime, ...mutationOptions });
};

export const useDeleteAcsWorktime = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: acsServiceApi.deleteAcsWorktime, ...mutationOptions });
};

export const useApplyWorktimes = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: acsServiceApi.applyWorktimes, ...mutationOptions });
};

export const useCancelWorktimes = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: acsServiceApi.cancelWorktimes, ...mutationOptions });
};

// ─── 휴일 ─────────────────────────────────────────────────────

export const useGetAcsHolidays = ({ params, queryOptions }: QueryHookWithParamsOptions<AcsHoliday[]> = {}) => {
  return useQuery({
    queryKey: acsServiceQueryKeys.getAcsHolidays(params).queryKey,
    queryFn: () => acsServiceApi.getAcsHolidays(params as { excludeAcsId?: number }),
    ...queryOptions,
  });
};

export const useGetAssignedHolidays = ({ params, queryOptions }: QueryHookWithParamsOptions<AcsHoliday[]> = {}) => {
  return useQuery({
    queryKey: acsServiceQueryKeys.getAssignedHolidays(params?.acsId as number).queryKey,
    queryFn: () => acsServiceApi.getAssignedHolidays(params?.acsId as number),
    ...queryOptions,
  });
};

export const useCreateAcsHoliday = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: acsServiceApi.createAcsHoliday, ...mutationOptions });
};

export const useUpdateAcsHoliday = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: acsServiceApi.updateAcsHoliday, ...mutationOptions });
};

export const useDeleteAcsHoliday = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: acsServiceApi.deleteAcsHoliday, ...mutationOptions });
};

export const useApplyHolidays = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: acsServiceApi.applyHolidays, ...mutationOptions });
};

export const useCancelHolidays = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: acsServiceApi.cancelHolidays, ...mutationOptions });
};

// ─── 발신 설정 ────────────────────────────────────────────────

export const useGetDialConfig = ({ queryOptions }: QueryHookOptions<AcsDialConfig> = {}) => {
  return useQuery({
    queryKey: acsServiceQueryKeys.getDialConfig.queryKey,
    queryFn: () => acsServiceApi.getDialConfig(),
    ...queryOptions,
  });
};

export const useCreateFailCode = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: acsServiceApi.createFailCode, ...mutationOptions });
};

export const useUpdateFailCode = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: acsServiceApi.updateFailCode, ...mutationOptions });
};

export const useDeleteFailCode = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: acsServiceApi.deleteFailCode, ...mutationOptions });
};

export const useUpdateAreaConfig = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: acsServiceApi.updateAreaConfig, ...mutationOptions });
};

// ─── 시스템 제어 ──────────────────────────────────────────────

export const useGetSystemControls = ({ params, queryOptions }: QueryHookWithParamsOptions<AcsSystemControl[]> = {}) => {
  return useQuery({
    queryKey: acsServiceQueryKeys.getSystemControls(params).queryKey,
    queryFn: () => acsServiceApi.getSystemControls(params as { acsId?: number }),
    ...queryOptions,
  });
};

export const useUpdateBlockState = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: acsServiceApi.updateBlockState, ...mutationOptions });
};
