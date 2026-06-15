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
 *  ipron-cti-queue-delete-batch     DELETE 일괄 삭제 (body: ctiqIds[], BSR 배정 시 409 전체 거부)
 *  cti-queue-media-skills-save      PUT  미디어 스킬 매트릭스 일괄 저장 (큐별 차등, 207)
 *  ipron-cti-queue-tenants          GET  테넌트 통계
 *  ipron-cti-queue-duplicate-check  GET  그룹DN(=큐) 번호 중복검증
 *  ipron-cti-queue-options-groups           GET  기본 라우팅그룹 콤보
 *  ipron-cti-queue-options-skillsets        GET  미디어별 스킬셋 콤보
 *  ipron-cti-queue-options-bsr-groups       GET  BSR 그룹 콤보
 *  ipron-cti-queue-options-media-types      GET  라이선스 미디어 목록
 *  ipron-cti-queue-options-bsr-schedule-pool  GET  BSR 스케줄 풀 (배정 후보, SWAT IPR20S3020SIL.do)
 *  ipron-cti-queue-options-slt-schedule-pool  GET  SLT 스케줄 풀 (배정 후보)
 *  ipron-cti-queue-bsr-schedules            GET    BSR 스케줄 목록 ({ctiqId})
 *  ipron-cti-queue-bsr-schedules-assign     POST   BSR 스케줄 배정 ({ctiqId})
 *  ipron-cti-queue-bsr-schedules-unassign   DELETE BSR 스케줄 해제 ({ctiqId},{scheduleId})
 *  ipron-cti-queue-slt-schedules            GET    SLT 스케줄 목록 ({ctiqId})
 *  ipron-cti-queue-slt-schedules-assign     POST   SLT 스케줄 배정 ({ctiqId})
 *  ipron-cti-queue-slt-schedules-unassign   DELETE SLT 스케줄 해제 ({ctiqId},{scheduleId})
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  AccessCodeProfileOption,
  CtiQueueBulkResult,
  CtiQueueBulkUpdateRequest,
  CtiQueueCreateRequest,
  CtiQueueGroupCreateRequest,
  CtiQueueGroupReorderRequest,
  CtiQueueGroupResponse,
  CtiQueueGroupUpdateRequest,
  CtiQueueMediaOption,
  CtiQueueMediaSkillBatchRequest,
  CtiQueueMediaSkillBatchResult,
  CtiQueueMemberReassignRequest,
  CtiQueueOptionItem,
  CtiQueueResponse,
  CtiQueueTenantStat,
  CtiQueueUpdateRequest,
  QuebsrScheduleResponse,
  ScheduleAssignRequest,
  SltScheduleResponse,
} from '../types';

