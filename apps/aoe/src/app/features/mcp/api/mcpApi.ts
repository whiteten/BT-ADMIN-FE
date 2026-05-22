import ApiClient, { type ApiResponse } from '@/shared-util';
import type { McpApiItem, McpCreateDatas, McpItem, McpUpdateDatas } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const mcpApi = {
  getMcpList: async () => {
    const response = await apiClient.get<ApiResponse<{ items: McpItem[] }>>('/aoe-mcp-list');
    return response.data?.data?.items ?? [];
  },
  getMcpTools: async (params: { serverName: string }) => {
    // 응답은 page 형식 (data.items[]) — items 추출
    const response = await apiClient.get<ApiResponse<{ items: McpApiItem[] }>>('/aoe-mcp-tools', { params });
    return response.data?.data?.items ?? [];
  },
  createMcp: async (data: McpCreateDatas) => {
    await apiClient.post('/aoe-mcp-create', data);
  },
  updateMcp: async ({ params, data }: { params: { mcpId: string }; data: McpUpdateDatas }) => {
    await apiClient.put('/aoe-mcp-update', data, { params });
  },
  deleteMcp: async (params: { mcpId: string }) => {
    await apiClient.delete('/aoe-mcp-delete', { params });
  },
};
