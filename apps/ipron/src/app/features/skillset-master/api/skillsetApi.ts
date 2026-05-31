/**
 * 스킬셋 관리 API 클라이언트.
 *
 * BFF Aggregation Flow (DB seed ipron-skillset-*, 13건):
 *   tenants                      GET    테넌트 stats
 *   list / detail                GET    스킬셋 목록 / 상세
 *   create / update              POST/PUT 스킬셋 등록/수정
 *   delete / delete-batch        DELETE / POST 스킬셋 삭제
 *   groups-list                  GET    업무그룹 트리
 *   groups-create / -update      POST/PUT 그룹 CRUD
 *   groups-delete                DELETE 그룹 삭제 (cascade)
 *   members-reassign             POST   드래그앤드롭 그룹 이동
 *   members-unassign             POST   매핑 해제 (미배정)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  SkillsetCreateRequest,
  SkillsetGroupCreateRequest,
  SkillsetGroupResponse,
  SkillsetGroupUpdateRequest,
  SkillsetMemberReassignRequest,
  SkillsetResponse,
  SkillsetTenantStat,
  SkillsetUpdateRequest,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const skillsetApi = {
  // ─── 스킬셋 마스터 ────────────────────────────────────────────
  getList: async (params?: { tenantId?: number; treeId?: number; activateYn?: number; keyword?: string }): Promise<SkillsetResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: SkillsetResponse[] }>>('/ipron-skillset-list', { params });
    return res.data?.data?.value ?? [];
  },

  getDetail: async (skillsetId: number): Promise<SkillsetResponse> => {
    const res = await apiClient.get<ApiResponse<SkillsetResponse>>('/ipron-skillset-detail', { params: { skillsetId } });
    return res.data?.data;
  },

  getTenants: async (): Promise<SkillsetTenantStat[]> => {
    const res = await apiClient.get<ApiResponse<{ value: SkillsetTenantStat[] }>>('/ipron-skillset-tenants');
    return res.data?.data?.value ?? [];
  },

  create: async (body: SkillsetCreateRequest): Promise<SkillsetResponse> => {
    const res = await apiClient.post<ApiResponse<SkillsetResponse>>('/ipron-skillset-create', body);
    return res.data?.data;
  },

  update: async (skillsetId: number, body: SkillsetUpdateRequest): Promise<SkillsetResponse> => {
    const res = await apiClient.put<ApiResponse<SkillsetResponse>>('/ipron-skillset-update', body, { params: { skillsetId } });
    return res.data?.data;
  },

  remove: async (skillsetId: number): Promise<void> => {
    await apiClient.delete('/ipron-skillset-delete', { params: { skillsetId } });
  },

  deleteBatch: async (skillsetIds: number[]): Promise<number> => {
    const res = await apiClient.post<ApiResponse<{ deleted: number }>>('/ipron-skillset-delete-batch', { skillsetIds });
    return res.data?.data?.deleted ?? 0;
  },

  // ─── 업무그룹 트리 ────────────────────────────────────────────
  getGroups: async (params?: { tenantId?: number }): Promise<SkillsetGroupResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: SkillsetGroupResponse[] }>>('/ipron-skillset-groups-list', { params });
    return res.data?.data?.value ?? [];
  },

  createGroup: async (body: SkillsetGroupCreateRequest): Promise<SkillsetGroupResponse> => {
    const res = await apiClient.post<ApiResponse<SkillsetGroupResponse>>('/ipron-skillset-groups-create', body);
    return res.data?.data;
  },

  updateGroup: async (treeId: number, body: SkillsetGroupUpdateRequest): Promise<SkillsetGroupResponse> => {
    const res = await apiClient.put<ApiResponse<SkillsetGroupResponse>>('/ipron-skillset-groups-update', body, { params: { treeId } });
    return res.data?.data;
  },

  removeGroup: async (treeId: number): Promise<void> => {
    await apiClient.delete('/ipron-skillset-groups-delete', { params: { treeId } });
  },

  // ─── 매핑 ────────────────────────────────────────────────────
  reassignMembers: async (body: SkillsetMemberReassignRequest): Promise<number> => {
    const res = await apiClient.post<ApiResponse<{ processed: number }>>('/ipron-skillset-members-reassign', body);
    return res.data?.data?.processed ?? 0;
  },

  unassignMembers: async (skillsetIds: number[]): Promise<number> => {
    const res = await apiClient.post<ApiResponse<{ deleted: number }>>('/ipron-skillset-members-unassign', { skillsetIds });
    return res.data?.data?.deleted ?? 0;
  },
};