/** 접근코드 프로파일 목록(노드/테넌트 필터) BFF 응답 raw 항목 (access-profile-list flow 재사용). */
interface AccessProfileRaw {
  accessCodeProfileId: number;
  accessCodeProfileName: string | null;
  nodeId: number | null;
  tenantId: number | null;
}

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

  /**
   * CTI 큐 일괄 삭제 — cascade 4종, BSR 스케줄 배정된 큐 포함 시 409 전체 거부.
   * BE: DELETE /api/ipron/cti-queues/delete-batch → ApiResponse<Integer>(삭제 건수).
   * @flow ipron-cti-queue-delete-batch (body: { ctiqIds })
   */
  deleteBatch: async (ctiqIds: number[]): Promise<number> => {
    const res = await apiClient.delete<ApiResponse<number>>('/ipron-cti-queue-delete-batch', { data: { ctiqIds } });
    return res.data?.data ?? 0;
  },

  /**
   * 일괄 설정 (Bulk Update) — P1.
   * BE: PUT /api/ipron/cti-queues/bulk-update (field mask 기반, 207 부분 성공).
   * BFF: ipron-cti-queue-bulk-update flow 경유.
   */
  bulkUpdate: async (body: CtiQueueBulkUpdateRequest): Promise<CtiQueueBulkResult> => {
    const res = await apiClient.put<ApiResponse<CtiQueueBulkResult>>('/ipron-cti-queue-bulk-update', body);
    return res.data?.data;
  },

  /**
   * 미디어 스킬 매트릭스 일괄 저장 — "스킬 배정 보기" 토글 (큐별 차등 스킬·레벨).
   * BE: PUT /api/ipron/cti-queues/media-skills (field mask 기반, 207 부분 성공).
   * BFF: cti-queue-media-skills-save flow 경유 (seed: seed-additions-2026-06-12.sql).
   * 207(부분 성공) 응답도 본문(CtiQueueBulkResult)을 받아 결과 모달에 표시해야 하므로 validateStatus 로 허용.
   */
  mediaSkillsBatch: async (body: CtiQueueMediaSkillBatchRequest): Promise<CtiQueueMediaSkillBatchResult> => {
    const res = await apiClient.put<ApiResponse<CtiQueueMediaSkillBatchResult>>('/cti-queue-media-skills-save', body, {
      validateStatus: (status) => (status >= 200 && status < 300) || status === 207,
    });
    return res.data?.data;
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

  /**
   * BSR 스케줄 풀 — 배정 후보 전체 목록 (SWAT IPR20S3020SIL.do 정합).
   * 이미 배정된 것도 포함해 반환하므로 FE 피커에서 이미 배정된 항목은 disabled 처리.
   */
  getBsrSchedulePool: async (params?: { tenantId?: number }): Promise<QuebsrScheduleResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: QuebsrScheduleResponse[] }>>('/ipron-cti-queue-options-bsr-schedule-pool', { params, silent: true });
    return res.data?.data?.value ?? [];
  },

  /**
   * SLT 스케줄 풀 — 배정 후보 전체 목록.
   */
  getSltSchedulePool: async (params?: { tenantId?: number }): Promise<SltScheduleResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: SltScheduleResponse[] }>>('/ipron-cti-queue-options-slt-schedule-pool', { params, silent: true });
    return res.data?.data?.value ?? [];
  },

  /**
   * 접근코드 프로파일 콤보 (노드/테넌트 단위) — 접근코드 프로파일 관리 화면의 목록 API 재사용.
   * SWAT IPR20S3020: cbCreate("#poAccessCodeProfileId", "accessCodeProfile", "nodeId=..&tenantId=..").
   * @flow ipron-access-profile-list (GET /api/ipron/access-profiles?tenantId&nodeId)
   */
  getAccessCodeProfileOptions: async (params?: { tenantId?: number; nodeId?: number }): Promise<AccessCodeProfileOption[]> => {
    const res = await apiClient.get<ApiResponse<{ value: AccessProfileRaw[] }>>('/ipron-access-profile-list', { params });
    return (res.data?.data?.value ?? []).map((p) => ({ id: p.accessCodeProfileId, name: p.accessCodeProfileName ?? `프로파일 ${p.accessCodeProfileId}` }));
  },

  // ─── BSR 스케줄 서브그리드 ──────────────────────────────────────────────────

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

  // ─── SLT 스케줄 서브그리드 (탭5) ────────────────────────────────────────────

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

  // ─── Excel 내보내기 / 가져오기 (SWAT IPR20S3020 doExcelExport/doExcelImport) ────

  /**
   * CTI 큐 목록 Excel 내보내기 (SWAT excelColumns 50여 컬럼 정합).
   * BE: GET /api/ipron/cti-queues/export?tenantId=
   * BFF: ipron-cti-queue-export flow 경유.
   */
  exportExcel: async (params?: { tenantId?: number }): Promise<Blob> => {
    const res = await apiClient.get<Blob>('/ipron-cti-queue-export', {
      params,
      responseType: 'blob',
    });
    return res.data;
  },

  /**
   * CTI 큐 Excel 가져오기 (SWAT doExcelImport_init 정합).
   * BE: POST /api/ipron/cti-queues/import (multipart/form-data).
   * BFF: ipron-cti-queue-import flow 경유.
   *
   * BE 가 행별 성패를 항상 HTTP 200 · ok:true · 평탄 data{successCount, errors[]} 로 반환한다
   * (207/400 미사용 — BFF single-step 언래핑 비대칭 회피, BE CtiQueueController.importExcel JavaDoc 참조).
   * 따라서 BFF error 경로에 진입하지 않고 평탄 data 단일경로로 도착한다.
   * validateStatus 는 200·207 만 허용(과거 안전망 — BE 200 고정이라 207 은 사실상 미발생).
   * 반환을 평탄 결과로 언래핑해 화면이 successCount/errors 를 바로 사용한다.
   */
  importExcel: async (file: File): Promise<{ successCount: number; errors: { rowNum: number; message: string }[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<ApiResponse<{ successCount: number; errors: { rowNum: number; message: string }[] }>>('/ipron-cti-queue-import', formData, {
      validateStatus: (status) => (status >= 200 && status < 300) || status === 207,
    });
    return res.data?.data ?? { successCount: 0, errors: [] };
  },

  // ─── 업무그룹 트리 (TB_TR_CTIQ_MASTER) ───────────────────────────────────────

  getGroups: async (params?: { tenantId?: number }): Promise<CtiQueueGroupResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: CtiQueueGroupResponse[] }>>('/ipron-cti-queue-groups-list', { params });
    return res.data?.data?.value ?? [];
  },

  createGroup: async (body: CtiQueueGroupCreateRequest): Promise<CtiQueueGroupResponse> => {
    const res = await apiClient.post<ApiResponse<CtiQueueGroupResponse>>('/ipron-cti-queue-groups-create', body);
    return res.data?.data;
  },

  updateGroup: async (treeId: number, body: CtiQueueGroupUpdateRequest): Promise<CtiQueueGroupResponse> => {
    const res = await apiClient.put<ApiResponse<CtiQueueGroupResponse>>('/ipron-cti-queue-groups-update', body, { params: { treeId } });
    return res.data?.data;
  },

  removeGroup: async (treeId: number): Promise<void> => {
    await apiClient.delete('/ipron-cti-queue-groups-delete', { params: { treeId } });
  },

  /**
   * 업무그룹 트리 D&D 재배치 (BEFORE/AFTER/INSIDE).
   * BE: POST /api/ipron/cti-queue-groups/{treeId}/reorder
   * BFF: cti-queue-group-reorder flow 경유 (seed: seed-additions-2026-06-12.sql).
   */
  reorderGroup: async (treeId: number, body: CtiQueueGroupReorderRequest): Promise<CtiQueueGroupResponse> => {
    const res = await apiClient.post<ApiResponse<CtiQueueGroupResponse>>('/cti-queue-group-reorder', body, { params: { treeId } });
    return res.data?.data;
  },

  // ─── 업무그룹 매핑 (TB_TR_CTIQ_MEMBER, 드래그앤드롭) ──────────────────────────

  reassignMembers: async (body: CtiQueueMemberReassignRequest): Promise<number> => {
    const res = await apiClient.post<ApiResponse<{ processed: number }>>('/ipron-cti-queue-members-reassign', body);
    return res.data?.data?.processed ?? 0;
  },

  unassignMembers: async (ctiqIds: number[]): Promise<number> => {
    const res = await apiClient.post<ApiResponse<{ deleted: number }>>('/ipron-cti-queue-members-unassign', { ctiqIds });
    return res.data?.data?.deleted ?? 0;
  },
};
