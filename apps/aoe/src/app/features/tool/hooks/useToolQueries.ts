import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { toolApi } from '../api/toolApi';
import type { ToolCreateDatas, ToolGroup, ToolGroupCreateDatas, ToolItem } from '../types';

export const toolQueryKeys = createAppQueryKeys('tools', {
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

/**
 * 도구 그룹 목록 + 각 그룹별 도구 목록을 한꺼번에 fan-out fetch.
 * LLM 노드의 도구 트리 선택 UI에서 전체 그룹·도구 트리를 한 번에 구성하기 위한 집계 훅.
 */
export const useGetAllTools = () => {
  // LLM 노드 속성 패널을 다시 열 때마다 재요청하지 않도록 캐싱(5분).
  const cacheOptions = { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 };
  const { data: groups = [], isLoading: isLoadingGroups } = useGetToolGroups({ queryOptions: cacheOptions });

  const toolQueries = useQueries({
    queries: groups.map((group) => ({
      queryKey: toolQueryKeys.getTools({ groupId: group.groupId }).queryKey,
      queryFn: () => toolApi.getTools({ groupId: group.groupId }),
      enabled: !!group.groupId,
      ...cacheOptions,
    })),
  });

  const toolsByGroup: Record<string, ToolItem[]> = {};
  groups.forEach((group, idx) => {
    toolsByGroup[group.groupId] = toolQueries[idx]?.data ?? [];
  });

  const isLoadingTools = toolQueries.some((q) => q.isLoading);

  return { groups, toolsByGroup, isLoading: isLoadingGroups || isLoadingTools };
};
