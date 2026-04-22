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
 */
import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type {
  CosEffectResponse,
  DnBatchCreateRequest,
  DnCountResponse,
  DnCreateRequest,
  DnFilterQuery,
  DnOptionsResponse,
  DnProfileAssignDnsRequest,
  DnRangeItem,
  DnResponse,
  DnScaRequest,
  DnScaResponse,
  DnSnrRequest,
  DnSnrResponse,
  DnSnrTodRequest,
  DnSnrTodResponse,
  DnUpdateRequest,
  NodeTenantItem,
} from '../types/dn.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const dnApi = {
  // ─── List / Detail ────────────────────────────────────────────────────────

  /**
   * DN 목록 조회 (페이징)
   * Backend: ApiResponse<PagedResponse<DnResponse>> -> BFF: data.items[] -> extractList
   * @flow ipron-dn-list
   */
  getList: async (params?: DnFilterQuery & Record<string, unknown>): Promise<DnResponse[]> => {
    const response = await apiClient.get<ListResponse<DnResponse>>('/ipron-dn-list', { params });
    return extractList(response);
  },

  /**
   * DN 단건 조회
   * Backend: ApiResponse<DnResponse> -> BFF: data:{...} -> extractDetail
   * @flow ipron-dn-detail
   */
  getDetail: async (id: number): Promise<DnResponse> => {
    const response = await apiClient.get<DetailResponse<DnResponse>>('/ipron-dn-detail', {
      params: { id },
    });
    return extractDetail(response);
  },

  // ─── Mutations ────────────────────────────────────────────────────────────

  /**
   * DN 등록
   * @flow ipron-dn-create
   */
  create: async (data: DnCreateRequest): Promise<DnResponse> => {
    const response = await apiClient.post<DetailResponse<DnResponse>>('/ipron-dn-create', data);
    return extractDetail(response);
  },

  /**
   * DN 수정
   * @flow ipron-dn-update
   */
  update: async ({ id, data }: { id: number; data: DnUpdateRequest }): Promise<DnResponse> => {
    const response = await apiClient.put<DetailResponse<DnResponse>>('/ipron-dn-update', data, {
      params: { id },
    });
    return extractDetail(response);
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
    const response = await apiClient.post<DetailResponse<{ value: DnResponse[] }>>('/ipron-dn-copy', data, { params: { id } });
    return extractDetail(response)?.value ?? [];
  },

  /**
   * DN 일괄 등록 (DN 범위 + 공통 설정)
   * @flow ipron-dn-batch-create
   */
  batchCreate: async (data: DnBatchCreateRequest): Promise<DnResponse[]> => {
    const response = await apiClient.post<DetailResponse<{ value: DnResponse[] }>>('/ipron-dn-batch-create', data);
    return extractDetail(response)?.value ?? [];
  },

  // ─── Aux (노드/테넌트/옵션) ────────────────────────────────────────────────

  /**
   * 노드-테넌트 매핑 조회 (계약수량 포함)
   * Backend: ApiResponse<List<NodeTenantItem>> -> BFF: data.value[]
   * @flow ipron-dn-node-tenants
   */
  getNodeTenants: async (): Promise<NodeTenantItem[]> => {
    const response = await apiClient.get<DetailResponse<{ value: NodeTenantItem[] }>>('/ipron-dn-node-tenants');
    return extractDetail(response)?.value ?? [];
  },

  /**
   * 현재 DN 수 + 계약수량 조회 (계약수량 체크용)
   * @flow ipron-dn-count
   */
  getCount: async (params: { tenantId: number }): Promise<DnCountResponse> => {
    const response = await apiClient.get<DetailResponse<DnCountResponse>>('/ipron-dn-count', { params });
    return extractDetail(response);
  },

  /**
   * 폼 드롭다운 옵션 일괄 조회 (노드/테넌트별 필터링)
   * @flow ipron-dn-options
   */
  getOptions: async (params: { nodeId: number; tenantId: number; dnType?: string | null }): Promise<DnOptionsResponse> => {
    const response = await apiClient.get<DetailResponse<DnOptionsResponse>>('/ipron-dn-options', {
      params,
    });
    return extractDetail(response);
  },

  /**
   * COS 선택 효과 조회 — 해당 COS 설정에 따라 DN 폼 필드 제어 규칙 반환.
   * @flow ipron-dn-cos-effect
   */
  getCosEffect: async (cosId: number): Promise<CosEffectResponse> => {
    const response = await apiClient.get<DetailResponse<CosEffectResponse>>('/ipron-dn-cos-effect', { params: { cosId } });
    return extractDetail(response);
  },

  /**
   * DN 번호 중복 체크 (클러스터 Global DN + 본노드 DN)
   * @flow ipron-dn-duplicate-check
   * Backend: ApiResponse<Boolean> -> BFF: data.value:boolean
   */
  duplicateCheck: async (params: { nodeId: number; tenantId: number; dnNo: string; excludeDnId?: number | null }): Promise<boolean> => {
    const response = await apiClient.get<DetailResponse<{ value: boolean }>>('/ipron-dn-duplicate-check', { params });
    return extractDetail(response)?.value ?? false;
  },

  /**
   * 사용 가능 DN 범위 조회 (FreeDn 팝업용)
   * @flow ipron-dn-range
   */
  getRange: async (params: { nodeId: number; tenantId: number; dnType: string }): Promise<DnRangeItem[]> => {
    const response = await apiClient.get<DetailResponse<{ value: DnRangeItem[] }>>('/ipron-dn-range', {
      params,
    });
    return extractDetail(response)?.value ?? [];
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

  // ─── DN SNR (순차 호출) ───────────────────────────────────────────────────

  /**
   * DN SNR 목록.
   * Backend: ApiResponse<List<DnSnrResponse>> -> BFF: data.value[]
   * @flow ipron-dn-snr-list
   */
  getSnrList: async (dnId: number): Promise<DnSnrResponse[]> => {
    const response = await apiClient.get<DetailResponse<{ value: DnSnrResponse[] }>>('/ipron-dn-snr-list', { params: { dnId } });
    return extractDetail(response)?.value ?? [];
  },

  /** @flow ipron-dn-snr-create */
  createSnr: async ({ dnId, data }: { dnId: number; data: DnSnrRequest }): Promise<DnSnrResponse> => {
    const response = await apiClient.post<DetailResponse<DnSnrResponse>>('/ipron-dn-snr-create', data, { params: { dnId } });
    return extractDetail(response);
  },

  /** @flow ipron-dn-snr-update */
  updateSnr: async ({ dnId, snrId, data }: { dnId: number; snrId: number; data: DnSnrRequest }): Promise<DnSnrResponse> => {
    const response = await apiClient.put<DetailResponse<DnSnrResponse>>('/ipron-dn-snr-update', data, { params: { dnId, snrId } });
    return extractDetail(response);
  },

  /** @flow ipron-dn-snr-delete */
  deleteSnr: async ({ dnId, snrId }: { dnId: number; snrId: number }) => {
    return await apiClient.delete('/ipron-dn-snr-delete', { params: { dnId, snrId } });
  },

  // ─── DN SNR TOD (시간대 규칙) ─────────────────────────────────────────────

  /** @flow ipron-dn-snr-tod-list */
  getSnrTodList: async (dnId: number, snrId: number): Promise<DnSnrTodResponse[]> => {
    const response = await apiClient.get<DetailResponse<{ value: DnSnrTodResponse[] }>>('/ipron-dn-snr-tod-list', { params: { dnId, snrId } });
    return extractDetail(response)?.value ?? [];
  },

  /** @flow ipron-dn-snr-tod-create */
  createSnrTod: async ({ dnId, snrId, data }: { dnId: number; snrId: number; data: DnSnrTodRequest }): Promise<DnSnrTodResponse> => {
    const response = await apiClient.post<DetailResponse<DnSnrTodResponse>>('/ipron-dn-snr-tod-create', data, { params: { dnId, snrId } });
    return extractDetail(response);
  },

  /** @flow ipron-dn-snr-tod-update */
  updateSnrTod: async ({ dnId, snrId, todId, data }: { dnId: number; snrId: number; todId: number; data: DnSnrTodRequest }): Promise<DnSnrTodResponse> => {
    const response = await apiClient.put<DetailResponse<DnSnrTodResponse>>('/ipron-dn-snr-tod-update', data, { params: { dnId, snrId, todId } });
    return extractDetail(response);
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
    const response = await apiClient.get<DetailResponse<{ value: DnScaResponse[] }>>('/ipron-dn-sca-list', { params: { dnId } });
    return extractDetail(response)?.value ?? [];
  },

  /** @flow ipron-dn-sca-create */
  createSca: async ({ dnId, data }: { dnId: number; data: DnScaRequest }): Promise<DnScaResponse> => {
    const response = await apiClient.post<DetailResponse<DnScaResponse>>('/ipron-dn-sca-create', data, { params: { dnId } });
    return extractDetail(response);
  },

  /** @flow ipron-dn-sca-update */
  updateSca: async ({ dnId, scaId, data }: { dnId: number; scaId: number; data: DnScaRequest }): Promise<DnScaResponse> => {
    const response = await apiClient.put<DetailResponse<DnScaResponse>>('/ipron-dn-sca-update', data, { params: { dnId, scaId } });
    return extractDetail(response);
  },

  /** @flow ipron-dn-sca-delete */
  deleteSca: async ({ dnId, scaId }: { dnId: number; scaId: number }) => {
    return await apiClient.delete('/ipron-dn-sca-delete', { params: { dnId, scaId } });
  },
};
