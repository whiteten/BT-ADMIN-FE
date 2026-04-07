import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions } from '@/shared-util';
import { dataRetentionApi } from '../api/dataRetentionApi';

export const dataRetentionQueryKeys = createQueryKeys('dataRetention', {
  policies: null,
  targets: (policyId: number) => [policyId],
  logs: (params: { policyId: number; page: number; size: number }) => [params],
});

export const useGetRetentionPolicies = () => {
  return useQuery({
    queryKey: dataRetentionQueryKeys.policies.queryKey,
    queryFn: () => dataRetentionApi.getPolicies(),
  });
};

export const useGetRetentionTargets = (policyId: number | null) => {
  return useQuery({
    queryKey: dataRetentionQueryKeys.targets(policyId ?? 0).queryKey,
    queryFn: () => dataRetentionApi.getPolicyTargets(policyId as number),
    enabled: policyId !== null,
  });
};

export const useGetRetentionLogs = (params: { policyId: number; page: number; size: number }, enabled = true) => {
  return useQuery({
    queryKey: dataRetentionQueryKeys.logs(params).queryKey,
    queryFn: () => dataRetentionApi.getLogs(params),
    enabled,
  });
};

export const useUpdateRetentionPolicies = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: dataRetentionApi.updatePolicies,
    ...mutationOptions,
  });
};

export const useExecuteRetentionNow = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: dataRetentionApi.executeNow,
    ...mutationOptions,
  });
};
