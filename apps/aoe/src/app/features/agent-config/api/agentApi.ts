import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { AgentCreateDatas, AgentDeleteDatas, AgentItem, AgentListItem, AgentTestRequest, AgentType, AgentUpdateDatas, AoeStudioInfo } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const agentApi = {
  getAgents: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ListResponse<AgentListItem>>('/aoe-agents-list', { params });
    return extractList(response);
  },
  getAgent: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<DetailResponse<AgentItem>>('/aoe-agents-detail', { params });
    return extractDetail(response);
  },
  createAgent: async (data: AgentCreateDatas) => {
    const response = await apiClient.post('/aoe-agents-create', data);
    return response;
  },
  updateAgent: async ({ agentId, data }: { agentId: string; data: AgentUpdateDatas }) => {
    const response = await apiClient.put('/aoe-agents-update', data, { params: { agentId } });
    return response;
  },
  deleteAgent: async (params: AgentDeleteDatas) => {
    const response = await apiClient.delete('/aoe-agents-delete', { params });
    return response;
  },
  getAgentTypes: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ListResponse<AgentType>>('/agent-types', { params });
    return extractList(response);
  },
  testAgent: async ({ agentId, body }: AgentTestRequest) => {
    const response = await apiClient.post<DetailResponse<{ result: string }>>('/aoe-agents-test', body, { params: { agentId } });
    return extractDetail(response);
  },
  refreshAgent: async ({ agentId, body }: AgentTestRequest) => {
    const response = await apiClient.post<DetailResponse<{ result: string }>>('/aoe-agents-refresh', body, { params: { agentId } });
    return extractDetail(response);
  },
  getAoeStudioInfo: async (params: Record<string, unknown>): Promise<AoeStudioInfo> => {
    const response = await apiClient.get<DetailResponse<AoeStudioInfo>>('/aoe-studio-info', { params });
    return extractDetail(response);
  },
};
