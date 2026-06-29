/**
 * 상담사/상담그룹 스케줄 관리 API 클라이언트.
 *
 * BE: BT-ADMIN-SERVICE-IPRON — 신규 패키지 agentschedule (미구현, FE 가 BFF flow 계약 선반영).
 * 시드: C:\bt-admin-ipron-work\ipron-agent-schedule\seed.sql (BFF Aggregation Flow + Step).
 *
 * BFF Aggregation Flow ID 규약 (ipron-agent-schedule-*):
 *   tenants                              GET    테넌트 통계 카드
 *   {kind}-list                          GET    스케줄 정의 목록 (kind=media|work|skill, subject 쿼리로 배정 수 산출)
 *   {kind}-create / -update / -delete    POST/PUT/DELETE  스케줄 정의 CRUD
 *   {kind}-relation-count                GET    삭제 전 배정 건수 (주체 합산)
 *   {kind}-assigned                      GET    이 스케줄에 배정된 주체 목록 (subject 쿼리)
 *   {kind}-assignable                    GET    배정 가능한 주체 목록 (subject 쿼리)
 *   {kind}-assign / -unassign            POST/POST  배정/해제 (subject 쿼리) — unassign 은 BFF DELETE+body 미전달 우회로 POST 사용
 *
 * BE 엔드포인트 (참고 — REST):
 *   GET    /api/ipron/agent-schedules/{kind}?tenantId&subject
 *   POST   /api/ipron/agent-schedules/{kind}
 *   PUT    /api/ipron/agent-schedules/{kind}/{id}
 *   DELETE /api/ipron/agent-schedules/{kind}/{id}
 *   GET    /api/ipron/agent-schedules/{kind}/{id}/assigned?subject
 *   GET    /api/ipron/agent-schedules/{kind}/{id}/assignable?subject
 *   POST   /api/ipron/agent-schedules/{kind}/{id}/assign?subject    body { targetIds }
 *   POST   /api/ipron/agent-schedules/{kind}/{id}/unassign?subject body { targetIds } (DELETE+body BFF 우회)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { ScheduleAssignTarget, ScheduleInfoRequest, ScheduleInfoResponse, ScheduleKind, ScheduleSubject, ScheduleTenantStat } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/** 스케줄 종류별 list flow ID */
function listFlow(kind: ScheduleKind): string {
  return `ipron-agent-schedule-${kind}-list`;
}

export const agentScheduleApi = {
  // ─── 테넌트 통계 ──────────────────────────────────────────────
  getTenants: async (): Promise<ScheduleTenantStat[]> => {
    const res = await apiClient.get<ApiResponse<{ value: ScheduleTenantStat[] }>>('/ipron-agent-schedule-tenants');
    return res.data?.data?.value ?? [];
  },

  // ─── 스케줄 정의(메타) 목록 ───────────────────────────────────
  /**
   * 선택 탭(kind)의 스케줄 정의 목록.
   * subject 는 assignedCount 산출 기준(상담사 배정 수 vs 그룹 배정 수)으로 BE 에 전달.
   */
  getList: async (kind: ScheduleKind, params?: { tenantId?: number; subject?: ScheduleSubject }): Promise<ScheduleInfoResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: ScheduleInfoResponse[] }>>(`/${listFlow(kind)}`, { params });
    return res.data?.data?.value ?? [];
  },

  // ─── 스케줄 정의 CRUD ─────────────────────────────────────────
  create: async (kind: ScheduleKind, body: ScheduleInfoRequest): Promise<ScheduleInfoResponse> => {
    const res = await apiClient.post<ApiResponse<ScheduleInfoResponse>>(`/ipron-agent-schedule-${kind}-create`, body);
    return res.data?.data;
  },

  update: async (kind: ScheduleKind, scheduleId: number, body: ScheduleInfoRequest): Promise<ScheduleInfoResponse> => {
    const res = await apiClient.put<ApiResponse<ScheduleInfoResponse>>(`/ipron-agent-schedule-${kind}-update`, body, { params: { scheduleId } });
    return res.data?.data;
  },

  remove: async (kind: ScheduleKind, scheduleId: number): Promise<void> => {
    await apiClient.delete(`/ipron-agent-schedule-${kind}-delete`, { params: { scheduleId } });
  },

  /** 삭제 전 배정 건수 — 상담사+그룹 합산 (배정>0 이면 BE 가 409 거부) */
  relationCount: async (kind: ScheduleKind, scheduleId: number): Promise<number> => {
    const res = await apiClient.get<ApiResponse<number>>(`/ipron-agent-schedule-${kind}-relation-count`, { params: { scheduleId } });
    return res.data?.data ?? 0;
  },

  // ─── 배정/해제 ────────────────────────────────────────────────
  getAssigned: async (kind: ScheduleKind, scheduleId: number, subject: ScheduleSubject): Promise<ScheduleAssignTarget[]> => {
    const res = await apiClient.get<ApiResponse<{ value: ScheduleAssignTarget[] }>>(`/ipron-agent-schedule-${kind}-assigned`, { params: { scheduleId, subject } });
    return res.data?.data?.value ?? [];
  },

  getAssignable: async (kind: ScheduleKind, scheduleId: number, subject: ScheduleSubject): Promise<ScheduleAssignTarget[]> => {
    const res = await apiClient.get<ApiResponse<{ value: ScheduleAssignTarget[] }>>(`/ipron-agent-schedule-${kind}-assignable`, { params: { scheduleId, subject } });
    return res.data?.data?.value ?? [];
  },

  /**
   * 배정 요청.
   * kind=media 일 때 body 에 mediaType 포함. 근무·스킬 탭은 targetIds 만 포함.
   */
  assign: async (kind: ScheduleKind, scheduleId: number, subject: ScheduleSubject, targetIds: number[], mediaType?: number): Promise<number> => {
    const body: { targetIds: number[]; mediaType?: number } = { targetIds };
    if (kind === 'media' && mediaType != null) {
      body.mediaType = mediaType;
    }
    const res = await apiClient.post<ApiResponse<{ assigned: number }>>(`/ipron-agent-schedule-${kind}-assign`, body, { params: { scheduleId, subject } });
    return res.data?.data?.assigned ?? 0;
  },

  unassign: async (kind: ScheduleKind, scheduleId: number, subject: ScheduleSubject, targetIds: number[]): Promise<number> => {
    const res = await apiClient.post<ApiResponse<{ deleted: number }>>(`/ipron-agent-schedule-${kind}-unassign`, { targetIds }, { params: { scheduleId, subject } });
    return res.data?.data?.deleted ?? 0;
  },
};
