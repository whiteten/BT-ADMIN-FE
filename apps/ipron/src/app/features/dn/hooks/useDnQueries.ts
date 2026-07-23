/**
 * DN 관리 React Query 훅 (IPR20S2020)
 * SD-DN-MANAGEMENT.md 설계서 기반
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { dnApi } from '../api/dnApi';
import type {
  CosEffectResponse,
  DnCallTransferResponse,
  DnCountResponse,
  DnOptionsResponse,
  DnRangeItem,
  DnResponse,
  DnScaResponse,
  DnShortDialResponse,
  DnSnrResponse,
  DnSnrTodResponse,
} from '../types';

export const dnQueryKeys = createAppQueryKeys('dns', {
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (id?: number) => [id],
  getCount: (params?: Record<string, unknown>) => [params],
  getOptions: (params?: Record<string, unknown>) => [params],
  getRange: (params?: Record<string, unknown>) => [params],
  getCosEffect: (cosId?: number) => [cosId],
  getSnrList: (dnId?: number) => [dnId],
  getSnrTodList: (dnId?: number, snrId?: number) => [dnId, snrId],
  getScaList: (dnId?: number) => [dnId],
  getCallTransferList: (dnId?: number) => [dnId],
  getShortDialList: (dnId?: number) => [dnId],
});

// ─── List / Detail ─────────────────────────────────────────────────────────

export const useGetDns = ({ params, queryOptions }: QueryHookWithParamsOptions<DnResponse[]> = {}) => {
  return useQuery({
    queryKey: dnQueryKeys.getList(params).queryKey,
    queryFn: () => dnApi.getList(params),
    ...queryOptions,
  });
};

export const useGetDnDetail = (id: number | null | undefined, { queryOptions }: QueryHookOptions<DnResponse> = {}) => {
  return useQuery({
    queryKey: dnQueryKeys.getDetail(id ?? undefined).queryKey,
    queryFn: () => dnApi.getDetail(id!),
    enabled: !!id,
    ...queryOptions,
  });
};

// ─── Aux Queries ───────────────────────────────────────────────────────────

export const useGetDnCount = (params: { tenantId: number } | null, { queryOptions }: QueryHookOptions<DnCountResponse> = {}) => {
  return useQuery({
    queryKey: dnQueryKeys.getCount(params ?? undefined).queryKey,
    queryFn: () => dnApi.getCount(params!),
    enabled: !!params && !!params.tenantId,
    ...queryOptions,
  });
};

export const useGetDnOptions = (params: { nodeId: number; tenantId: number; dnType?: string | null } | null, { queryOptions }: QueryHookOptions<DnOptionsResponse> = {}) => {
  return useQuery({
    queryKey: dnQueryKeys.getOptions(params ?? undefined).queryKey,
    queryFn: () => dnApi.getOptions(params!),
    enabled: !!params && !!params.nodeId && !!params.tenantId,
    ...queryOptions,
  });
};

export const useGetDnCosEffect = (cosId: number | null | undefined, { queryOptions }: QueryHookOptions<CosEffectResponse> = {}) => {
  return useQuery({
    queryKey: dnQueryKeys.getCosEffect(cosId ?? undefined).queryKey,
    queryFn: () => dnApi.getCosEffect(cosId!),
    enabled: !!cosId && cosId > 0,
    ...queryOptions,
  });
};

export const useGetDnRange = (params: { nodeId: number; tenantId: number; dnType: string } | null, { queryOptions }: QueryHookOptions<DnRangeItem[]> = {}) => {
  return useQuery({
    queryKey: dnQueryKeys.getRange(params ?? undefined).queryKey,
    queryFn: () => dnApi.getRange(params!),
    enabled: !!params && !!params.nodeId && !!params.tenantId && !!params.dnType,
    ...queryOptions,
  });
};

// ─── Mutations ─────────────────────────────────────────────────────────────

export const useCreateDn = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: dnApi.create,
    ...mutationOptions,
  });
};

export const useUpdateDn = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: dnApi.update,
    ...mutationOptions,
  });
};

export const useDeleteDns = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: dnApi.deleteBatch,
    ...mutationOptions,
  });
};

export const useBatchCreateDn = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: dnApi.batchCreate,
    ...mutationOptions,
  });
};

export const useCopyDn = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: dnApi.copy,
    ...mutationOptions,
  });
};

export const useAssignDnToProfile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: dnApi.assignDnsToProfile,
    ...mutationOptions,
  });
};

// ─── SNR Queries / Mutations ──────────────────────────────────────────────

export const useGetDnSnrList = (dnId: number | null | undefined, { queryOptions }: QueryHookOptions<DnSnrResponse[]> = {}) => {
  return useQuery({
    queryKey: dnQueryKeys.getSnrList(dnId ?? undefined).queryKey,
    queryFn: () => dnApi.getSnrList(dnId!),
    enabled: !!dnId,
    ...queryOptions,
  });
};

export const useCreateDnSnr = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: dnApi.createSnr, ...mutationOptions });
};

export const useUpdateDnSnr = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: dnApi.updateSnr, ...mutationOptions });
};

export const useDeleteDnSnr = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: dnApi.deleteSnr, ...mutationOptions });
};

// ─── SNR TOD Queries / Mutations ──────────────────────────────────────────

export const useGetDnSnrTodList = (dnId: number | null | undefined, snrId: number | null | undefined, { queryOptions }: QueryHookOptions<DnSnrTodResponse[]> = {}) => {
  return useQuery({
    queryKey: dnQueryKeys.getSnrTodList(dnId ?? undefined, snrId ?? undefined).queryKey,
    queryFn: () => dnApi.getSnrTodList(dnId!, snrId!),
    enabled: !!dnId && !!snrId,
    ...queryOptions,
  });
};

export const useCreateDnSnrTod = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: dnApi.createSnrTod, ...mutationOptions });
};

export const useUpdateDnSnrTod = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: dnApi.updateSnrTod, ...mutationOptions });
};

export const useDeleteDnSnrTod = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: dnApi.deleteSnrTod, ...mutationOptions });
};

// ─── SCA Queries / Mutations ──────────────────────────────────────────────

export const useGetDnScaList = (dnId: number | null | undefined, { queryOptions }: QueryHookOptions<DnScaResponse[]> = {}) => {
  return useQuery({
    queryKey: dnQueryKeys.getScaList(dnId ?? undefined).queryKey,
    queryFn: () => dnApi.getScaList(dnId!),
    enabled: !!dnId,
    ...queryOptions,
  });
};

export const useCreateDnSca = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: dnApi.createSca, ...mutationOptions });
};

export const useUpdateDnSca = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: dnApi.updateSca, ...mutationOptions });
};

export const useDeleteDnSca = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: dnApi.deleteSca, ...mutationOptions });
};

// ─── Call Transfer (조건부 착신 전환) Queries / Mutations ───────────────────

export const useGetDnCallTransferList = (dnId: number | null | undefined, { queryOptions }: QueryHookOptions<DnCallTransferResponse[]> = {}) => {
  return useQuery({
    queryKey: dnQueryKeys.getCallTransferList(dnId ?? undefined).queryKey,
    queryFn: () => dnApi.getCallTransferList(dnId!),
    enabled: !!dnId,
    ...queryOptions,
  });
};

export const useCreateDnCallTransfer = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: dnApi.createCallTransfer, ...mutationOptions });
};

export const useUpdateDnCallTransfer = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: dnApi.updateCallTransfer, ...mutationOptions });
};

export const useDeleteDnCallTransfer = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: dnApi.deleteCallTransfer, ...mutationOptions });
};

// ─── 단축다이얼 (ShortDial) Queries / Mutations ────────────────────────────

export const useGetDnShortDialList = (dnId: number | null | undefined, { queryOptions }: QueryHookOptions<DnShortDialResponse[]> = {}) => {
  return useQuery({
    queryKey: dnQueryKeys.getShortDialList(dnId ?? undefined).queryKey,
    queryFn: () => dnApi.getShortDialList(dnId!),
    enabled: !!dnId,
    ...queryOptions,
  });
};

export const useCreateDnShortDial = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: dnApi.createShortDial, ...mutationOptions });
};

export const useUpdateDnShortDial = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: dnApi.updateShortDial, ...mutationOptions });
};

export const useDeleteDnShortDial = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({ mutationFn: dnApi.deleteShortDial, ...mutationOptions });
};
