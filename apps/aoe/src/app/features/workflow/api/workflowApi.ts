import ApiClient, { type DetailResponse, extractDetail } from '@/shared-util';
import type { AgentDeployResponse, FlowEdge, FlowNode, NodeDeleteRequest, NodePositionUpdateRequest, WorkflowGraph } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const workflowApi = {
  getGraph: async (params: { agentId: string }) => {
    const response = await apiClient.get<DetailResponse<WorkflowGraph>>('/aoe-workflow-graph', { params });
    return extractDetail(response);
  },
  createNode: async ({ params, data }: { params: { agentId: string }; data: FlowNode }) => {
    const response = await apiClient.post<DetailResponse<FlowNode>>('/aoe-workflow-node-create', data, { params });
    return extractDetail(response);
  },
  deleteNodes: async ({ params, data }: { params: { agentId: string }; data: NodeDeleteRequest }) => {
    await apiClient.delete('/aoe-workflow-node-delete', { params: { ...params, nodeIds: data.nodeIds } });
  },
  updateNodePosition: async ({ params, data }: { params: { agentId: string; nodeId: string }; data: NodePositionUpdateRequest }) => {
    const response = await apiClient.put<DetailResponse<FlowNode>>('/aoe-workflow-node-update-position', data, { params });
    return extractDetail(response);
  },
  createEdge: async ({ params, data }: { params: { agentId: string }; data: FlowEdge }) => {
    const response = await apiClient.post<DetailResponse<FlowEdge>>('/aoe-workflow-edge-create', data, { params });
    return extractDetail(response);
  },
  deleteEdge: async (params: { agentId: string; edgeId: string }) => {
    await apiClient.delete('/aoe-workflow-edge-delete', { params });
  },
  deployAgent: async (params: { agentId: string }) => {
    const response = await apiClient.post<DetailResponse<AgentDeployResponse>>('/aoe-agents-deploy', {}, { params });
    return extractDetail(response);
  },
};
