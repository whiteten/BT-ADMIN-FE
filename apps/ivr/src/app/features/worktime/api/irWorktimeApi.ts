/**
 * IVR 업무시간관리 API 클라이언트 (BFF Aggregation Flow 기반).
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST, 마이그레이션 V101):
 * - ipron-ivr-worktime-list    GET    IR 업무시간 목록 (worktimeName 필터)
 * - ipron-ivr-worktime-detail  GET    단건 조회
 * - ipron-ivr-worktime-create  POST   등록 (마스터+슬롯1 원자)
 * - ipron-ivr-worktime-update  PUT    수정
 * - ipron-ivr-worktime-delete  DELETE 삭제
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { IrWorktime, IrWorktimeRequest } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const irWorktimeApi = {
  /** IR 업무시간 목록 (List → BFF data.value) */
  getList: async (params?: Record<string, unknown>): Promise<IrWorktime[]> => {
    const res = await apiClient.get<ApiResponse<{ value: IrWorktime[] }>>('/ipron-ivr-worktime-list', { params });
    return res.data?.data?.value ?? [];
  },

  /** IR 업무시간 단건 */
  getDetail: async (id: number): Promise<IrWorktime> => {
    const res = await apiClient.get<ApiResponse<IrWorktime>>('/ipron-ivr-worktime-detail', { params: { id } });
    return res.data?.data;
  },

  /** IR 업무시간 등록 */
  create: async (body: IrWorktimeRequest): Promise<IrWorktime> => {
    const res = await apiClient.post<ApiResponse<IrWorktime>>('/ipron-ivr-worktime-create', body);
    return res.data?.data;
  },

  /** IR 업무시간 수정 */
  update: async ({ id, body }: { id: number; body: IrWorktimeRequest }): Promise<IrWorktime> => {
    const res = await apiClient.put<ApiResponse<IrWorktime>>('/ipron-ivr-worktime-update', body, { params: { id } });
    return res.data?.data;
  },

  /** IR 업무시간 삭제 */
  remove: async ({ id }: { id: number }): Promise<void> => {
    await apiClient.delete('/ipron-ivr-worktime-delete', { params: { id } });
  },
};
