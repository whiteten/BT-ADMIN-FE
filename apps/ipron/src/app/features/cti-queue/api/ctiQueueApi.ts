/**
 * CTI 큐 관리 API 클라이언트.
 *
 * BE REST: BT-ADMIN-SERVICE-IPRON `/api/ipron/cti-queues` (CtiQueueController).
 * FE 는 BFF Aggregation Flow 경유 (시드: C:\bt-admin-ipron-work\ipron-cti-queue\seed.sql).
 *
 * BFF flow 매핑:
 *  ipron-cti-queue-list             GET  목록 (?tenantId)
 *  ipron-cti-queue-detail           GET  상세 ({ctiqId})
 *  ipron-cti-queue-create           POST 등록 (그룹DN 결합)
 *  ipron-cti-queue-update           PUT  수정 ({ctiqId})
 *  ipron-cti-queue-delete           DELETE 삭제 ({ctiqId})
 *  ipron-cti-queue-tenants          GET  테넌트 통계
 *  ipron-cti-queue-duplicate-check  GET  그룹DN(=큐) 번호 중복검증
 *  ipron-cti-queue-options-groups       GET  기본 라우팅그룹 콤보
 *  ipron-cti-queue-options-skillsets    GET  미디어별 스킬셋 콤보
 *  ipron-cti-queue-options-bsr-groups   GET  BSR 그룹 콤보
 *  ipron-cti-queue-options-media-types  GET  라이선스 미디어 목록
 *  ipron-cti-queue-bsr-schedules            GET    BSR 스케쥴 목록 ({ctiqId})
 *  ipron-cti-queue-bsr-schedules-assign     POST   BSR 스케쥴 배정 ({ctiqId})
 *  ipron-cti-queue-bsr-schedules-unassign   DELETE BSR 스케쥴 해제 ({ctiqId},{scheduleId})
 *  ipron-cti-queue-slt-schedules            GET    SLT 스케쥴 목록 ({ctiqId})
 *  ipron-cti-queue-slt-schedules-assign     POST   SLT 스케쥴 배정 ({ctiqId})
 *  ipron-cti-queue-slt-schedules-unassign   DELETE SLT 스케쥴 해제 ({ctiqId},{scheduleId})
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  CtiQueueCreateRequest,
  CtiQueueMediaOption,
  CtiQueueOptionItem,
  CtiQueueResponse,
  CtiQueueTenantStat,
  CtiQueueUpdateRequest,
  QuebsrScheduleResponse,
  ScheduleAssignRequest,
  SltScheduleResponse,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const ctiQueueApi = {
  // ─── List / Detail / Stats ─────────────────────────────────────────────────

  getList: async (params?: { tenantId?: number }): Promise<CtiQueueResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: CtiQueueResponse[] }>>('/ipron-cti-queue-list', { params });
    return res.data?.data?.value ?? [];
  },

  getDetail: async (ctiqId: number): Promise<CtiQueueResponse> => {
    const res = await apiClient.get<ApiResponse<CtiQueueResponse>>('/ipron-cti-queue-detail', { params: { ctiqId } });
    return res.data?.data;
  },

  getTenants: async (): Promise<CtiQueueTenantStat[]> => {
    const res = await apiClient.get<ApiResponse<{ value: CtiQueueTenantStat[] }>>('/ipron-cti-queue-tenants');
    return res.data?.data?.value ?? [];
  },

  /** 동일 노드 내 GDN+DN+SIP 트렁크 cross-check. */
  duplicateCheck: async (params: { nodeId: number; gdnNo: string; excludeGdnId?: number }): Promise<boolean> => {
    const res = await apiClient.get<ApiResponse<{ value: boolean }>>('/ipron-cti-queue-duplicate-check', { params });
    return res.data?.data?.value ?? false;
  },

  // ─── Mutations ─────────────────────────────────────────────────────────────

  create: async (body: CtiQueueCreateRequest): Promise<CtiQueueResponse> => {
    const res = await apiClient.post<ApiResponse<CtiQueueResponse>>('/ipron-cti-queue-create', body);
    return res.data?.data;
  },

  update: async (ctiqId: number, body: CtiQueueUpdateRequest): Promise<CtiQueueResponse> => {
    const res = await apiClient.put<ApiResponse<CtiQueueResponse>>('/ipron-cti-queue-update', body, { params: { ctiqId } });
    return res.data?.data;
  },

  delete: async (ctiqId: number): Promise<void> => {
    await apiClient.delete('/ipron-cti-queue-delete', { params: { ctiqId } });
  },

  // ─── 콤보 옵션 ──────────────────────────────────────────────────────────────

  getGroupOptions: async (params?: { tenantId?: number }): Promise<CtiQueueOptionItem[]> => {
    const res = await apiClient.get<ApiResponse<{ value: CtiQueueOptionItem[] }>>('/ipron-cti-queue-options-groups', { params });
    return res.data?.data?.value ?? [];
  },

  getSkillsetOptions: async (params?: { tenantId?: number }): Promise<CtiQueueOptionItem[]> => {
    const res = await apiClient.get<ApiResponse<{ value: CtiQueueOptionItem[] }>>('/ipron-cti-queue-options-skillsets', { params });
    return res.data?.data?.value ?? [];
  },

  getBsrGroupOptions: async (params?: { tenantId?: number }): Promise<CtiQueueOptionItem[]> => {
    const res = await apiClient.get<ApiResponse<{ value: CtiQueueOptionItem[] }>>('/ipron-cti-queue-options-bsr-groups', { params });
    return res.data?.data?.value ?? [];
  },

  getMediaOptions: async (): Promise<CtiQueueMediaOption[]> => {
    const res = await apiClient.get<ApiResponse<{ value: CtiQueueMediaOption[] }>>('/ipron-cti-queue-options-media-types');
    return res.data?.data?.value ?? [];
  },

  // ─── BSR 스케쥴 서브그리드 ──────────────────────────────────────────────────

  getBsrSchedules: async (ctiqId: number): Promise<QuebsrScheduleResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: QuebsrScheduleResponse[] }>>('/ipron-cti-queue-bsr-schedules', { params: { ctiqId } });
    return res.data?.data?.value ?? [];
  },

  assignBsrSchedules: async (ctiqId: number, body: ScheduleAssignRequest): Promise<void> => {
    await apiClient.post('/ipron-cti-queue-bsr-schedules-assign', body, { params: { ctiqId } });
  },

  unassignBsrSchedule: async (ctiqId: number, scheduleId: number): Promise<void> => {
    await apiClient.delete('/ipron-cti-queue-bsr-schedules-unassign', { params: { ctiqId, scheduleId } });
  },

  // ─── SLT 스케쥴 서브그리드 (탭5) ────────────────────────────────────────────

  getSltSchedules: async (ctiqId: number): Promise<SltScheduleResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: SltScheduleResponse[] }>>('/ipron-cti-queue-slt-schedules', { params: { ctiqId } });
    return res.data?.data?.value ?? [];
  },

  assignSltSchedules: async (ctiqId: number, body: ScheduleAssignRequest): Promise<void> => {
    await apiClient.post('/ipron-cti-queue-slt-schedules-assign', body, { params: { ctiqId } });
  },

  unassignSltSchedule: async (ctiqId: number, scheduleId: number): Promise<void> => {
    await apiClient.delete('/ipron-cti-queue-slt-schedules-unassign', { params: { ctiqId, scheduleId } });
  },
};
