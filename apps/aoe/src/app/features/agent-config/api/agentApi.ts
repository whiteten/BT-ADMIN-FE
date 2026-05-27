import ApiClient, { type ApiResponse } from '@/shared-util';
import type { AgentCreateDatas, AgentDeleteDatas, AgentItem, AgentListItem, AgentTestRequest, AgentType, AgentUpdateDatas } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const agentApi = {
  getAgents: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiResponse<{ items: AgentListItem[] }>>('/aoe-agents-list', { params });
    return response.data?.data?.items ?? [];
  },
  getAgent: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiResponse<AgentItem>>('/aoe-agents-detail', { params });
    return response.data?.data;
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
    const response = await apiClient.get<ApiResponse<{ items: AgentType[] }>>('/agent-types', { params });
    return response.data?.data?.items ?? [];
  },
  testAgent: async ({ agentId, body }: AgentTestRequest) => {
    // BE 응답 data 가 단계별 결과로 변경: { execute: { result }, run: { result }, ... } + _steps: string[]
    // 옛 단일 result 응답도 호환 (Record<string, unknown> 으로 풀어서 사용처가 step 키로 접근)
    const response = await apiClient.post<ApiResponse<Record<string, unknown>>>('/aoe-agents-test', body, { params: { agentId } });
    return response.data?.data;
  },
  refreshAgent: async ({ agentId, body }: AgentTestRequest) => {
    const response = await apiClient.post<ApiResponse<Record<string, unknown>>>('/aoe-agents-refresh', body, { params: { agentId } });
    return response.data?.data;
  },
};
