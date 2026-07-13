/**
 * 노드 스코프(노드-테넌트 매핑) 공통 API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - ipron-node-tenants: GET 노드-테넌트 매핑 조회 (공통, 인증만 요구)
 *
 * 서버는 비-시스템관리자에게 자기 테넌트에 매핑된 노드만 내려준다.
 * 기능별로 흩어진 기존 node-tenants flow(ipron-dod-trans-node-tenants 등)를 대체하는
 * 공통 진입점이며, 신규 화면은 이 API 를 사용한다.
 */
import ApiClient, { type ApiResponse } from '@/shared-util';

export interface NodeTenantItem {
  nodeId: number;
  nodeName: string;
  tenantId: number;
  tenantName: string;
}

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const nodeScopeApi = {
  /**
   * 노드-테넌트 매핑 조회
   * Backend: ApiResponse<List<NodeTenantItem>> -> BFF: data.value[]
   * @flow ipron-node-tenants
   */
  getNodeTenants: async (): Promise<NodeTenantItem[]> => {
    const response = await apiClient.get<ApiResponse<{ value: NodeTenantItem[] }>>('/ipron-node-tenants');
    return response.data?.data?.value ?? [];
  },
};
