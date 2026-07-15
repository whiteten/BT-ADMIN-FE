/**
 * ACS 서비스 관리 API 클라이언트 (AS-IS IPR35S5010).
 * BFF Aggregation Flow 기반.
 *
 * 등록된 flow (TB_BT_CM_AGG_FLOW_MST — V133):
 * - ivr-acs-service-{list,detail,update,use-update,delete}
 * - ivr-acs-worktime-{list,detail,create,update,delete}
 * - ivr-acs-service-worktime-{list,apply,cancel}
 * - ivr-acs-holiday-{list,detail,create,update,delete}
 * - ivr-acs-service-holiday-{list,apply,cancel}
 * - ivr-acs-dialconfig-detail / ivr-acs-failcode-{create,update,delete} / ivr-acs-areaconfig-update
 * - ivr-acs-systemcontrol-list / ivr-acs-blockstate-update
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  AcsAreaConfigUpdateDatas,
  AcsBlockStateItem,
  AcsDialConfig,
  AcsFailCode,
  AcsFailCodeCreateDatas,
  AcsFailCodeUpdateDatas,
  AcsHoliday,
  AcsHolidaySaveDatas,
  AcsService,
  AcsServiceUpdateDatas,
  AcsSystemControl,
  AcsWorktime,
  AcsWorktimeSaveDatas,
} from '../types/acsService.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const acsServiceApi = {
  // ─── ACS 서비스 마스터 ──────────────────────────────────────

  getAcsServices: async (): Promise<AcsService[]> => {
    const response = await apiClient.get<ApiResponse<{ value: AcsService[] }>>('/ivr-acs-service-list');
    return response.data?.data?.value ?? [];
  },

  getAcsService: async (acsId: number): Promise<AcsService> => {
    const response = await apiClient.get<ApiResponse<AcsService>>('/ivr-acs-service-detail', { params: { acsId } });
    return response.data?.data;
  },

  updateAcsService: async ({ acsId, data }: { acsId: number; data: AcsServiceUpdateDatas }): Promise<AcsService> => {
    const response = await apiClient.put<ApiResponse<AcsService>>('/ivr-acs-service-update', data, { params: { acsId } });
    return response.data?.data;
  },

  updateAcsServiceUse: async ({ acsId, useYn }: { acsId: number; useYn: number }) => {
    return await apiClient.put('/ivr-acs-service-use-update', { useYn }, { params: { acsId } });
  },

  deleteAcsService: async (acsId: number) => {
    return await apiClient.delete('/ivr-acs-service-delete', { params: { acsId } });
  },

  // ─── 업무시간 CRUD ─────────────────────────────────────────

  getAcsWorktimes: async (params?: { excludeAcsId?: number }): Promise<AcsWorktime[]> => {
    const response = await apiClient.get<ApiResponse<{ value: AcsWorktime[] }>>('/ivr-acs-worktime-list', { params });
    return response.data?.data?.value ?? [];
  },

  createAcsWorktime: async (data: AcsWorktimeSaveDatas): Promise<AcsWorktime> => {
    const response = await apiClient.post<ApiResponse<AcsWorktime>>('/ivr-acs-worktime-create', data);
    return response.data?.data;
  },

  updateAcsWorktime: async ({ worktimeId, data }: { worktimeId: number; data: AcsWorktimeSaveDatas }): Promise<AcsWorktime> => {
    const response = await apiClient.put<ApiResponse<AcsWorktime>>('/ivr-acs-worktime-update', data, { params: { worktimeId } });
    return response.data?.data;
  },

  deleteAcsWorktime: async (worktimeId: number) => {
    return await apiClient.delete('/ivr-acs-worktime-delete', { params: { worktimeId } });
  },

  // ─── 업무시간 배정/해제 ─────────────────────────────────────

  getAssignedWorktimes: async (acsId: number): Promise<AcsWorktime[]> => {
    const response = await apiClient.get<ApiResponse<{ value: AcsWorktime[] }>>('/ivr-acs-service-worktime-list', { params: { acsId } });
    return response.data?.data?.value ?? [];
  },

  applyWorktimes: async ({ acsId, ids }: { acsId: number; ids: number[] }) => {
    return await apiClient.post('/ivr-acs-service-worktime-apply', { ids }, { params: { acsId } });
  },

  cancelWorktimes: async ({ acsId, ids }: { acsId: number; ids: number[] }) => {
    return await apiClient.post('/ivr-acs-service-worktime-cancel', { ids }, { params: { acsId } });
  },

  // ─── 휴일 CRUD ─────────────────────────────────────────────

  getAcsHolidays: async (params?: { excludeAcsId?: number }): Promise<AcsHoliday[]> => {
    const response = await apiClient.get<ApiResponse<{ value: AcsHoliday[] }>>('/ivr-acs-holiday-list', { params });
    return response.data?.data?.value ?? [];
  },

  createAcsHoliday: async (data: AcsHolidaySaveDatas): Promise<AcsHoliday> => {
    const response = await apiClient.post<ApiResponse<AcsHoliday>>('/ivr-acs-holiday-create', data);
    return response.data?.data;
  },

  updateAcsHoliday: async ({ holiId, data }: { holiId: number; data: AcsHolidaySaveDatas }): Promise<AcsHoliday> => {
    const response = await apiClient.put<ApiResponse<AcsHoliday>>('/ivr-acs-holiday-update', data, { params: { holiId } });
    return response.data?.data;
  },

  deleteAcsHoliday: async (holiId: number) => {
    return await apiClient.delete('/ivr-acs-holiday-delete', { params: { holiId } });
  },

  // ─── 휴일 배정/해제 ─────────────────────────────────────────

  getAssignedHolidays: async (acsId: number): Promise<AcsHoliday[]> => {
    const response = await apiClient.get<ApiResponse<{ value: AcsHoliday[] }>>('/ivr-acs-service-holiday-list', { params: { acsId } });
    return response.data?.data?.value ?? [];
  },

  applyHolidays: async ({ acsId, ids }: { acsId: number; ids: number[] }) => {
    return await apiClient.post('/ivr-acs-service-holiday-apply', { ids }, { params: { acsId } });
  },

  cancelHolidays: async ({ acsId, ids }: { acsId: number; ids: number[] }) => {
    return await apiClient.post('/ivr-acs-service-holiday-cancel', { ids }, { params: { acsId } });
  },

  // ─── 발신 설정 ─────────────────────────────────────────────

  getDialConfig: async (): Promise<AcsDialConfig> => {
    const response = await apiClient.get<ApiResponse<AcsDialConfig>>('/ivr-acs-dialconfig-detail');
    return response.data?.data;
  },

  createFailCode: async (data: AcsFailCodeCreateDatas): Promise<AcsFailCode> => {
    const response = await apiClient.post<ApiResponse<AcsFailCode>>('/ivr-acs-failcode-create', data);
    return response.data?.data;
  },

  updateFailCode: async ({ failCode, data }: { failCode: string; data: AcsFailCodeUpdateDatas }): Promise<AcsFailCode> => {
    const response = await apiClient.put<ApiResponse<AcsFailCode>>('/ivr-acs-failcode-update', data, { params: { failCode } });
    return response.data?.data;
  },

  deleteFailCode: async (failCode: string) => {
    return await apiClient.delete('/ivr-acs-failcode-delete', { params: { failCode } });
  },

  updateAreaConfig: async (data: AcsAreaConfigUpdateDatas) => {
    return await apiClient.put('/ivr-acs-areaconfig-update', data);
  },

  // ─── 시스템 제어 ───────────────────────────────────────────

  getSystemControls: async (params?: { acsId?: number }): Promise<AcsSystemControl[]> => {
    const response = await apiClient.get<ApiResponse<{ value: AcsSystemControl[] }>>('/ivr-acs-systemcontrol-list', { params });
    return response.data?.data?.value ?? [];
  },

  updateBlockState: async (items: AcsBlockStateItem[]) => {
    return await apiClient.put('/ivr-acs-blockstate-update', { items });
  },
};
