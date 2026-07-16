/**
 * 시나리오 메뉴 제어(AS-IS IPR30S3035) API 클라이언트
 * BFF Aggregation Flow 기반 (V109 마이그레이션 등록).
 *
 * 등록된 flow (TB_BT_CM_AGG_FLOW_MST):
 * - ivr-scenario-menu-control-list:     GET    시나리오 메뉴 제어 목록 (serviceId, serviceVer, menuName 옵션)
 * - ivr-scenario-menu-control-update:   PUT    시나리오 메뉴 제어 등록/수정 (serviceId, menuId, serviceVer)
 * - ivr-scenario-menu-super-ani-list:   GET    Super ANI 목록
 * - ivr-scenario-menu-super-ani-create: POST   Super ANI 등록
 * - ivr-scenario-menu-super-ani-update: PUT    Super ANI 수정 (ani)
 * - ivr-scenario-menu-super-ani-delete: DELETE Super ANI 삭제 (ani)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  ScenarioMenuControlRow,
  ScenarioMenuControlUpdateRequest,
  ScenarioMenuSuperAni,
  ScenarioMenuSuperAniCreateRequest,
  ScenarioMenuSuperAniUpdateRequest,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const scenarioMenuControlApi = {
  // ─── 시나리오 메뉴 제어 ──────────────────────────────────────────────────

  getScenarioMenuControls: async (params: Record<string, unknown>): Promise<ScenarioMenuControlRow[]> => {
    const response = await apiClient.get<ApiResponse<{ value: ScenarioMenuControlRow[] }>>('/ivr-scenario-menu-control-list', { params });
    return response.data?.data?.value ?? [];
  },

  updateScenarioMenuControl: async ({
    serviceId,
    serviceVer,
    menuId,
    data,
  }: {
    serviceId: number;
    serviceVer: string;
    menuId: string;
    data: ScenarioMenuControlUpdateRequest;
  }): Promise<ScenarioMenuControlRow> => {
    const response = await apiClient.put<ApiResponse<ScenarioMenuControlRow>>('/ivr-scenario-menu-control-update', data, {
      params: { serviceId, serviceVer, menuId },
    });
    return response.data?.data;
  },

  // ─── Super ANI ───────────────────────────────────────────────────────────

  getSuperAnis: async (): Promise<ScenarioMenuSuperAni[]> => {
    const response = await apiClient.get<ApiResponse<{ value: ScenarioMenuSuperAni[] }>>('/ivr-scenario-menu-super-ani-list');
    return response.data?.data?.value ?? [];
  },

  createSuperAni: async (data: ScenarioMenuSuperAniCreateRequest): Promise<ScenarioMenuSuperAni> => {
    const response = await apiClient.post<ApiResponse<ScenarioMenuSuperAni>>('/ivr-scenario-menu-super-ani-create', data);
    return response.data?.data;
  },

  updateSuperAni: async ({ ani, data }: { ani: string; data: ScenarioMenuSuperAniUpdateRequest }): Promise<ScenarioMenuSuperAni> => {
    const response = await apiClient.put<ApiResponse<ScenarioMenuSuperAni>>('/ivr-scenario-menu-super-ani-update', data, {
      params: { ani },
    });
    return response.data?.data;
  },

  deleteSuperAni: async (params: { ani: string }) => {
    return await apiClient.delete('/ivr-scenario-menu-super-ani-delete', { params });
  },
};
