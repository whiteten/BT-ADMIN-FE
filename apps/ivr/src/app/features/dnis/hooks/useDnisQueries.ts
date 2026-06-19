/**
 * IVR DNIS React Query 훅.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { dnisApi } from '../api/dnisApi';
import type { DnisBatchCopyRequest, DnisBatchCopyResult, DnisCreateRequest, DnisExcelImportResult, DnisItem, DnisUpdateRequest } from '../types/dnis.types';

export const dnisQueryKeys = createQueryKeys('ivrDnis', {
  list: (params?: Record<string, unknown>) => [params],
  detail: (params?: Record<string, unknown>) => [params],
  dupCheck: (params?: Record<string, unknown>) => [params],
});

export const useGetDnisList = ({ params, queryOptions }: QueryHookWithParamsOptions<DnisItem[]> = {}) => {
  return useQuery({
    queryKey: dnisQueryKeys.list(params).queryKey,
    queryFn: () => dnisApi.getDnisList(params as { nodeId: number; tenantId: number; dnisNo?: string }),
    ...queryOptions,
  });
};

export const useGetDnis = ({ params, queryOptions }: QueryHookWithParamsOptions<DnisItem> = {}) => {
  return useQuery({
    queryKey: dnisQueryKeys.detail(params).queryKey,
    queryFn: () => dnisApi.getDnis(params as { dnisNo: string; nodeId: number }),
    ...queryOptions,
  });
};

export const useCreateDnis = ({ mutationOptions }: MutationHookOptions<DnisItem, DnisCreateRequest> = {}) => {
  return useMutation<DnisItem, Error, DnisCreateRequest>({ mutationFn: dnisApi.createDnis, ...mutationOptions });
};

export const useUpdateDnis = ({ mutationOptions }: MutationHookOptions<DnisItem, { params: { dnisNo: string; nodeId: number }; data: DnisUpdateRequest }> = {}) => {
  return useMutation<DnisItem, Error, { params: { dnisNo: string; nodeId: number }; data: DnisUpdateRequest }>({
    mutationFn: dnisApi.updateDnis,
    ...mutationOptions,
  });
};

export const useDeleteDnis = ({ mutationOptions }: MutationHookOptions<void, { dnisNo: string; serviceId: number; nodeId: number }> = {}) => {
  return useMutation<void, Error, { dnisNo: string; serviceId: number; nodeId: number }>({
    mutationFn: dnisApi.deleteDnis,
    ...mutationOptions,
  });
};

export const useExcelImportDnis = ({ mutationOptions }: MutationHookOptions<DnisExcelImportResult, DnisCreateRequest[]> = {}) => {
  return useMutation<DnisExcelImportResult, Error, DnisCreateRequest[]>({
    mutationFn: dnisApi.excelImport,
    ...mutationOptions,
  });
};

export const useBatchCopyDnis = ({ mutationOptions }: MutationHookOptions<DnisBatchCopyResult, DnisBatchCopyRequest> = {}) => {
  return useMutation<DnisBatchCopyResult, Error, DnisBatchCopyRequest>({
    mutationFn: dnisApi.batchCopy,
    ...mutationOptions,
  });
};

/** 중복 체크 (실시간 조회 — 폼 입력 시 사용. enabled false 로 명시적 호출). */
export const useDupCheckDnis = ({ params, queryOptions }: QueryHookWithParamsOptions<boolean> = {}) => {
  return useQuery({
    queryKey: dnisQueryKeys.dupCheck(params).queryKey,
    queryFn: () => dnisApi.checkDuplicate(params as { nodeId: number; dnisNo: string }),
    ...queryOptions,
  });
};
