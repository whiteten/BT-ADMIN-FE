import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { dataRetentionApi } from '../api/dataRetentionApi';

export const dataRetentionQueryKeys = createAppQueryKeys('dataRetention', {
  policies: null,
  targets: (policyId: number) => [policyId],
  logs: (policyId: number) => [policyId],
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

export const useGetRetentionLogs = (policyId: number, enabled = true) => {
  return useQuery({
    queryKey: dataRetentionQueryKeys.logs(policyId).queryKey,
    queryFn: () => dataRetentionApi.getLogs({ policyId, page: 0, size: 10000 }),
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
