/**
 * 교환기 업무시간관리 API 클라이언트 (BFF Aggregation Flow 기반).
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST, 마이그레이션 V101/V103):
 * - ipron-pbx-worktime-list/detail/create/update/delete   마스터 CRUD
 * - ipron-pbx-worktime-slot-list/create/update/delete      슬롯 CRUD (마스터 하위)
 * - ipron-pbx-worktime-tenants                             테넌트 카드 (TB_CC_TENANTMASTER 드라이빙)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { IeWorktimeMaster, IeWorktimeMasterRequest, IeWorktimeSlot, IeWorktimeSlotRequest, IeWorktimeTenantStat } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const ieWorktimeApi = {
  // ─── 테넌트 통계 ─────────────────────────────────────────
  getTenantStats: async (): Promise<IeWorktimeTenantStat[]> => {
    const res = await apiClient.get<ApiResponse<{ value: IeWorktimeTenantStat[] }>>('/ipron-pbx-worktime-tenants');
    return res.data?.data?.value ?? [];
  },

  // ─── 마스터 ──────────────────────────────────────────────
  getList: async (params?: Record<string, unknown>): Promise<IeWorktimeMaster[]> => {
    const res = await apiClient.get<ApiResponse<{ value: IeWorktimeMaster[] }>>('/ipron-pbx-worktime-list', { params });
    return res.data?.data?.value ?? [];
  },

  create: async (body: IeWorktimeMasterRequest): Promise<IeWorktimeMaster> => {
    const res = await apiClient.post<ApiResponse<IeWorktimeMaster>>('/ipron-pbx-worktime-create', body);
    return res.data?.data;
  },

  update: async ({ id, body }: { id: number; body: IeWorktimeMasterRequest }): Promise<IeWorktimeMaster> => {
    const res = await apiClient.put<ApiResponse<IeWorktimeMaster>>('/ipron-pbx-worktime-update', body, { params: { id } });
    return res.data?.data;
  },

  remove: async ({ id }: { id: number }): Promise<void> => {
    await apiClient.delete('/ipron-pbx-worktime-delete', { params: { id } });
  },

  // ─── 슬롯 ────────────────────────────────────────────────
  getSlots: async (id: number): Promise<IeWorktimeSlot[]> => {
    const res = await apiClient.get<ApiResponse<{ value: IeWorktimeSlot[] }>>('/ipron-pbx-worktime-slot-list', { params: { id } });
    return res.data?.data?.value ?? [];
  },

  createSlot: async ({ id, body }: { id: number; body: IeWorktimeSlotRequest }): Promise<IeWorktimeSlot> => {
    const res = await apiClient.post<ApiResponse<IeWorktimeSlot>>('/ipron-pbx-worktime-slot-create', body, { params: { id } });
    return res.data?.data;
  },

  updateSlot: async ({ id, listSeq, body }: { id: number; listSeq: number; body: IeWorktimeSlotRequest }): Promise<IeWorktimeSlot> => {
    const res = await apiClient.put<ApiResponse<IeWorktimeSlot>>('/ipron-pbx-worktime-slot-update', body, { params: { id, listSeq } });
    return res.data?.data;
  },

  removeSlot: async ({ id, listSeq }: { id: number; listSeq: number }): Promise<void> => {
    await apiClient.delete('/ipron-pbx-worktime-slot-delete', { params: { id, listSeq } });
  },
};
