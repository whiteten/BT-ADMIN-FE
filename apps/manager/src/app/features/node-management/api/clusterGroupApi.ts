/**
 * 클러스터 그룹 관리 API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - manager-cluster-group-list:     GET    클러스터 그룹 목록 조회
 * - manager-cluster-group-create:   POST   클러스터 그룹 등록
 * - manager-cluster-group-update:   PUT    클러스터 그룹 수정
 * - manager-cluster-group-delete:   DELETE 클러스터 그룹 삭제
 */
import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { ClusterGroup, ClusterGroupBackendResponse, ClusterGroupCreateData, ClusterGroupUpdateData } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * 백엔드 응답을 프론트엔드 ClusterGroup으로 변환
 */
function transformClusterGroup(raw: ClusterGroupBackendResponse): ClusterGroup {
  return {
    clusterGrpId: raw.clusterGrpId,
    clusterGrpName: raw.clusterGrpName,
    memberCount: raw.memberCount,
  };
}

export const clusterGroupApi = {
  /**
   * 클러스터 그룹 목록 조회
   * @flow manager-cluster-group-list
   */
  getClusterGroups: async (params?: Record<string, unknown>): Promise<ClusterGroup[]> => {
    const response = await apiClient.get<DetailResponse<{ value: ClusterGroupBackendResponse[] }>>('/manager-cluster-group-list', { params });
    const rawList = extractDetail(response)?.value ?? [];
    return rawList.map(transformClusterGroup);
  },

  /**
   * 클러스터 그룹 등록
   * @flow manager-cluster-group-create
   */
  createClusterGroup: async (data: ClusterGroupCreateData): Promise<ClusterGroup> => {
    const response = await apiClient.post<DetailResponse<ClusterGroupBackendResponse>>('/manager-cluster-group-create', data);
    return transformClusterGroup(extractDetail(response));
  },

  /**
   * 클러스터 그룹 수정
   * @flow manager-cluster-group-update
   */
  updateClusterGroup: async ({ id, data }: { id: number; data: ClusterGroupUpdateData }): Promise<ClusterGroup> => {
    const response = await apiClient.put<DetailResponse<ClusterGroupBackendResponse>>('/manager-cluster-group-update', data, { params: { id } });
    return transformClusterGroup(extractDetail(response));
  },

  /**
   * 클러스터 그룹 삭제
   * @flow manager-cluster-group-delete
   */
  deleteClusterGroup: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/manager-cluster-group-delete', { params });
    return response;
  },
};
