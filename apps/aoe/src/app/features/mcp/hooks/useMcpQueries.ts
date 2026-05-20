import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { mcpApi } from '../api/mcpApi';
import type { McpApiItem, McpCreateDatas, McpItem, McpUpdateDatas } from '../types';

export const mcpQueryKeys = createQueryKeys('mcp', {
  getMcpList: (params?: Record<string, unknown>) => [params],
  getMcpTools: (params: { serverName: string }) => [params],
});

export const useGetMcpList = ({ queryOptions }: QueryHookWithParamsOptions<McpItem[]> = {}) => {
  return useQuery({
    queryKey: mcpQueryKeys.getMcpList().queryKey,
    queryFn: () => mcpApi.getMcpList(),
    ...queryOptions,
  });
};

export const useGetMcpTools = ({ params, queryOptions }: QueryHookWithParamsOptions<McpApiItem[]> & { params: { serverName: string } }) => {
  return useQuery({
    queryKey: mcpQueryKeys.getMcpTools(params).queryKey,
    queryFn: () => mcpApi.getMcpTools(params),
    enabled: !!params.serverName,
    ...queryOptions,
  });
};

export const useCreateMcp = ({ mutationOptions }: MutationHookOptions<void, McpCreateDatas> = {}) => {
  return useMutation({
    mutationFn: mcpApi.createMcp,
    ...mutationOptions,
  });
};

export const useUpdateMcp = ({ mutationOptions }: MutationHookOptions<void, { params: { mcpId: string }; data: McpUpdateDatas }> = {}) => {
  return useMutation({
    mutationFn: mcpApi.updateMcp,
    ...mutationOptions,
  });
};

export const useDeleteMcp = ({ mutationOptions }: MutationHookOptions<void, { mcpId: string }> = {}) => {
  return useMutation({
    mutationFn: (params) => mcpApi.deleteMcp(params),
    ...mutationOptions,
  });
};
