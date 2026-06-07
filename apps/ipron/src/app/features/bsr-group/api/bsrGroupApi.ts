/**
 * BSR 그룹 관리 API 클라이언트.
 *
 * BFF flow (seed: C:\bt-admin-ipron-work\ipron-bsr-group\seed.sql):
 *   ipron-bsr-group-tenants            GET    테넌트 stats (카드용)
 *   ipron-bsr-group-list               GET    목록
 *   ipron-bsr-group-detail             GET    상세
 *   ipron-bsr-group-create             POST   생성
 *   ipron-bsr-group-update             PUT    수정
 *   ipron-bsr-group-delete             DELETE 삭제
 *   ipron-bsr-group-schedules          GET    그룹 배정 스케줄 목록
 *   ipron-bsr-group-schedules-assign   POST   스케줄 배정
 *   ipron-bsr-group-schedules-unassign DELETE 스케줄 해제
 *   ipron-bsr-group-schedule-pool      GET    배정 후보 풀
 *   ipron-bsr-group-schedules-create   POST   스케줄 메타 생성
 *   ipron-bsr-group-schedules-update   PUT    스케줄 메타 수정
 *   ipron-bsr-group-schedules-delete   DELETE 스케줄 메타 삭제
 *   ipron-bsr-group-combo              GET    BSR 그룹 콤보 (전체/미지정/목록)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { BsrGroupComboItem } from '../../bsr-ctiq-mapping/types';
import type {
  BsrGroupCreateRequest,
  BsrGroupResponse,
  BsrGroupTenantStat,
  BsrGroupUpdateRequest,
  BsrScheduleInfoCreateRequest,
  BsrScheduleInfoResponse,
  BsrScheduleInfoUpdateRequest,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const bsrGroupApi = {
  // ─── 테넌트 통계 ────────────────────────────────────────────
  getTenants: async (): Promise<BsrGroupTenantStat[]> => {
    const res = await apiClient.get<ApiResponse<{ value: BsrGroupTenantStat[] }>>('/ipron-bsr-group-tenants');
    return res.data?.data?.value ?? [];
  },

  // ─── 목록/상세 ─────────────────────────────────────────────
  getList: async (params?: { tenantId?: number; bsrGroupName?: string }): Promise<BsrGroupResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: BsrGroupResponse[] }>>('/ipron-bsr-group-list', { params });
    return res.data?.data?.value ?? [];
  },

  getDetail: async (bsrGroupId: number): Promise<BsrGroupResponse> => {
    const res = await apiClient.get<ApiResponse<BsrGroupResponse>>('/ipron-bsr-group-detail', { params: { bsrGroupId } });
    return res.data?.data;
  },

  // ─── CRUD ──────────────────────────────────────────────────
  create: async (body: BsrGroupCreateRequest): Promise<BsrGroupResponse> => {
    const res = await apiClient.post<ApiResponse<BsrGroupResponse>>('/ipron-bsr-group-create', body);
    return res.data?.data;
  },

  update: async (bsrGroupId: number, body: BsrGroupUpdateRequest): Promise<BsrGroupResponse> => {
    const res = await apiClient.put<ApiResponse<BsrGroupResponse>>('/ipron-bsr-group-update', body, { params: { bsrGroupId } });
    return res.data?.data;
  },

  remove: async (bsrGroupId: number): Promise<void> => {
    await apiClient.delete('/ipron-bsr-group-delete', { params: { bsrGroupId } });
  },

  // ─── 스케줄 배정 ───────────────────────────────────────────
  getGroupSchedules: async (bsrGroupId: number): Promise<BsrScheduleInfoResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: BsrScheduleInfoResponse[] }>>('/ipron-bsr-group-schedules', { params: { bsrGroupId } });
    return res.data?.data?.value ?? [];
  },

  assignSchedules: async (bsrGroupId: number, scheduleIds: number[]): Promise<void> => {
    await apiClient.post('/ipron-bsr-group-schedules-assign', { scheduleIds }, { params: { bsrGroupId } });
  },

  unassignSchedule: async (bsrGroupId: number, scheduleId: number): Promise<void> => {
    await apiClient.delete('/ipron-bsr-group-schedules-unassign', { params: { bsrGroupId, scheduleId } });
  },

  getSchedulePool: async (tenantId: number, bsrGroupId?: number): Promise<BsrScheduleInfoResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: BsrScheduleInfoResponse[] }>>('/ipron-bsr-group-schedule-pool', {
      params: { tenantId, bsrGroupId },
    });
    return res.data?.data?.value ?? [];
  },

  // ─── 스케줄 메타 CRUD ──────────────────────────────────────
  createSchedule: async (body: BsrScheduleInfoCreateRequest): Promise<BsrScheduleInfoResponse> => {
    const res = await apiClient.post<ApiResponse<BsrScheduleInfoResponse>>('/ipron-bsr-group-schedules-create', body);
    return res.data?.data;
  },

  updateSchedule: async (scheduleId: number, body: BsrScheduleInfoUpdateRequest): Promise<BsrScheduleInfoResponse> => {
    const res = await apiClient.put<ApiResponse<BsrScheduleInfoResponse>>('/ipron-bsr-group-schedules-update', body, { params: { scheduleId } });
    return res.data?.data;
  },

  deleteSchedule: async (scheduleId: number): Promise<void> => {
    await apiClient.delete('/ipron-bsr-group-schedules-delete', { params: { scheduleId } });
  },

  // ─── 콤보 ─────────────────────────────────────────────────
  getCombo: async (tenantId?: number): Promise<BsrGroupComboItem[]> => {
    const res = await apiClient.get<ApiResponse<{ value: BsrGroupComboItem[] }>>('/ipron-bsr-group-combo', { params: { tenantId } });
    return res.data?.data?.value ?? [];
  },
};
