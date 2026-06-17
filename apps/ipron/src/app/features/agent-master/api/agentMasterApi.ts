/**
 * 상담사 관리 API 클라이언트.
 *
 * BFF Aggregation Flow 매핑 (시드: C:\bt-admin-ipron-work\ipron-agent-master\seed.sql):
 *  상담사 (/api/ipron/agents)
 *    ipron-agent-master-list             GET    목록
 *    ipron-agent-master-detail           GET    상세
 *    ipron-agent-master-create           POST   등록
 *    ipron-agent-master-update           PUT    수정
 *    ipron-agent-master-delete-batch     POST   일괄 삭제 (body: agentIds[])
 *    ipron-agent-master-move             POST   그룹 이동 (드래그앤드롭)
 *    ipron-agent-master-bulk-group       PUT    다건 그룹 일괄 변경 (body: { agentIds, groupId }, 207)
 *    ipron-agent-master-bulk-media       PUT    다건 미디어 일괄 변경 (body: { items:[{agentId, useGrpMdaOpt, mediaMatrix}] })
 *    ipron-agent-master-duplicate-check  GET    로그인 ID 중복 체크
 *    ipron-agent-master-tenants          GET    테넌트 통계
 *    ipron-agent-master-excel-import     POST   엑셀 가져오기 시작 (multipart, taskId 반환)
 *    ipron-agent-master-excel-import-status GET 엑셀 가져오기 진행 상태 (polling)
 *    ipron-agent-master-excel-export     GET    엑셀 내보내기 (XLSX 다운로드)
 *  아웃소싱업체 (/api/ipron/oscoms)
 *    ipron-oscom-list                    GET    업체 마스터 콤보
 *  상담그룹 (/api/ipron/agent-groups)
 *    ipron-agent-group-tree              GET    트리
 *    ipron-agent-group-detail            GET    상세
 *    ipron-agent-group-create            POST   등록
 *    ipron-agent-group-update            PUT    수정
 *    ipron-agent-group-delete            DELETE 삭제
 *    ipron-agent-group-children-count    GET    자식+상담사 카운트 (삭제 전 체크)
 *    ipron-agent-group-reorder           POST   트리 D&D 재배치
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  AgentBulkMediaRequest,
  AgentConfig,
  AgentCreateRequest,
  AgentDuplicateCheckParams,
  AgentGroupCreateRequest,
  AgentGroupNode,
  AgentGroupReorderRequest,
  AgentGroupResponse,
  AgentGroupUpdateRequest,
  AgentMoveRequest,
  AgentResponse,
  AgentTenantStat,
  AgentUpdateRequest,
  BulkChangeResult,
  BulkGroupChangeRequest,
  Oscom,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const agentMasterApi = {
  // ─── 상담사 설정 ─────────────────────────────────────────────────────────

  /** 비밀번호 정책 설정 조회 — Drawer 비번 필드 required/disabled 동적 제어용 */
  getConfig: async (): Promise<AgentConfig> => {
    const res = await apiClient.get<ApiResponse<AgentConfig>>('/ipron-agent-master-config');
    return res.data?.data;
  },

  // ─── 상담사 조회 ─────────────────────────────────────────────────────────

  // BE 가 ApiResponse<List<X>> 반환 → BFF 가 data.value 로 wrap (ADN tenants 동일 패턴)
  getList: async (params?: { tenantId?: number; groupId?: number; keyword?: string }): Promise<AgentResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: AgentResponse[] }>>('/ipron-agent-master-list', { params });
    return res.data?.data?.value ?? [];
  },

  getDetail: async (id: number): Promise<AgentResponse> => {
    const res = await apiClient.get<ApiResponse<AgentResponse>>('/ipron-agent-master-detail', { params: { id } });
    return res.data?.data;
  },

  getTenants: async (): Promise<AgentTenantStat[]> => {
    const res = await apiClient.get<ApiResponse<{ value: AgentTenantStat[] }>>('/ipron-agent-master-tenants');
    return res.data?.data?.value ?? [];
  },

  /**
   * 아웃소싱업체(oscom) 마스터 콤보 — 상담그룹/상담사 Drawer 의 "아웃소싱업체" 콤보 소스.
   * BE: GET /api/ipron/oscoms (현재 테넌트 필터 BE 처리, FE 는 호출만).
   * BFF flow: ipron-oscom-list. BE 가 ApiResponse<List<Oscom>> 반환 → BFF 가 data.value 로 wrap (tenants 동일 패턴).
   */
  getOscoms: async (): Promise<Oscom[]> => {
    const res = await apiClient.get<ApiResponse<{ value: Oscom[] }>>('/ipron-oscom-list');
    return res.data?.data?.value ?? [];
  },

  duplicateCheck: async (params: AgentDuplicateCheckParams): Promise<boolean> => {
    const res = await apiClient.get<ApiResponse<boolean>>('/ipron-agent-master-duplicate-check', { params });
    return res.data?.data;
  },

  // ─── 상담사 변경 ─────────────────────────────────────────────────────────

  create: async (body: AgentCreateRequest): Promise<AgentResponse> => {
    const res = await apiClient.post<ApiResponse<AgentResponse>>('/ipron-agent-master-create', body);
    return res.data?.data;
  },

  update: async (id: number, body: AgentUpdateRequest): Promise<AgentResponse> => {
    const res = await apiClient.put<ApiResponse<AgentResponse>>('/ipron-agent-master-update', body, {
      params: { id },
    });
    return res.data?.data;
  },

  deleteBatch: async (agentIds: number[]): Promise<void> => {
    await apiClient.post('/ipron-agent-master-delete-batch', { agentIds });
  },

  move: async (id: number, body: AgentMoveRequest): Promise<AgentResponse> => {
    const res = await apiClient.post<ApiResponse<AgentResponse>>('/ipron-agent-master-move', body, {
      params: { id },
    });
    return res.data?.data;
  },

  /**
   * 상담사 다건 그룹 일괄 변경 (벌크 1콜).
   * BE: PUT /api/ipron/agents/bulk-group — 207 best-effort (일부 실패 시 failures 수집).
   * @flow ipron-agent-master-bulk-group
   */
  bulkGroup: async (body: BulkGroupChangeRequest): Promise<BulkChangeResult> => {
    const res = await apiClient.put<ApiResponse<BulkChangeResult>>('/ipron-agent-master-bulk-group', body);
    return res.data?.data;
  },

  /**
   * 상담사 다건 미디어 일괄 변경 (벌크 1콜).
   * BE: PUT /api/ipron/agents/bulk-media — 단일 트랜잭션 전체 롤백. 미디어 필드만 행별 부분갱신.
   * @flow ipron-agent-master-bulk-media
   */
  bulkMedia: async (body: AgentBulkMediaRequest): Promise<void> => {
    await apiClient.put('/ipron-agent-master-bulk-media', body);
  },

  // ─── 상담그룹 조회 ───────────────────────────────────────────────────────

  getGroupTree: async (params?: { tenantId?: number }): Promise<AgentGroupNode[]> => {
    const res = await apiClient.get<ApiResponse<{ value: AgentGroupNode[] }>>('/ipron-agent-group-tree', { params });
    return res.data?.data?.value ?? [];
  },

  getGroupDetail: async (id: number): Promise<AgentGroupResponse> => {
    const res = await apiClient.get<ApiResponse<AgentGroupResponse>>('/ipron-agent-group-detail', { params: { id } });
    return res.data?.data;
  },

  getGroupChildrenCount: async (id: number): Promise<number> => {
    // BFF 단일 step 래핑: BE ApiResponse<Long> → BFF가 {value: N} 으로 감싸 반환
    const res = await apiClient.get<ApiResponse<{ value: number }>>('/ipron-agent-group-children-count', { params: { id } });
    return res.data?.data?.value ?? 0;
  },

  // ─── 상담그룹 변경 ───────────────────────────────────────────────────────

  createGroup: async (body: AgentGroupCreateRequest): Promise<AgentGroupResponse> => {
    const res = await apiClient.post<ApiResponse<AgentGroupResponse>>('/ipron-agent-group-create', body);
    return res.data?.data;
  },

  updateGroup: async (id: number, body: AgentGroupUpdateRequest): Promise<AgentGroupResponse> => {
    const res = await apiClient.put<ApiResponse<AgentGroupResponse>>('/ipron-agent-group-update', body, {
      params: { id },
    });
    return res.data?.data;
  },

  deleteGroup: async (id: number): Promise<void> => {
    await apiClient.delete('/ipron-agent-group-delete', { params: { id } });
  },

  reorderGroup: async (id: number, body: AgentGroupReorderRequest): Promise<AgentGroupResponse> => {
    const res = await apiClient.post<ApiResponse<AgentGroupResponse>>('/ipron-agent-group-reorder', body, {
      params: { id },
    });
    return res.data?.data;
  },

  // ─── 엑셀 가져오기/내보내기 ─────────────────────────────────────────────

  /**
   * 상담사 엑셀 내보내기.
   * Backend: byte[] (XLSX binary) — BFF 가 그대로 forward.
   * @flow ipron-agent-master-excel-export
   */
  exportExcel: async (params?: { tenantId?: number; groupId?: number; keyword?: string }): Promise<Blob> => {
    const response = await apiClient.get<Blob>('/ipron-agent-master-excel-export', {
      params,
      responseType: 'blob',
    });
    return (response as unknown as { data: Blob }).data;
  },

  /**
   * 상담사 엑셀 가져오기 시작 — 비동기. 즉시 taskId 반환 후 status polling 으로 진행률 확인.
   * Backend: ApiResponse<{ taskId }> — BFF: data:{...} -> response.data?.data
   * @flow ipron-agent-master-excel-import
   *
   * ⚠ groupId 는 BE 필수 파라미터.
   */
  startImport: async (params: { tenantId: number; groupId: number; file: File }): Promise<{ taskId: string }> => {
    const formData = new FormData();
    formData.append('file', params.file);
    // ⚠ Content-Type 헤더는 명시하지 않는다. axios가 FormData를 감지하면
    //    'multipart/form-data; boundary=...' 를 자동 설정한다.
    const response = await apiClient.post<ApiResponse<{ taskId: string }>>('/ipron-agent-master-excel-import', formData, {
      params: { tenantId: params.tenantId, groupId: params.groupId },
    });
    return response.data?.data;
  },

  /**
   * 상담사 엑셀 가져오기 진행 상태 조회 (1초 polling 용).
   * @flow ipron-agent-master-excel-import-status
   */
  getImportStatus: async (
    taskId: string,
  ): Promise<{
    taskId: string;
    total: number;
    processed: number;
    success: number;
    failedCount: number;
    failed: Array<{ rowNum: number; agentLoginId: string | null; reason: string }>;
    done: boolean;
    errorMessage: string | null;
  }> => {
    const response = await apiClient.get<
      ApiResponse<{
        taskId: string;
        total: number;
        processed: number;
        success: number;
        failedCount: number;
        failed: Array<{ rowNum: number; agentLoginId: string | null; reason: string }>;
        done: boolean;
        errorMessage: string | null;
      }>
    >('/ipron-agent-master-excel-import-status', { params: { taskId } });
    return response.data?.data;
  },
};
