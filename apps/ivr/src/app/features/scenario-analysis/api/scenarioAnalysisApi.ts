/**
 * 시나리오 분석 결과(AS-IS IPR20S6050/IPR20S6070) API 클라이언트
 * BFF Aggregation Flow 기반 (V112/V113 마이그레이션 등록).
 *
 * 등록된 flow (TB_BT_CM_AGG_FLOW_MST):
 * - ivr-scenario-analysis-menu-list:   GET 시나리오별 메뉴관리 목록 (serviceId, serviceVer)
 * - ivr-scenario-analysis-code-list:   GET 시나리오 코드관리 목록 (serviceId, serviceVer)
 * - ivr-scenario-analysis-menu-update: PUT 메뉴명/표시여부/주요서비스 갱신 (serviceId, serviceVer, menuId + body)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { ScenarioAnalysisCodeRow, ScenarioAnalysisMenuRow } from '../types';

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
};
