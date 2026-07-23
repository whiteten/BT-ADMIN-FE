/**
 * IPT 사용자관리 React Query 훅.
 *
 * invalidate 매트릭스:
 *  - 사용자 변경 (create/update/delete/moveGroup/import) → list + ipt-org tree(userCount)
 *  - DN 할당/해제 → list + detail
 *  - 직급/직책 변경 → levelDuties + list (표시명)
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { iptOrgQueryKeys } from '../../ipt-org/hooks/useIptOrgQueries';
import { iptUserApi } from '../api/iptUserApi';
import type {
  AssignableDn,
  CommonCodeOption,
  IptLevelDuty,
  IptLevelDutyRequest,
  IptUserCreateRequest,
  IptUserGroupMoveRequest,
  IptUserImportResult,
  IptUserResponse,
  IptUserUpdateRequest,
} from '../types';

export const iptUserQueryKeys = createAppQueryKeys('ipt-user', {
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (ieUserId?: number) => [ieUserId],
  getAssignableDns: (ieUserId?: number, dnNo?: string) => [ieUserId, dnNo],
  getLevelDuties: (type?: number) => [type],
  getLevelDutyUsers: (levelDutyId?: number) => [levelDutyId],
  getCommonCodes: null,
});

// ─── Queries ───────────────────────────────────────────────────────────────

export const useGetIptUsers = ({ params, queryOptions }: QueryHookWithParamsOptions<IptUserResponse[]> = {}) => {
  return useQuery({
    queryKey: iptUserQueryKeys.getList(params).queryKey,
    queryFn: () => iptUserApi.getList((params ?? {}) as { tenantId?: number; dnGroupId?: number; userId?: string; userName?: string }),
    // tenantId 없음 = 운영자 전체(view-all) 조회 — params 자체가 준비되면 조회
    enabled: params !== undefined,
    ...queryOptions,
  });
};

export const useGetIptUser = (ieUserId: number | null | undefined, { queryOptions }: QueryHookOptions<IptUserResponse> = {}) => {
  return useQuery({
    queryKey: iptUserQueryKeys.getDetail(ieUserId ?? undefined).queryKey,
    queryFn: () => iptUserApi.getDetail(ieUserId as number),
    enabled: !!ieUserId,
    ...queryOptions,
  });
};

export const useGetAssignableDns = (ieUserId: number | null | undefined, dnNo?: string, { queryOptions }: QueryHookOptions<AssignableDn[]> = {}) => {
  return useQuery({
    queryKey: iptUserQueryKeys.getAssignableDns(ieUserId ?? undefined, dnNo).queryKey,
    queryFn: () => iptUserApi.getAssignableDns(ieUserId as number, dnNo),
    enabled: !!ieUserId,
    ...queryOptions,
  });
};

export const useGetIptLevelDuties = (type?: number, { queryOptions }: QueryHookOptions<IptLevelDuty[]> = {}) => {
  return useQuery({
    queryKey: iptUserQueryKeys.getLevelDuties(type).queryKey,
    queryFn: () => iptUserApi.getLevelDuties(type),
    ...queryOptions,
  });
};

export const useGetIptLevelDutyUsers = (levelDutyId: number | null | undefined, { queryOptions }: QueryHookOptions<string[]> = {}) => {
  return useQuery({
    queryKey: iptUserQueryKeys.getLevelDutyUsers(levelDutyId ?? undefined).queryKey,
    queryFn: () => iptUserApi.getLevelDutyUsers(levelDutyId as number),
    enabled: !!levelDutyId,
    ...queryOptions,
  });
};

/** 사용언어/타임존 공통코드 — 마스터성, staleTime 5분 */
export const useGetIptCommonCodes = ({ queryOptions }: QueryHookOptions<{ localLang: CommonCodeOption[]; timeZone: CommonCodeOption[] }> = {}) => {
  return useQuery({
    queryKey: iptUserQueryKeys.getCommonCodes.queryKey,
    queryFn: () => iptUserApi.getCommonCodes(),
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });
};

// ─── Mutations ─────────────────────────────────────────────────────────────

const invalidateUsers = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: iptUserQueryKeys.getList._def });
  qc.invalidateQueries({ queryKey: iptUserQueryKeys.getDetail._def });
  // 조직 트리 userCount 배지 + 대행 선택기 userCnt 갱신
  qc.invalidateQueries({ queryKey: iptOrgQueryKeys.getTree._def });
  qc.invalidateQueries({ queryKey: iptOrgQueryKeys.getTenants.queryKey });
};

export const useCreateIptUser = ({ mutationOptions }: MutationHookOptions<IptUserResponse, IptUserCreateRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: IptUserCreateRequest) => iptUserApi.create(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateUsers(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateIptUser = ({ mutationOptions }: MutationHookOptions<IptUserResponse, { ieUserId: number; body: IptUserUpdateRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ieUserId, body }: { ieUserId: number; body: IptUserUpdateRequest }) => iptUserApi.update(ieUserId, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateUsers(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteIptUsers = ({ mutationOptions }: MutationHookOptions<void, number[]> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ieUserIds: number[]) => iptUserApi.deleteBatch(ieUserIds),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateUsers(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useMoveIptUserGroup = ({ mutationOptions }: MutationHookOptions<void, IptUserGroupMoveRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: IptUserGroupMoveRequest) => iptUserApi.moveGroup(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateUsers(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useAssignIptUserDn = ({ mutationOptions }: MutationHookOptions<void, { ieUserId: number; dnId: number }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ieUserId, dnId }: { ieUserId: number; dnId: number }) => iptUserApi.assignDn(ieUserId, dnId),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateUsers(qc);
      qc.invalidateQueries({ queryKey: iptUserQueryKeys.getAssignableDns._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUnassignIptUserDn = ({ mutationOptions }: MutationHookOptions<void, number> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ieUserId: number) => iptUserApi.unassignDn(ieUserId),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateUsers(qc);
      qc.invalidateQueries({ queryKey: iptUserQueryKeys.getAssignableDns._def });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

const invalidateLevelDuties = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: iptUserQueryKeys.getLevelDuties._def });
  qc.invalidateQueries({ queryKey: iptUserQueryKeys.getList._def });
};

export const useCreateIptLevelDuty = ({ mutationOptions }: MutationHookOptions<IptLevelDuty, IptLevelDutyRequest> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: IptLevelDutyRequest) => iptUserApi.createLevelDuty(body),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateLevelDuties(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateIptLevelDuty = ({ mutationOptions }: MutationHookOptions<IptLevelDuty, { levelDutyId: number; body: IptLevelDutyRequest }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ levelDutyId, body }: { levelDutyId: number; body: IptLevelDutyRequest }) => iptUserApi.updateLevelDuty(levelDutyId, body),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateLevelDuties(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteIptLevelDuty = ({ mutationOptions }: MutationHookOptions<void, number> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (levelDutyId: number) => iptUserApi.deleteLevelDuty(levelDutyId),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateLevelDuties(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useImportIptUsers = ({ mutationOptions }: MutationHookOptions<IptUserImportResult, { tenantId: number; file: File }> = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { tenantId: number; file: File }) => iptUserApi.importExcel(params),
    ...mutationOptions,
    onSuccess: (...args) => {
      invalidateUsers(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};
