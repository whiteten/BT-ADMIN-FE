import type { AxiosRequestConfig } from 'axios';
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { AgentDeployResponse, AgentVersion, FlowEdge, FlowNode, NodeDeleteRequest, NodePositionUpdateRequest, WorkflowGraph } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const workflowApi = {
  getGraph: async (params: { agentId: string }) => {
    const response = await apiClient.get<ApiResponse<WorkflowGraph>>('/aoe-workflow-graph', { params });
    return response.data?.data;
  },
  createNode: async ({ params, data }: { params: { agentId: string }; data: FlowNode }) => {
    const response = await apiClient.post<ApiResponse<FlowNode>>('/aoe-workflow-node-create', data, { params });
    return response.data?.data;
  },
  deleteNodes: async ({ params, data }: { params: { agentId: string }; data: NodeDeleteRequest }) => {
    await apiClient.delete('/aoe-workflow-node-delete', { params: { ...params, nodeIds: data.nodeIds } });
  },
  updateNodePosition: async ({ params, data }: { params: { agentId: string; nodeId: string }; data: NodePositionUpdateRequest }) => {
    const response = await apiClient.put<ApiResponse<FlowNode>>('/aoe-workflow-node-update-position', data, { params });
    return response.data?.data;
  },
  updateNode: async ({ params, data }: { params: { agentId: string; nodeId: string }; data: FlowNode }) => {
    const response = await apiClient.put<ApiResponse<FlowNode>>('/aoe-workflow-node-update', data, { params });
    return response.data?.data;
  },
  createEdge: async ({ params, data }: { params: { agentId: string }; data: FlowEdge }) => {
    const response = await apiClient.post<ApiResponse<FlowEdge>>('/aoe-workflow-edge-create', data, { params });
    return response.data?.data;
  },
  deleteEdge: async (params: { agentId: string; edgeId: string }) => {
    // skipGlobalHandler — 노드 cascade 삭제 시 같은 엣지가 ReactFlow auto-cascade 와 우리 cascade 양쪽으로 호출돼
    // 한쪽이 404 가 나도 전역 토스트가 안 뜨도록. (정식 옵션이 아닌 escape hatch — local cast 패턴 유지)
    await apiClient.delete('/aoe-workflow-edge-delete', {
      params,
      skipGlobalHandler: true,
    } as AxiosRequestConfig & { skipGlobalHandler: boolean });
  },
  deployAgent: async (params: { agentId: string }) => {
    const response = await apiClient.post<ApiResponse<AgentDeployResponse>>('/aoe-agents-deploy', {}, { params });
    return response.data?.data;
  },
  exportWorkflow: async (params: { agentId: string }) => {
    const response = await apiClient.get<Blob>('/aoe-workflow-export', { params, responseType: 'blob' });
    return response;
  },
  getAgentVersions: async (params: { agentId: string }) => {
    // 목록은 PagedResponse(items) 컨벤션 — getAgents 와 동일하게 items 추출
    const response = await apiClient.get<ApiResponse<{ items: AgentVersion[] }>>('/aoe-agent-version-list', { params });
    return response.data?.data?.items ?? [];
  },
  restoreAgentVersion: async (params: { agentId: string; versionNo: number }) => {
    const response = await apiClient.post<ApiResponse<AgentVersion>>('/aoe-agent-version-restore', {}, { params });
    return response.data?.data;
  },
  updateAgentVersion: async ({ params, data }: { params: { agentId: string; versionNo: number }; data: { memo: string } }) => {
    const response = await apiClient.put<ApiResponse<AgentVersion>>('/aoe-agent-version-update', data, { params });
    return response.data?.data;
  },
  deleteAgentVersion: async (params: { agentId: string; versionNo: number }) => {
    await apiClient.delete('/aoe-agent-version-delete', { params });
  },
};
