/**
 * HA 다중화 구성 API 클라이언트
 * BFF Aggregation Flow 기반.
 *
 * 등록된 flow (TB_BT_CM_AGG_FLOW_MST):
 * - ivr-hagroup-list:              GET    HA 그룹 목록 (nodeId 옵션)
 * - ivr-hagroup-create:            POST   HA 그룹 등록
 * - ivr-hagroup-update:            PUT    HA 그룹 수정
 * - ivr-hagroup-delete:            DELETE HA 그룹 삭제
 * - ivr-hagroup-available-systems: GET    멤버 후보 시스템 조회 (nodeId, excludeSystemId 옵션)
 * - ivr-hagroup-member-list:       GET    HA 그룹 멤버 목록 (haGroupId)
 * - ivr-hagroup-member-create:     POST   HA 그룹 멤버 등록 (haGroupId)
 * - ivr-hagroup-member-update:     PUT    HA 그룹 멤버 수정 (haGroupId, systemId — 복합키)
 * - ivr-hagroup-member-delete:     DELETE HA 그룹 멤버 삭제 (haGroupId, systemId — 복합키)
 * - manager-node-list:             GET    노드 목록 (cross-service)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { AvailableSystem, HaGroup, HaGroupCreateRequest, HaGroupMember, HaGroupMemberCreateRequest, HaGroupMemberUpdateRequest, HaGroupUpdateRequest } from '../types';

interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const haGroupApi = {
  // ─── HA Group Master ──────────────────────────────────────────────────

  getHaGroups: async (params?: Record<string, unknown>): Promise<HaGroup[]> => {
    const response = await apiClient.get<ApiResponse<{ value: HaGroup[] }>>('/ivr-hagroup-list', { params });
    return response.data?.data?.value ?? [];
  },

  createHaGroup: async (data: HaGroupCreateRequest): Promise<HaGroup> => {
    const response = await apiClient.post<ApiResponse<HaGroup>>('/ivr-hagroup-create', data);
    return response.data?.data;
  },

  updateHaGroup: async ({ id, data }: { id: number; data: HaGroupUpdateRequest }): Promise<HaGroup> => {
    const response = await apiClient.put<ApiResponse<HaGroup>>('/ivr-hagroup-update', data, {
      params: { id },
    });
    return response.data?.data;
  },

  deleteHaGroup: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ivr-hagroup-delete', { params });
  },

  getAvailableSystems: async (params: Record<string, unknown>): Promise<AvailableSystem[]> => {
    const response = await apiClient.get<ApiResponse<{ value: AvailableSystem[] }>>('/ivr-hagroup-available-systems', { params });
    return response.data?.data?.value ?? [];
  },

  // ─── HA Group Member ──────────────────────────────────────────────────

  getHaGroupMembers: async (params: Record<string, unknown>): Promise<HaGroupMember[]> => {
    const response = await apiClient.get<ApiResponse<{ value: HaGroupMember[] }>>('/ivr-hagroup-member-list', { params });
    return response.data?.data?.value ?? [];
  },

  createHaGroupMember: async ({ id, data }: { id: number; data: HaGroupMemberCreateRequest }): Promise<HaGroupMember> => {
    const response = await apiClient.post<ApiResponse<HaGroupMember>>('/ivr-hagroup-member-create', data, {
      params: { id },
    });
    return response.data?.data;
  },

  updateHaGroupMember: async ({ haGroupId, systemId, data }: { haGroupId: number; systemId: number; data: HaGroupMemberUpdateRequest }): Promise<HaGroupMember> => {
    const response = await apiClient.put<ApiResponse<HaGroupMember>>('/ivr-hagroup-member-update', data, {
      params: { id: haGroupId, systemId },
    });
    return response.data?.data;
  },

  deleteHaGroupMember: async (params: Record<string, unknown>) => {
    return await apiClient.delete('/ivr-hagroup-member-delete', { params });
  },

  // ─── Node (cross-service) ───────────────────────────────────────────────

  getNodes: async (): Promise<NodeSimpleResponse[]> => {
    const response = await apiClient.get<ApiResponse<{ items: NodeSimpleResponse[] }>>('/manager-node-list');
    return response.data?.data?.items ?? [];
  },
};
