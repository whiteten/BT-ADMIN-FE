/**
 * DN 관리 API 클라이언트 (IPR20S2020)
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - ipron-dn-list:                    GET    DN 목록 조회 (페이징)
 * - ipron-dn-detail:                  GET    DN 단건 조회
 * - ipron-dn-create:                  POST   DN 등록
 * - ipron-dn-update:                  PUT    DN 수정
 * - ipron-dn-delete-batch:            DELETE DN 다건 삭제 (body: ids)
 * - ipron-dn-batch-create:            POST   DN 일괄 등록 (DN 범위)
 * - ipron-dn-node-tenants:            GET    노드-테넌트 매핑 조회
 * - ipron-dn-count:                   GET    현재 DN 수 + 계약수량 조회
 * - ipron-dn-options:                 GET    폼 드롭다운 옵션 일괄
 * - ipron-dn-duplicate-check:         GET    DN 번호 중복 체크 (클러스터)
 * - ipron-dn-range:                   GET    사용 가능 DN 범위 조회 (FreeDn)
 * - ipron-dn-profile-assign-dns:      PUT    내선 프로파일에 DN 일괄 배정
 * - ipron-dn-excel-export:            GET    DN 목록 엑셀 내보내기 (binary)
 * - ipron-dn-excel-import:            POST   DN 목록 엑셀 가져오기 시작 (multipart, 즉시 taskId 반환)
 * - ipron-dn-excel-import-status:     GET    DN 목록 엑셀 가져오기 진행 상태
 * - ipron-dn-call-transfer-list:      GET    조건부 착신 전환 목록
 * - ipron-dn-call-transfer-create:    POST   조건부 착신 전환 등록
 * - ipron-dn-call-transfer-update:    PUT    조건부 착신 전환 수정
 * - ipron-dn-call-transfer-delete:    DELETE 조건부 착신 전환 삭제
 * - ipron-dn-short-dial-list/create/update/delete: 단축다이얼 CRUD
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  CosEffectResponse,
  DnBatchCreateRequest,
  DnCallTransferRequest,
  DnCallTransferResponse,
  DnCountResponse,
  DnCreateRequest,
  DnFilterQuery,
  DnOptionsResponse,
  DnProfileAssignDnsRequest,
  DnRangeItem,
  DnResponse,
  DnScaRequest,
  DnScaResponse,
  DnShortDialRequest,
  DnShortDialResponse,
  DnSnrRequest,
  DnSnrResponse,
  DnSnrTodRequest,
  DnSnrTodResponse,
  DnUpdateRequest,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const dnApi = {
  // ─── List / Detail ────────────────────────────────────────────────────────

  /**
   * DN 목록 조회 (페이징)
   * Backend: ApiResponse<PagedResponse<DnResponse>> -> BFF: data.items[] -> response.data?.data?.items
   * @flow ipron-dn-list
   */
  getList: async (params?: DnFilterQuery & Record<string, unknown>): Promise<DnResponse[]> => {
    const response = await apiClient.get<ApiResponse<{ items: DnResponse[] }>>('/ipron-dn-list', { params });
    return response.data?.data?.items ?? [];
  },

  /**
   * DN 단건 조회
   * Backend: ApiResponse<DnResponse> -> BFF: data:{...} -> response.data?.data
   * @flow ipron-dn-detail
   */
  getDetail: async (id: number): Promise<DnResponse> => {
    const response = await apiClient.get<ApiResponse<DnResponse>>('/ipron-dn-detail', {
      params: { id },
    });
    return response.data?.data;
  },

  // ─── Mutations ────────────────────────────────────────────────────────────

  /**
   * DN 등록
   * @flow ipron-dn-create
   */
  create: async (data: DnCreateRequest): Promise<DnResponse> => {
    const response = await apiClient.post<ApiResponse<DnResponse>>('/ipron-dn-create', data, { actAsTenantFromBody: true });
    return response.data?.data;
  },

  /**
   * DN 수정
   * @flow ipron-dn-update
   */
  update: async ({ id, data }: { id: number; data: DnUpdateRequest }): Promise<DnResponse> => {
    const response = await apiClient.put<ApiResponse<DnResponse>>('/ipron-dn-update', data, {
      params: { id },
    });
    return response.data?.data;
  },

  /**
   * DN 다건 삭제 (연쇄: IptService + CallTransfer + ShortDial + GdnMember + DnMaster)
   * @flow ipron-dn-delete-batch
   * POST + body : URL 길이 제한 회피. BFF flow METHOD=POST, URI=/api/ipron/dns/delete-batch
   *
   * 청크 분할은 {@link DnBulkDeleteModal}이 UI 단에서 처리하므로 여기선 단순 전달.
   */
  deleteBatch: async (ids: number[]) => {
    return await apiClient.post('/ipron-dn-delete-batch', { dnIds: ids });
  },

  /**
   * DN 복사 생성 — 기존 DN 1건 템플릿으로 시작~끝 번호 범위에 복제
   * @flow ipron-dn-copy
   */
  copy: async ({ id, data }: { id: number; data: { startNo: string; endNo: string } }): Promise<DnResponse[]> => {
    const response = await apiClient.post<ApiResponse<{ value: DnResponse[] }>>('/ipron-dn-copy', data, { params: { id } });
    return response.data?.data?.value ?? [];
  },

  /**
   * DN 일괄 등록 (DN 범위 + 공통 설정)
   * @flow ipron-dn-batch-create
   */
  batchCreate: async (data: DnBatchCreateRequest): Promise<DnResponse[]> => {
    // FE는 범위(dnNoStart~dnNoEnd) 단일 객체로 보내지만 BE는 펼쳐진 List<DnCreateRequest>를
    // { items: [...] } 형태로 기대하므로 여기서 변환한다.
    const start = Number(data.dnNoStart);
    const end = Number(data.dnNoEnd);
    const pad = data.dnNoStart.length;
    const items: Array<Record<string, unknown>> = [];
    for (let n = start; n <= end; n++) {
      items.push({
        nodeId: data.nodeId,
        tenantId: data.tenantId,
        dnNo: String(n).padStart(pad, '0'),
        dnType: data.dnType,
        dnProfileId: data.dnProfileId,
        cosId: data.cosId ?? null,
        extAuthtype: data.extAuthtype,
        md5Auth: data.md5Auth,
        md5Authpwd: data.md5Authpwd ?? null,
        dnStatus: data.dnStatus ?? '0',
      });
    }
    const response = await apiClient.post<ApiResponse<{ value: DnResponse[] }>>('/ipron-dn-batch-create', { items });
    return response.data?.data?.value ?? [];
  },

  // ─── Aux (노드/테넌트/옵션) ────────────────────────────────────────────────

  /**
   * 현재 DN 수 + 계약수량 조회 (계약수량 체크용)
   * @flow ipron-dn-count
   */
  getCount: async (params: { tenantId: number }): Promise<DnCountResponse> => {
    const response = await apiClient.get<ApiResponse<DnCountResponse>>('/ipron-dn-count', { params });
    return response.data?.data;
  },

  /**
   * 폼 드롭다운 옵션 일괄 조회 (노드/테넌트별 필터링)
   * @flow ipron-dn-options
   */
  getOptions: async (params: { nodeId: number; tenantId: number; dnType?: string | null }): Promise<DnOptionsResponse> => {
    const response = await apiClient.get<ApiResponse<DnOptionsResponse>>('/ipron-dn-options', {
      params,
    });
    return response.data?.data;
  },

  /**
   * COS 선택 효과 조회 — 해당 COS 설정에 따라 DN 폼 필드 제어 규칙 반환.
   * @flow ipron-dn-cos-effect
   */
  getCosEffect: async (cosId: number): Promise<CosEffectResponse> => {
    const response = await apiClient.get<ApiResponse<CosEffectResponse>>('/ipron-dn-cos-effect', { params: { cosId } });
    return response.data?.data;
  },

  /**
   * DN 번호 중복 체크 (클러스터 Global DN + 본노드 DN)
   * @flow ipron-dn-duplicate-check
   * Backend: ApiResponse<Boolean> -> BFF: data.value:boolean
   */
  duplicateCheck: async (params: { nodeId: number; tenantId: number; dnNo: string; excludeDnId?: number | null }): Promise<boolean> => {
    const response = await apiClient.get<ApiResponse<{ value: boolean }>>('/ipron-dn-duplicate-check', { params });
    return response.data?.data?.value ?? false;
  },

  /**
   * 사용 가능 DN 범위 조회 (FreeDn 팝업용)
   * @flow ipron-dn-range
   */
  getRange: async (params: { nodeId: number; tenantId: number; dnType: string }): Promise<DnRangeItem[]> => {
    const response = await apiClient.get<ApiResponse<{ value: DnRangeItem[] }>>('/ipron-dn-range', {
      params,
    });
    return response.data?.data?.value ?? [];
  },

  /**
   * 갭6: DN 삭제 전 SCA/SNR 연관 건수 조회 (SWAT IPR20S2020S_RelationCount 정합)
   * @flow ipron-dn-relation-count
   */
  getRelationCount: async (dnId: number): Promise<number> => {
    const response = await apiClient.get<ApiResponse<number>>('/ipron-dn-relation-count', {
      params: { id: dnId },
    });
    return response.data?.data ?? 0;
  },

  /**
   * 갭7: 여유번호 검색 (SWAT IPR20S2020_FreeDn.jsp 정합)
   * startNo~endNo 범위 내 사용 가능한 DN 번호 목록 조회
   * @flow ipron-dn-range
   */
  getFreeDnRange: async (params: {
    nodeId: number;
    startNo: string;
    endNo: string;
  }): Promise<{ nodeId: number; startNo: string; endNo: string; freeDnNumbers: string[]; freeCount: number }> => {
    const response = await apiClient.get<ApiResponse<{ nodeId: number; startNo: string; endNo: string; freeDnNumbers: string[]; freeCount: number }>>('/ipron-dn-range', {
      params,
    });
    return response.data?.data;
  },

  // ─── Profile 연동 (DN 일괄 배정) ──────────────────────────────────────────

  /**
   * 내선 프로파일에 DN 일괄 배정
   * @flow ipron-dn-profile-assign-dns
   */
  assignDnsToProfile: async ({ id, data }: { id: number; data: DnProfileAssignDnsRequest }) => {
    return await apiClient.put('/ipron-dn-profile-assign-dns', data, {
      params: { id },
    });
  },

  /**
   * DN 목록 엑셀 내보내기 (AS-IS IPR20S2020 15컬럼 양식, 로그인ADN 제외).
   * Backend: byte[] (XLSX binary) — BFF가 그대로 forward.
   * @flow ipron-dn-excel-export
   */
  exportExcel: async (params?: DnFilterQuery & Record<string, unknown>): Promise<Blob> => {
    const response = await apiClient.get<Blob>('/ipron-dn-excel-export', {
      params,
      responseType: 'blob',
    });
    return (response as unknown as { data: Blob }).data;
  },

  /**
   * DN 목록 엑셀 가져오기 시작 — 비동기. 즉시 taskId 반환 후 status polling 으로 진행률 확인.
   * Backend: ApiResponse<{ taskId }> — BFF: data:{...} -> response.data?.data
   * @flow ipron-dn-excel-import
   */
  startImport: async (params: { nodeId: number; tenantId: number; file: File }): Promise<{ taskId: string }> => {
    const formData = new FormData();
    formData.append('file', params.file);
    // ⚠ Content-Type 헤더는 명시하지 않는다. axios가 FormData를 감지하면
    //    'multipart/form-data; boundary=...' 를 자동 설정한다.
    const response = await apiClient.post<ApiResponse<{ taskId: string }>>('/ipron-dn-excel-import', formData, { params: { nodeId: params.nodeId, tenantId: params.tenantId } });
    return response.data?.data;
  },

  /**
   * DN 엑셀 가져오기 진행 상태 조회 (1초 polling 용).
   * @flow ipron-dn-excel-import-status
   */
  getImportStatus: async (
    taskId: string,
  ): Promise<{
    taskId: string;
    total: number;
    processed: number;
    success: number;
    failedCount: number;
    failed: Array<{ rowNum: number; dnNo: string; reason: string }>;
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
        failed: Array<{ rowNum: number; dnNo: string; reason: string }>;
        done: boolean;
        errorMessage: string | null;
      }>
    >('/ipron-dn-excel-import-status', { params: { taskId } });
    return response.data?.data;
  },

  // ─── DN SNR (순차 호출) ───────────────────────────────────────────────────

  /**
   * DN SNR 목록.
   * Backend: ApiResponse<List<DnSnrResponse>> -> BFF: data.value[]
   * @flow ipron-dn-snr-list
   */
  getSnrList: async (dnId: number): Promise<DnSnrResponse[]> => {
    const response = await apiClient.get<ApiResponse<{ value: DnSnrResponse[] }>>('/ipron-dn-snr-list', { params: { dnId } });
    return response.data?.data?.value ?? [];
  },

  /** @flow ipron-dn-snr-create */
  createSnr: async ({ dnId, data }: { dnId: number; data: DnSnrRequest }): Promise<DnSnrResponse> => {
    const response = await apiClient.post<ApiResponse<DnSnrResponse>>('/ipron-dn-snr-create', data, { params: { dnId } });
    return response.data?.data;
  },

  /** @flow ipron-dn-snr-update */
  updateSnr: async ({ dnId, snrId, data }: { dnId: number; snrId: number; data: DnSnrRequest }): Promise<DnSnrResponse> => {
    const response = await apiClient.put<ApiResponse<DnSnrResponse>>('/ipron-dn-snr-update', data, { params: { dnId, snrId } });
    return response.data?.data;
  },

  /** @flow ipron-dn-snr-delete */
  deleteSnr: async ({ dnId, snrId }: { dnId: number; snrId: number }) => {
    return await apiClient.delete('/ipron-dn-snr-delete', { params: { dnId, snrId } });
  },

  // ─── DN SNR TOD (시간대 규칙) ─────────────────────────────────────────────

  /** @flow ipron-dn-snr-tod-list */
  getSnrTodList: async (dnId: number, snrId: number): Promise<DnSnrTodResponse[]> => {
    const response = await apiClient.get<ApiResponse<{ value: DnSnrTodResponse[] }>>('/ipron-dn-snr-tod-list', { params: { dnId, snrId } });
    return response.data?.data?.value ?? [];
  },

  /** @flow ipron-dn-snr-tod-create */
  createSnrTod: async ({ dnId, snrId, data }: { dnId: number; snrId: number; data: DnSnrTodRequest }): Promise<DnSnrTodResponse> => {
    const response = await apiClient.post<ApiResponse<DnSnrTodResponse>>('/ipron-dn-snr-tod-create', data, { params: { dnId, snrId } });
    return response.data?.data;
  },

  /** @flow ipron-dn-snr-tod-update */
  updateSnrTod: async ({ dnId, snrId, todId, data }: { dnId: number; snrId: number; todId: number; data: DnSnrTodRequest }): Promise<DnSnrTodResponse> => {
    const response = await apiClient.put<ApiResponse<DnSnrTodResponse>>('/ipron-dn-snr-tod-update', data, { params: { dnId, snrId, todId } });
    return response.data?.data;
  },

  /** @flow ipron-dn-snr-tod-delete */
  deleteSnrTod: async ({ dnId, snrId, todId }: { dnId: number; snrId: number; todId: number }) => {
    return await apiClient.delete('/ipron-dn-snr-tod-delete', { params: { dnId, snrId, todId } });
  },

  // ─── DN SCA (Shared Call Appearance) ──────────────────────────────────────

  /**
   * DN SCA 목록.
   * Backend: ApiResponse<List<DnScaResponse>> -> BFF: data.value[]
   * @flow ipron-dn-sca-list
   */
  getScaList: async (dnId: number): Promise<DnScaResponse[]> => {
    const response = await apiClient.get<ApiResponse<{ value: DnScaResponse[] }>>('/ipron-dn-sca-list', { params: { dnId } });
    return response.data?.data?.value ?? [];
  },

  /** @flow ipron-dn-sca-create */
  createSca: async ({ dnId, data }: { dnId: number; data: DnScaRequest }): Promise<DnScaResponse> => {
    const response = await apiClient.post<ApiResponse<DnScaResponse>>('/ipron-dn-sca-create', data, { params: { dnId } });
    return response.data?.data;
  },

  /** @flow ipron-dn-sca-update */
  updateSca: async ({ dnId, scaId, data }: { dnId: number; scaId: number; data: DnScaRequest }): Promise<DnScaResponse> => {
    const response = await apiClient.put<ApiResponse<DnScaResponse>>('/ipron-dn-sca-update', data, { params: { dnId, scaId } });
    return response.data?.data;
  },

  /** @flow ipron-dn-sca-delete */
  deleteSca: async ({ dnId, scaId }: { dnId: number; scaId: number }) => {
    return await apiClient.delete('/ipron-dn-sca-delete', { params: { dnId, scaId } });
  },

  // ─── 조건부 착신 전환 (DnCallTransfer) ──────────────────────────────────────

  /** @flow ipron-dn-call-transfer-list */
  getCallTransferList: async (dnId: number): Promise<DnCallTransferResponse[]> => {
    const response = await apiClient.get<ApiResponse<{ value: DnCallTransferResponse[] }>>('/ipron-dn-call-transfer-list', {
      params: { dnId },
    });
    return response.data?.data?.value ?? [];
  },

  /** @flow ipron-dn-call-transfer-create */
  createCallTransfer: async ({ dnId, data }: { dnId: number; data: DnCallTransferRequest }): Promise<DnCallTransferResponse> => {
    const response = await apiClient.post<ApiResponse<DnCallTransferResponse>>('/ipron-dn-call-transfer-create', data, {
      params: { dnId },
    });
    return response.data?.data;
  },

  /** @flow ipron-dn-call-transfer-update */
  updateCallTransfer: async ({ dnId, caseTransId, data }: { dnId: number; caseTransId: number; data: DnCallTransferRequest }): Promise<DnCallTransferResponse> => {
    const response = await apiClient.put<ApiResponse<DnCallTransferResponse>>('/ipron-dn-call-transfer-update', data, {
      params: { dnId, caseTransId },
    });
    return response.data?.data;
  },

  /** @flow ipron-dn-call-transfer-delete */
  deleteCallTransfer: async ({ dnId, caseTransId }: { dnId: number; caseTransId: number }) => {
    return await apiClient.delete('/ipron-dn-call-transfer-delete', { params: { dnId, caseTransId } });
  },

  // ─── 단축다이얼 (ShortDial) ────────────────────────────────────────────────

  /** @flow ipron-dn-short-dial-list */
  getShortDialList: async (dnId: number): Promise<DnShortDialResponse[]> => {
    const response = await apiClient.get<ApiResponse<{ value: DnShortDialResponse[] }>>('/ipron-dn-short-dial-list', { params: { dnId } });
    return response.data?.data?.value ?? [];
  },

  /** @flow ipron-dn-short-dial-create */
  createShortDial: async ({ dnId, data }: { dnId: number; data: DnShortDialRequest }): Promise<DnShortDialResponse> => {
    const response = await apiClient.post<ApiResponse<DnShortDialResponse>>('/ipron-dn-short-dial-create', data, { params: { dnId } });
    return response.data?.data;
  },

  /** @flow ipron-dn-short-dial-update */
  updateShortDial: async ({ dnId, shortDial, data }: { dnId: number; shortDial: string; data: DnShortDialRequest }): Promise<DnShortDialResponse> => {
    const response = await apiClient.put<ApiResponse<DnShortDialResponse>>('/ipron-dn-short-dial-update', data, { params: { dnId, shortDial } });
    return response.data?.data;
  },

  /** @flow ipron-dn-short-dial-delete */
  deleteShortDial: async ({ dnId, shortDial }: { dnId: number; shortDial: string }) => {
    return await apiClient.delete('/ipron-dn-short-dial-delete', { params: { dnId, shortDial } });
  },
};
