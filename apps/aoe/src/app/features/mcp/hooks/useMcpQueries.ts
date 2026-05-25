import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
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

/**
 * MCP 서버 목록 + 각 서버별 도구 목록을 한꺼번에 fan-out fetch.
 * LLM 노드의 MCP 트리 선택 UI에서 전체 서버·도구 트리를 한 번에 구성하기 위한 집계 훅.
 */
export const useGetAllMcpTools = () => {
  const { data: servers = [], isLoading: isLoadingServers } = useGetMcpList();

  const toolQueries = useQueries({
    queries: servers.map((server) => ({
      queryKey: mcpQueryKeys.getMcpTools({ serverName: server.serverName }).queryKey,
      queryFn: () => mcpApi.getMcpTools({ serverName: server.serverName }),
      enabled: !!server.serverName,
    })),
  });

  const toolsByServer: Record<string, McpApiItem[]> = {};
  servers.forEach((server, idx) => {
    toolsByServer[server.serverName] = toolQueries[idx]?.data ?? [];
  });

  const isLoadingTools = toolQueries.some((q) => q.isLoading);

  return { servers, toolsByServer, isLoading: isLoadingServers || isLoadingTools };
};
