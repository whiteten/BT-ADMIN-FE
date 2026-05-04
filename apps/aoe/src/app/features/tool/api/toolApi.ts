import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type { ToolCreateDatas, ToolGroup, ToolGroupCreateDatas, ToolItem } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const toolApi = {
  getToolGroups: async () => {
    const response = await apiClient.get<ListResponse<ToolGroup>>('/aoe-tool-group-list');
    return extractList(response);
  },
  getTools: async (params: { groupId: string }) => {
    const response = await apiClient.get<ListResponse<ToolItem>>('/aoe-tool-list', { params });
    return extractList(response);
  },
  createToolGroup: async (data: ToolGroupCreateDatas) => {
    await apiClient.post('/aoe-tool-group-create', data);
  },
  updateToolGroup: async ({ params, data }: { params: { groupId: string }; data: ToolGroupCreateDatas }) => {
    await apiClient.put('/aoe-tool-group-update', data, { params });
  },
  deleteToolGroup: async (params: { groupId: string }) => {
    await apiClient.delete('/aoe-tool-group-delete', { params });
  },
  createTool: async (data: ToolCreateDatas) => {
    await apiClient.post('/aoe-tool-create', data);
  },
  updateTool: async ({ params, data }: { params: { toolId: string }; data: ToolCreateDatas }) => {
    await apiClient.put('/aoe-tool-update', data, { params });
  },
  deleteTool: async (params: { toolId: string }) => {
    await apiClient.delete('/aoe-tool-delete', { params });
  },
};
