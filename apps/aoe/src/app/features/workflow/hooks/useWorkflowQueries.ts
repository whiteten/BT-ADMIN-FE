import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import dayjs from 'dayjs';
import { type MutationHookOptions, type QueryHookWithParamsOptions, downloadBlob, extractFileName } from '@/shared-util';
import { workflowApi } from '../api/workflowApi';
import type { AgentDeployResponse, FlowEdge, FlowNode, NodeDeleteRequest, NodePositionUpdateRequest, WorkflowGraph } from '../types';

export const workflowQueryKeys = createQueryKeys('workflow', {
  graph: (agentId: string) => [agentId],
});

export const useGetWorkflowGraph = ({ params, queryOptions }: QueryHookWithParamsOptions<WorkflowGraph> & { params: { agentId: string } }) => {
  return useQuery({
    queryKey: workflowQueryKeys.graph(params.agentId).queryKey,
    queryFn: () => workflowApi.getGraph(params),
    enabled: !!params.agentId,
    ...queryOptions,
  });
};

export const useCreateNode = ({ mutationOptions }: MutationHookOptions<FlowNode, { params: { agentId: string }; data: FlowNode }> = {}) => {
  return useMutation({
    mutationFn: workflowApi.createNode,
    ...mutationOptions,
  });
};

export const useDeleteNodes = ({ mutationOptions }: MutationHookOptions<void, { params: { agentId: string }; data: NodeDeleteRequest }> = {}) => {
  return useMutation({
    mutationFn: workflowApi.deleteNodes,
    ...mutationOptions,
  });
};

export const useUpdateNodePosition = ({
  mutationOptions,
}: MutationHookOptions<FlowNode, { params: { agentId: string; nodeId: string }; data: NodePositionUpdateRequest }> = {}) => {
  return useMutation({
    mutationFn: workflowApi.updateNodePosition,
    ...mutationOptions,
  });
};

export const useUpdateNode = ({ mutationOptions }: MutationHookOptions<FlowNode, { params: { agentId: string; nodeId: string }; data: FlowNode }> = {}) => {
  return useMutation({
    mutationFn: workflowApi.updateNode,
    ...mutationOptions,
  });
};

export const useCreateEdge = ({ mutationOptions }: MutationHookOptions<FlowEdge, { params: { agentId: string }; data: FlowEdge }> = {}) => {
  return useMutation({
    mutationFn: workflowApi.createEdge,
    ...mutationOptions,
  });
};

export const useDeleteEdge = ({ mutationOptions }: MutationHookOptions<void, { agentId: string; edgeId: string }> = {}) => {
  return useMutation({
    mutationFn: (params) => workflowApi.deleteEdge(params),
    ...mutationOptions,
  });
};

export const useDeployAgent = ({ mutationOptions }: MutationHookOptions<AgentDeployResponse, { agentId: string }> = {}) => {
  return useMutation({
    mutationFn: (params) => workflowApi.deployAgent(params),
    ...mutationOptions,
  });
};

export const useExportWorkflow = ({ mutationOptions }: MutationHookOptions<void, { agentId: string; agentName?: string }> = {}) => {
  return useMutation({
    mutationFn: async ({ agentId, agentName }: { agentId: string; agentName?: string }) => {
      const response = await workflowApi.exportWorkflow({ agentId });
      const safeName = (agentName ?? agentId).replace(/[\\/:*?"<>|]/g, '_');
      const fallbackName = `${safeName}_${dayjs().format('YYYYMMDD_HHmmss')}.json`;
      const fileName = extractFileName(response.headers['content-disposition'], fallbackName);
      downloadBlob(response.data, fileName);
    },
    ...mutationOptions,
  });
};
