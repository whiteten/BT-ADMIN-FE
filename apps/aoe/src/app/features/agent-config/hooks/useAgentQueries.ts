import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { agentApi } from '../api/agentApi';
import type { AgentItem, AgentListItem } from '../types';

export const agentQueryKeys = createQueryKeys('agents', {
  getAgents: (params?: Record<string, unknown>) => [params],
  getAgent: (params?: Record<string, unknown>) => [params],
});

export const useGetAgents = ({ params, queryOptions }: QueryHookWithParamsOptions<AgentListItem[]> = {}) => {
  return useQuery({
    queryKey: agentQueryKeys.getAgents(params).queryKey,
    queryFn: () => agentApi.getAgents(params),
    ...queryOptions,
  });
};

export const useGetAgent = ({ params, queryOptions }: QueryHookWithParamsOptions<AgentItem> = {}) => {
  return useQuery({
    queryKey: agentQueryKeys.getAgent(params).queryKey,
    queryFn: () => agentApi.getAgent(params),
    ...queryOptions,
  });
};

export const useCreateAgent = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: agentApi.createAgent,
    ...mutationOptions,
  });
};

export const useUpdateAgent = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: agentApi.updateAgent,
    ...mutationOptions,
  });
};

export const useDeleteAgent = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: agentApi.deleteAgent,
    ...mutationOptions,
  });
};

export const useGetAoeStudioInfo = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: agentApi.getAoeStudioInfo,
    ...mutationOptions,
  });
};
