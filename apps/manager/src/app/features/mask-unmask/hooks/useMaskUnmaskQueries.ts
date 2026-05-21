import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions } from '@/shared-util';
import { maskUnmaskApi } from '../api/maskUnmaskApi';
import type { AuditByTargetParams, AuditByUserParams, AuditListParams, UnmaskApproveRequest, UnmaskCreateRequest, UnmaskListParams, UnmaskRejectRequest } from '../types';

export const maskUnmaskQueryKeys = createQueryKeys('maskUnmask', {
  pending: (params: UnmaskListParams) => [params],
  mine: null,
  check: (params: { targetType: string; targetId: string }) => [params],
  audit: (params: AuditListParams) => [params],
  auditByUser: (params: AuditByUserParams) => [params],
  auditByTarget: (params: AuditByTargetParams) => [params],
});

// ───── 검토 큐 / 내 요청 ─────
export const useGetPendingRequests = (params: UnmaskListParams = {}) =>
  useQuery({
    queryKey: maskUnmaskQueryKeys.pending(params).queryKey,
    queryFn: () => maskUnmaskApi.listPending(params),
  });

export const useGetMyRequests = () =>
  useQuery({
    queryKey: maskUnmaskQueryKeys.mine.queryKey,
    queryFn: () => maskUnmaskApi.myRequests(),
  });

export const useUnmaskCheck = (params: { targetType: string; targetId: string } | null) =>
  useQuery({
    queryKey: params ? maskUnmaskQueryKeys.check(params).queryKey : ['maskUnmask', 'check', null],
    queryFn: () => maskUnmaskApi.check(params!),
    enabled: !!params,
  });

// ───── Mutations ─────
const invalidateAll = async (qc: ReturnType<typeof useQueryClient>) => {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ['maskUnmask', 'pending'] }),
    qc.invalidateQueries({ queryKey: ['maskUnmask', 'mine'] }),
    qc.invalidateQueries({ queryKey: ['maskUnmask', 'check'] }),
  ]);
};

export const useCreateUnmaskRequest = ({ mutationOptions }: MutationHookOptions = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UnmaskCreateRequest) => maskUnmaskApi.create(data),
    ...mutationOptions,
    onSuccess: async (...args) => {
      await invalidateAll(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useApproveUnmask = ({ mutationOptions }: MutationHookOptions = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UnmaskApproveRequest) => maskUnmaskApi.approve(data),
    ...mutationOptions,
    onSuccess: async (...args) => {
      await invalidateAll(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useRejectUnmask = ({ mutationOptions }: MutationHookOptions = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UnmaskRejectRequest) => maskUnmaskApi.reject(data),
    ...mutationOptions,
    onSuccess: async (...args) => {
      await invalidateAll(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useRevokeUnmask = ({ mutationOptions }: MutationHookOptions = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: number) => maskUnmaskApi.revoke(requestId),
    ...mutationOptions,
    onSuccess: async (...args) => {
      await invalidateAll(qc);
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

// ───── 감사 로그 ─────
export const useGetAudit = (params: AuditListParams = {}, enabled = true) =>
  useQuery({
    queryKey: maskUnmaskQueryKeys.audit(params).queryKey,
    queryFn: () => maskUnmaskApi.auditList(params),
    enabled,
  });

export const useGetAuditByUser = (params: AuditByUserParams | null) =>
  useQuery({
    queryKey: params ? maskUnmaskQueryKeys.auditByUser(params).queryKey : ['maskUnmask', 'auditByUser', null],
    queryFn: () => maskUnmaskApi.auditByUser(params!),
    enabled: !!params,
  });

export const useGetAuditByTarget = (params: AuditByTargetParams | null) =>
  useQuery({
    queryKey: params ? maskUnmaskQueryKeys.auditByTarget(params).queryKey : ['maskUnmask', 'auditByTarget', null],
    queryFn: () => maskUnmaskApi.auditByTarget(params!),
    enabled: !!params,
  });
