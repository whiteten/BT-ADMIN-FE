import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type { McpApiItem, McpCreateDatas, McpItem, McpUpdateDatas } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const mcpApi = {
  getMcpList: async () => {
    const response = await apiClient.get<ListResponse<McpItem>>('/aoe-mcp-list');
    return extractList(response);
  },
  getMcpTools: async (params: { serverName: string }) => {
    // 응답은 page 형식 (data.items[]) — extractList 로 items 추출
    const response = await apiClient.get<ListResponse<McpApiItem>>('/aoe-mcp-tools', { params });
    return extractList(response);
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
