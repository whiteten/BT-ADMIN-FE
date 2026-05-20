/**
 * 대표번호별 DNIS 관리 React Query 훅 (IPR20S6043).
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import dayjs from 'dayjs';
import { type MutationHookOptions, type QueryHookOptions, type QueryHookWithParamsOptions, downloadBlob, extractFileName } from '@/shared-util';
import { ivrAinDnisApi } from '../api/ivrAinDnisApi';
import type { IrAinMaster, TenantSimpleResponse } from '../types/ivrAinDnis.types';

export const ivrAinDnisQueryKeys = createQueryKeys('ivrAinDnis', {
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (params?: Record<string, unknown>) => [params],
  getTenants: null,
});

// ─── Queries ────────────────────────────────────────────────────────────────

export const useGetAinList = ({ params, queryOptions }: QueryHookWithParamsOptions<IrAinMaster[]> = {}) => {
  return useQuery({
    queryKey: ivrAinDnisQueryKeys.getList(params).queryKey,
    queryFn: () => ivrAinDnisApi.getList(params ?? {}),
    ...queryOptions,
  });
};

export const useGetAinDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<IrAinMaster> = {}) => {
  return useQuery({
    queryKey: ivrAinDnisQueryKeys.getDetail(params).queryKey,
    queryFn: () =>
      ivrAinDnisApi.getDetail({
        tenantId: Number((params ?? {}).tenantId),
        ainNo: String((params ?? {}).ainNo ?? ''),
        originDnis: String((params ?? {}).originDnis ?? ''),
      }),
    ...queryOptions,
  });
};

export const useGetTenants = ({ queryOptions }: QueryHookOptions<TenantSimpleResponse[]> = {}) => {
  return useQuery({
    queryKey: ivrAinDnisQueryKeys.getTenants.queryKey,
    queryFn: () => ivrAinDnisApi.getTenants(),
    ...queryOptions,
  });
};

// ─── Mutations ──────────────────────────────────────────────────────────────

export const useCreateAin = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrAinDnisApi.create,
    ...mutationOptions,
  });
};

export const useUpdateAin = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrAinDnisApi.update,
    ...mutationOptions,
  });
};

export const useDeleteAin = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrAinDnisApi.remove,
    ...mutationOptions,
  });
};

export const useExportAinDnis = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: async (params: Record<string, unknown>) => {
      const response = await ivrAinDnisApi.exportExcel(params);
      const fileName = extractFileName(response.headers['content-disposition'], `대표번호별DNIS_${dayjs().format('YYYYMMDD')}.xlsx`);
      downloadBlob(response.data, fileName);
    },
    ...mutationOptions,
  });
};

export const useImportAinDnis = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: ivrAinDnisApi.importExcel,
    ...mutationOptions,
  });
};
