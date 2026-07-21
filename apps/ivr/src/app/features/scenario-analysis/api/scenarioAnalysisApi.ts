/**
 * 시나리오 분석 결과(AS-IS IPR20S6050/IPR20S6070/IPR20S6075/IPR20S6076/IPR20S6077) API 클라이언트
 * BFF Aggregation Flow 기반 (V112/V113/V114/V115 마이그레이션 등록).
 *
 * 등록된 flow (TB_BT_CM_AGG_FLOW_MST):
 * - ivr-scenario-analysis-menu-list:               GET 시나리오별 메뉴관리 목록 (serviceId, serviceVer)
 * - ivr-scenario-analysis-code-list:               GET 시나리오 코드관리 목록 (serviceId, serviceVer)
 * - ivr-scenario-analysis-menu-update:             PUT 메뉴명/표시여부/주요서비스 갱신 (serviceId, serviceVer, menuId + body)
 * - ivr-scenario-analysis-tracking-item-list:      GET 트래킹 아이템 목록 (serviceId, serviceVer)
 * - ivr-scenario-analysis-packet-list:             GET 패킷 마스터 목록 (serviceId, serviceVer)
 * - ivr-scenario-analysis-packet-item-list:        GET 선택 패킷 항목 상세 (serviceId, serviceVer, packetId)
 * - ivr-scenario-analysis-user-stat-category-list: GET 사용자정의통계 카테고리 목록 (serviceId, serviceVer)
 * - ivr-scenario-analysis-user-stat-item-list:     GET 선택 카테고리 항목 상세 (serviceId, serviceVer, categoryId)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  ScenarioAnalysisCodeRow,
  ScenarioAnalysisMenuRow,
  ScenarioAnalysisPacketItemRow,
  ScenarioAnalysisPacketRow,
  ScenarioAnalysisTrackingItemRow,
  ScenarioAnalysisUserStatCategoryRow,
  ScenarioAnalysisUserStatItemRow,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export interface ScenarioAnalysisMenuUpdateParams {
  serviceId: number;
  serviceVer: string;
  menuId: string;
  menuName: string;
  visibleYn: number;
  majorYn: number;
}

export const scenarioAnalysisApi = {
  getMenus: async (params: { serviceId: number; serviceVer: string }): Promise<ScenarioAnalysisMenuRow[]> => {
    const response = await apiClient.get<ApiResponse<{ value: ScenarioAnalysisMenuRow[] }>>('/ivr-scenario-analysis-menu-list', { params });
    return response.data?.data?.value ?? [];
  },

  getCodes: async (params: { serviceId: number; serviceVer: string }): Promise<ScenarioAnalysisCodeRow[]> => {
    const response = await apiClient.get<ApiResponse<{ value: ScenarioAnalysisCodeRow[] }>>('/ivr-scenario-analysis-code-list', { params });
    return response.data?.data?.value ?? [];
  },

  /** 버전 스코프(serviceId+serviceVer+menuId) 갱신 — AS-IS updScenarioMenu(수정 팝업 저장)와 동일. */
  updateMenu: async ({ serviceId, serviceVer, menuId, menuName, visibleYn, majorYn }: ScenarioAnalysisMenuUpdateParams): Promise<void> => {
    await apiClient.put('/ivr-scenario-analysis-menu-update', { menuName, visibleYn, majorYn }, { params: { serviceId, serviceVer, menuId } });
  },

  getTrackingItems: async (params: { serviceId: number; serviceVer: string }): Promise<ScenarioAnalysisTrackingItemRow[]> => {
    const response = await apiClient.get<ApiResponse<{ value: ScenarioAnalysisTrackingItemRow[] }>>('/ivr-scenario-analysis-tracking-item-list', { params });
    return response.data?.data?.value ?? [];
  },

  getPackets: async (params: { serviceId: number; serviceVer: string }): Promise<ScenarioAnalysisPacketRow[]> => {
    const response = await apiClient.get<ApiResponse<{ value: ScenarioAnalysisPacketRow[] }>>('/ivr-scenario-analysis-packet-list', { params });
    return response.data?.data?.value ?? [];
  },

  getPacketItems: async (params: { serviceId: number; serviceVer: string; packetId: string }): Promise<ScenarioAnalysisPacketItemRow[]> => {
    const response = await apiClient.get<ApiResponse<{ value: ScenarioAnalysisPacketItemRow[] }>>('/ivr-scenario-analysis-packet-item-list', { params });
    return response.data?.data?.value ?? [];
  },

  getUserStatCategories: async (params: { serviceId: number; serviceVer: string }): Promise<ScenarioAnalysisUserStatCategoryRow[]> => {
    const response = await apiClient.get<ApiResponse<{ value: ScenarioAnalysisUserStatCategoryRow[] }>>('/ivr-scenario-analysis-user-stat-category-list', { params });
    return response.data?.data?.value ?? [];
  },

  getUserStatItems: async (params: { serviceId: number; serviceVer: string; categoryId: string }): Promise<ScenarioAnalysisUserStatItemRow[]> => {
    const response = await apiClient.get<ApiResponse<{ value: ScenarioAnalysisUserStatItemRow[] }>>('/ivr-scenario-analysis-user-stat-item-list', { params });
    return response.data?.data?.value ?? [];
  },
};
