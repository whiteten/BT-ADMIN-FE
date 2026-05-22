/**
 * 테넌트 할당 관리 API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - manager-node-alloc-list:              GET    테넌트 할당 목록 조회
 * - manager-node-alloc-detail:            GET    테넌트 할당 상세 조회
 * - manager-node-alloc-create:            POST   테넌트 할당 등록
 * - manager-node-alloc-update:            PUT    테넌트 할당 수정
 * - manager-node-alloc-delete:            DELETE 테넌트 할당 삭제
 * - manager-node-cluster-config:          GET    클러스터 설정 조회
 * - manager-node-cluster-config-update:   PUT    클러스터 설정 수정
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  ClusterConfig,
  ClusterConfigBackendResponse,
  ClusterConfigUpdateData,
  TenantAllocBackendResponse,
  TenantAllocCreateData,
  TenantAllocDetail,
  TenantAllocDetailBackendResponse,
  TenantAllocItem,
  TenantAllocLicenseItem,
  TenantAllocUpdateData,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * 백엔드 Map<String, Integer> 라이선스를 배열로 변환
 * {"10": 99999, "11": 1200} → [{licenseKind: 10, licenseAmt: 99999}, ...]
 */
function transformLicenses(licensesMap: Record<string, number> | null): TenantAllocLicenseItem[] {
  if (!licensesMap) return [];
  return Object.entries(licensesMap).map(([kind, amt]) => ({
    licenseKind: Number(kind),
    licenseAmt: amt,
  }));
}

/**
 * 백엔드 응답을 프론트엔드 TenantAllocItem으로 변환
 */
function transformTenantAlloc(raw: TenantAllocBackendResponse): TenantAllocItem {
  return {
    nodeId: raw.nodeId,
    tenantId: raw.tenantId,
    tenantName: raw.tenantName,
    autoObYn: raw.autoObYn,
    validExtDigits: raw.validExtDigits,
    acwDuration: raw.acwDuration,
    licenses: transformLicenses(raw.licenses),
  };
}

/**
 * 백엔드 응답을 프론트엔드 ClusterConfig으로 변환
 */
function transformClusterConfig(raw: ClusterConfigBackendResponse): ClusterConfig {
  return {
    nodeId: raw.nodeId,
    clusterGrpId: raw.clusterGrpId,
    ieSvcIp: raw.ieSvcIp,
    ieAsideIp: raw.ieAsideIp,
    ieBsideIp: raw.ieBsideIp,
    ieForceDr: raw.ieForceDr,
    iePassiveDr: raw.iePassiveDr,
    icAsideIp: raw.icAsideIp,
    icBsideIp: raw.icBsideIp,
    icForceDr: raw.icForceDr,
    icPassiveDr: raw.icPassiveDr,
    gsPrimaryAsideIp: raw.gsPrimaryAsideIp,
    gsPrimaryBsideIp: raw.gsPrimaryBsideIp,
    gsSecondAsideIp: raw.gsSecondAsideIp,
    gsSecondBsideIp: raw.gsSecondBsideIp,
    diPrimaryAsideIp: raw.diPrimaryAsideIp,
    diPrimaryBsideIp: raw.diPrimaryBsideIp,
    diSecondAsideIp: raw.diSecondAsideIp,
    diSecondBsideIp: raw.diSecondBsideIp,
  };
}

export const tenantAllocApi = {
  /**
   * 테넌트 할당 목록 조회
   * @flow manager-node-alloc-list
   */
  getTenantAllocs: async (params: Record<string, unknown>): Promise<TenantAllocItem[]> => {
    const response = await apiClient.get<ApiResponse<{ value: TenantAllocBackendResponse[] }>>('/manager-node-alloc-list', { params });
    const rawList = response.data?.data?.value ?? [];
    return rawList.map(transformTenantAlloc);
  },

  /**
   * 테넌트 할당 상세 조회
   * @flow manager-node-alloc-detail
   */
  getTenantAllocDetail: async (params: Record<string, unknown>): Promise<TenantAllocDetail> => {
    const response = await apiClient.get<ApiResponse<TenantAllocDetailBackendResponse>>('/manager-node-alloc-detail', { params });
    return response.data?.data;
  },

  /**
   * 테넌트 할당 등록
   * @flow manager-node-alloc-create
   */
  createTenantAlloc: async ({ nodeId, data }: { nodeId: number; data: TenantAllocCreateData }) => {
    const response = await apiClient.post('/manager-node-alloc-create', data, { params: { nodeId } });
    return response;
  },

  /**
   * 테넌트 할당 수정
   * @flow manager-node-alloc-update
   */
  updateTenantAlloc: async ({ nodeId, tenantId, data }: { nodeId: number; tenantId: number; data: TenantAllocUpdateData }) => {
    const response = await apiClient.put('/manager-node-alloc-update', data, { params: { nodeId, tenantId } });
    return response;
  },

  /**
   * 테넌트 할당 삭제
   * @flow manager-node-alloc-delete
   */
  deleteTenantAlloc: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/manager-node-alloc-delete', { params });
    return response;
  },

  /**
   * 클러스터 설정 조회
   * @flow manager-node-cluster-config
   */
  getClusterConfig: async (params: Record<string, unknown>): Promise<ClusterConfig> => {
    const response = await apiClient.get<ApiResponse<ClusterConfigBackendResponse>>('/manager-node-cluster-config', { params });
    const raw = response.data?.data;
    return transformClusterConfig(raw);
  },

  /**
   * 클러스터 설정 수정
   * @flow manager-node-cluster-config-update
   */
  updateClusterConfig: async ({ nodeId, data }: { nodeId: number; data: ClusterConfigUpdateData }) => {
    const response = await apiClient.put('/manager-node-cluster-config-update', data, { params: { nodeId } });
    return response;
  },
};
