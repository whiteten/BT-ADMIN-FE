/**
 * COS 설정 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { type DodLimitOption, cosApi } from '../api/cosApi';
import type { Cos } from '../types';

export const cosQueryKeys = createQueryKeys('cos', {
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (cosId?: number) => [cosId],
  getRefCount: (cosId?: number) => [cosId],
  getDodLimits: (tenantId?: number) => [tenantId],
});

// ─── 조회 훅 ──────────────────────────────────────────────────────────────

/**
 * COS 목록 조회 (tenantId 필터)
 */
export const useGetCosList = ({ params, queryOptions }: QueryHookWithParamsOptions<Cos[]> = {}) => {
  return useQuery({
    queryKey: cosQueryKeys.getList(params).queryKey,
    queryFn: () => cosApi.getList(params),
    ...queryOptions,
  });
};

/**
 * COS 상세 조회
 */
export const useGetCosDetail = (cosId?: number, { queryOptions }: QueryHookOptions<Cos> = {}) => {
  return useQuery({
    queryKey: cosQueryKeys.getDetail(cosId).queryKey,
    queryFn: () => cosApi.getDetail(cosId!),
    enabled: !!cosId,
    ...queryOptions,
  });
};

/**
 * COS 참조 DN 수 조회
 */
export const useGetCosRefCount = (cosId?: number, { queryOptions }: QueryHookOptions<number> = {}) => {
  return useQuery({
    queryKey: cosQueryKeys.getRefCount(cosId).queryKey,
    queryFn: () => cosApi.getRefCount(cosId!),
    enabled: !!cosId,
    ...queryOptions,
  });
};

/**
 * 발신제한/허용그룹 목록 (테넌트별 TB_IE_DOD_LIMIT)
 * AS-IS: cbCreate('#poAddDodLimitSvc', 'dod_limit', 'tenantId='+tenantId)
 */
export const useGetDodLimits = (tenantId?: number, { queryOptions }: QueryHookOptions<DodLimitOption[]> = {}) => {
  return useQuery({
    queryKey: cosQueryKeys.getDodLimits(tenantId).queryKey,
    queryFn: () => cosApi.getDodLimits(tenantId!),
    enabled: !!tenantId,
    ...queryOptions,
  });
};

// ─── CUD 훅 ────────────────────────────────────────────────────────────────

/**
 * COS 등록
 */
export const useCreateCos = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: cosApi.create,
    ...mutationOptions,
  });
};

/**
 * COS 수정
 */
export const useUpdateCos = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: cosApi.update,
    ...mutationOptions,
  });
};

/**
 * COS 삭제
 */
export const useDeleteCos = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: cosApi.delete,
    ...mutationOptions,
  });
};

/**
 * COS 일괄 삭제 (벌크 1콜)
 */
export const useDeleteCosBatch = ({ mutationOptions }: MutationHookOptions<void, number[]> = {}) => {
  return useMutation({
    mutationFn: (ids: number[]) => cosApi.deleteBatch(ids),
    ...mutationOptions,
  });
};
