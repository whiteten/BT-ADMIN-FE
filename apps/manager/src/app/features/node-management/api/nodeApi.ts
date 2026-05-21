/**
 * 노드 관리 API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - manager-node-list:              GET    노드 목록 조회
 * - manager-node-detail:            GET    노드 상세 조회
 * - manager-node-create:            POST   노드 등록
 * - manager-node-update:            PUT    노드 수정
 * - manager-node-delete:            DELETE 노드 삭제
 * - manager-node-id-check:          GET    노드ID 중복체크
 * - manager-node-name-check:        GET    노드명 중복체크
 * - manager-node-cluster-move:      PUT    노드 클러스터 이동
 */
import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { NodeBackendResponse, NodeClusterMoveData, NodeCreateData, NodeDetail, NodeListItem, NodeUpdateData } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * 백엔드 응답을 프론트엔드 NodeListItem으로 변환
 */
function transformNodeListItem(raw: NodeBackendResponse): NodeListItem {
  return {
    nodeId: raw.nodeId,
    centerId: raw.centerId,
    nodeName: raw.nodeName,
    nodeAlias: raw.nodeAlias,
    regionNum: raw.regionNum,
    mainJob: raw.mainJob,
    natOption: raw.natOption,
    msGroupId: raw.msGroupId,
    msGroupName: raw.msGroupName,
    clusterGrpId: raw.clusterGrpId,
    clusterGrpName: raw.clusterGrpName,
    tenantNames: raw.tenantNames,
  };
}

/**
 * 백엔드 응답을 프론트엔드 NodeDetail로 변환
 */
function transformNodeDetail(raw: NodeBackendResponse): NodeDetail {
  return {
    nodeId: raw.nodeId,
    centerId: raw.centerId,
    nodeName: raw.nodeName,
    nodeAlias: raw.nodeAlias,
    regionNum: raw.regionNum,
    mainJob: raw.mainJob,
    natOption: raw.natOption,
    mcsBkNodeId: raw.mcsBkNodeId,
    mcsBkGsaIpv4Address: raw.mcsBkGsaIpv4Address,
    mcsBkGsbIpv4Address: raw.mcsBkGsbIpv4Address,
    mcsBkRouteRatio: raw.mcsBkRouteRatio,
    mcsIcdownUseYn: raw.mcsIcdownUseYn,
    mcsIedownUseYn: raw.mcsIedownUseYn,
    mcsBkRouteMethod: raw.mcsBkRouteMethod,
    externalIpAddr: raw.externalIpAddr,
    enatOption: raw.enatOption,
    msGroupId: raw.msGroupId,
    msGroupName: raw.msGroupName,
    clusterGrpId: raw.clusterGrpId,
    clusterGrpName: raw.clusterGrpName,
    tenantNames: raw.tenantNames,
  };
}

export const nodeApi = {
  /**
   * 노드 목록 조회
   * @flow manager-node-list
   */
  getNodes: async (params?: Record<string, unknown>): Promise<NodeListItem[]> => {
    const response = await apiClient.get<ListResponse<NodeBackendResponse>>('/manager-node-list', { params });
    const rawList = extractList(response);
    return rawList.map(transformNodeListItem);
  },

  /**
   * 노드 상세 조회
   * @flow manager-node-detail
   */
  getNode: async (params: Record<string, unknown>): Promise<NodeDetail> => {
    const response = await apiClient.get<DetailResponse<NodeBackendResponse>>('/manager-node-detail', { params });
    const raw = extractDetail(response);
    return transformNodeDetail(raw);
  },

  /**
   * 노드 등록
   * @flow manager-node-create
   */
  createNode: async (data: NodeCreateData): Promise<NodeListItem> => {
    const response = await apiClient.post<DetailResponse<NodeBackendResponse>>('/manager-node-create', data);
    return transformNodeListItem(extractDetail(response));
  },

  /**
   * 노드 수정
   * @flow manager-node-update
   */
  updateNode: async ({ id, data }: { id: number; data: NodeUpdateData }): Promise<NodeListItem> => {
    const response = await apiClient.put<DetailResponse<NodeBackendResponse>>('/manager-node-update', data, { params: { nodeId: id } });
    return transformNodeListItem(extractDetail(response));
  },

  /**
   * 노드 삭제
   * @flow manager-node-delete
   */
  deleteNode: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/manager-node-delete', { params });
    return response;
  },

  /**
   * 노드ID 중복체크
   * @flow manager-node-id-check
   */
  checkNodeId: async (params: Record<string, unknown>): Promise<boolean> => {
    const response = await apiClient.get<DetailResponse<{ value: boolean }>>('/manager-node-id-check', { params });
    return extractDetail(response)?.value ?? false;
  },

  /**
   * 노드명 중복체크
   * @flow manager-node-name-check
   */
  checkNodeName: async (params: Record<string, unknown>): Promise<boolean> => {
    const response = await apiClient.get<DetailResponse<{ value: boolean }>>('/manager-node-name-check', { params });
    return extractDetail(response)?.value ?? false;
  },

  /**
   * 노드 클러스터 이동
   * @flow manager-node-cluster-move
   */
  moveNodeCluster: async ({ id, data }: { id: number; data: NodeClusterMoveData }) => {
    const response = await apiClient.put('/manager-node-cluster-move', data, { params: { nodeId: id } });
    return response;
  },
};
