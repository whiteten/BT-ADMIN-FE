import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { toolApi } from '../api/toolApi';
import type { ToolCreateDatas, ToolGroup, ToolGroupCreateDatas, ToolItem } from '../types';

export const toolQueryKeys = createQueryKeys('tools', {
  getToolGroups: (params?: Record<string, unknown>) => [params],
  getTools: (params?: Record<string, unknown>) => [params],
});

export const useGetToolGroups = ({ queryOptions }: QueryHookWithParamsOptions<ToolGroup[]> = {}) => {
  return useQuery({
    queryKey: toolQueryKeys.getToolGroups().queryKey,
    queryFn: () => toolApi.getToolGroups(),
    ...queryOptions,
  });
};

export const useGetTools = ({ params, queryOptions }: QueryHookWithParamsOptions<ToolItem[]> = {}) => {
  return useQuery({
    queryKey: toolQueryKeys.getTools(params).queryKey,
    queryFn: () => toolApi.getTools(params as { groupId: string }),
    enabled: !!params?.groupId,
    ...queryOptions,
  });
};

export const useCreateToolGroup = ({ mutationOptions }: MutationHookOptions<void, ToolGroupCreateDatas> = {}) => {
  return useMutation({
    mutationFn: toolApi.createToolGroup,
    ...mutationOptions,
  });
};

export const useUpdateToolGroup = ({ mutationOptions }: MutationHookOptions<void, { params: { groupId: string }; data: ToolGroupCreateDatas }> = {}) => {
  return useMutation({
    mutationFn: toolApi.updateToolGroup,
    ...mutationOptions,
  });
};

export const useDeleteToolGroup = ({ mutationOptions }: MutationHookOptions<void, { groupId: string }> = {}) => {
  return useMutation({
    mutationFn: (params) => toolApi.deleteToolGroup(params),
    ...mutationOptions,
  });
};

export const useCreateTool = ({ mutationOptions }: MutationHookOptions<void, ToolCreateDatas> = {}) => {
  return useMutation({
    mutationFn: toolApi.createTool,
    ...mutationOptions,
  });
};

export const useUpdateTool = ({ mutationOptions }: MutationHookOptions<void, { params: { toolId: string }; data: ToolCreateDatas }> = {}) => {
  return useMutation({
    mutationFn: toolApi.updateTool,
    ...mutationOptions,
  });
};

export const useDeleteTool = ({ mutationOptions }: MutationHookOptions<void, { toolId: string }> = {}) => {
  return useMutation({
    mutationFn: (params) => toolApi.deleteTool(params),
    ...mutationOptions,
  });
};
