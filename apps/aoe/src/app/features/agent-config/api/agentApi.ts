import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { AgentCreateDatas, AgentItem, AgentListItem, AgentUpdateDatas } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const agentApi = {
  getAgents: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ListResponse<AgentListItem>>('/agents', { params });
    return extractList(response);
  },
  getAgent: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<DetailResponse<AgentItem>>('/agent', { params });
    return extractDetail(response);
  },
  createAgent: async (data: AgentCreateDatas) => {
    const response = await apiClient.post('/agent', data);
    return response;
  },
  updateAgent: async ({ agentId, data }: { agentId: string; data: AgentUpdateDatas }) => {
    const response = await apiClient.patch(`/agent/${agentId}`, data);
    return response;
  },
  deleteAgent: async (agentId: string) => {
    const response = await apiClient.delete(`/agent/${agentId}`);
    return response;
  },
};
