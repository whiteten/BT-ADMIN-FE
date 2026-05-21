/**
 * ADN 설정 React Query 훅.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { adnApi } from '../api/adnApi';
import type { AdnCopyRequest, AdnCreateRequest, AdnExcelImportResult, AdnResponse, AdnTenantStat, AdnUpdateRequest } from '../types';

export const adnQueryKeys = createQueryKeys('adns', {
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (id?: number) => [id],
  getTenants: null,
});

// ─── Queries ────────────────────────────────────────────────────────────────

export const useGetAdns = ({ params, queryOptions }: QueryHookWithParamsOptions<AdnResponse[]> = {}) => {
  return useQuery({
    queryKey: adnQueryKeys.getList(params).queryKey,
    queryFn: () => adnApi.getList(params),
    ...queryOptions,
  });
};

export const useGetAdnDetail = (id: number | null | undefined, { queryOptions }: QueryHookOptions<AdnResponse> = {}) => {
  return useQuery({
    queryKey: adnQueryKeys.getDetail(id ?? undefined).queryKey,
    queryFn: () => adnApi.getDetail(id as number),
    enabled: !!id,
    ...queryOptions,
  });
};

export const useGetAdnTenants = ({ queryOptions }: QueryHookOptions<AdnTenantStat[]> = {}) => {
  return useQuery({
    queryKey: adnQueryKeys.getTenants.queryKey,
    queryFn: () => adnApi.getTenants(),
    ...queryOptions,
  });
};

// ─── Mutations ──────────────────────────────────────────────────────────────

export const useCreateAdn = ({ mutationOptions }: MutationHookOptions<AdnResponse, AdnCreateRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdnCreateRequest) => adnApi.create(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: adnQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: adnQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateAdn = ({ mutationOptions }: MutationHookOptions<AdnResponse, { id: number; body: AdnUpdateRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: AdnUpdateRequest }) => adnApi.update(id, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: adnQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: adnQueryKeys.getDetail._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteAdns = ({ mutationOptions }: MutationHookOptions<void, number[]> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => adnApi.deleteBatch(ids),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: adnQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: adnQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useCopyAdn = ({ mutationOptions }: MutationHookOptions<AdnResponse[], AdnCopyRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdnCopyRequest) => adnApi.copy(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: adnQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: adnQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useImportAdnExcel = ({ mutationOptions }: MutationHookOptions<AdnExcelImportResult, File> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => adnApi.importExcel(file),
    ...mutationOptions,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: adnQueryKeys.getList._def });
      qc.invalidateQueries({ queryKey: adnQueryKeys.getTenants.queryKey });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};
