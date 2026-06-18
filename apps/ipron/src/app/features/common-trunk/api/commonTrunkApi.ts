/**
 * 공용 트렁크 API 클라이언트 (노드 공용, 테넌트 무관).
 *
 * SIP 트렁크 BE 100% 공유 + `tenantScope=common` 고정 분리.
 * 공용 트렁크 = TENANT_ID=0 데이터. 등록 시 tenantId=0.
 *
 * BFF Aggregation Flow 매핑 (시드: C:\\bt-admin-ipron-work\\ipron-common-trunk\\seed.sql):
 *  - ipron-common-trunk-nodes          GET  노드 카드/탭 요약 (/sip-trunks/nodes?tenantScope=common)
 *  - ipron-common-trunk-list           GET  트렁크 목록 (/sip-trunks?nodeId&tenantScope=common)
 *  - ipron-common-trunk-detail         GET  트렁크 상세 (/sip-trunks/{id})
 *  - ipron-common-trunk-create         POST 트렁크 등록 (tenantId=0)
 *  - ipron-common-trunk-update         PUT  트렁크 수정 (/sip-trunks/{id})
 *  - ipron-common-trunk-delete-batch   POST 트렁크 일괄 삭제 (body: sipTrunkIds[])
 *  - ipron-common-trunk-channel-usage  GET  트렁크별 점유 채널 합계 (?sipTrunkIds=1,2,3)
 *  - ipron-common-gdn-list             GET  공용 그룹DN 목록 (/sip-gdns?nodeId&tenantScope=common&keyword)
 *  - ipron-common-gdn-detail           GET  공용 그룹DN 상세 (/sip-gdns/{id})
 *  - ipron-common-gdn-create           POST 공용 그룹DN 등록 (tenantId=0)
 *  - ipron-common-gdn-update           PUT  공용 그룹DN 수정 (/sip-gdns/{id})
 *  - ipron-common-gdn-delete-batch     POST 공용 그룹DN 일괄 삭제 (body: gdnIds[])
 *  - ipron-common-gdn-dup-check        GET  번호 중복 검증 (?nodeId&gdnNo[&excludeGdnId])
 *  - ipron-common-trunk-members-list   GET  멤버 풀 (/sip-trunk-members?gdnId&nodeId&tenantScope=common)
 *  - ipron-common-trunk-members-save   POST 멤버 일괄 저장
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  AssignFilter,
  CommonGdnCreateRequest,
  CommonGdnResponse,
  CommonGdnUpdateRequest,
  CommonTrunkCreateRequest,
  CommonTrunkMemberResponse,
  CommonTrunkMemberSaveRequest,
  CommonTrunkMemberSaveResult,
  CommonTrunkNodeSummary,
  CommonTrunkResponse,
  CommonTrunkUpdateRequest,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/** 공용 트렁크 화면은 항상 공용 스코프. */
const COMMON_SCOPE = 'common' as const;
/** 공용 그룹DN/트렁크 등록 시 테넌트 귀속 없음(TENANT_ID=0). */
export const COMMON_TENANT_ID = 0;

export const commonTrunkApi = {
  // ─── 노드 카드/탭 요약 ─────────────────────────────────────────────
  getNodes: async (): Promise<CommonTrunkNodeSummary[]> => {
    const res = await apiClient.get<ApiResponse<{ value: CommonTrunkNodeSummary[] }>>('/ipron-common-trunk-nodes', {
      params: { tenantScope: COMMON_SCOPE },
    });
    return res.data?.data?.value ?? [];
  },

  // ─── 트렁크 마스터 ─────────────────────────────────────────────────
  getTrunks: async (params?: { nodeId?: number }): Promise<CommonTrunkResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: CommonTrunkResponse[] }>>('/ipron-common-trunk-list', {
      params: { ...params, tenantScope: COMMON_SCOPE },
    });
    return res.data?.data?.value ?? [];
  },

  getTrunkDetail: async (sipTrunkId: number): Promise<CommonTrunkResponse> => {
    const res = await apiClient.get<ApiResponse<CommonTrunkResponse>>('/ipron-common-trunk-detail', {
      params: { sipTrunkId },
    });
    return res.data?.data;
  },

  createTrunk: async (body: CommonTrunkCreateRequest): Promise<CommonTrunkResponse> => {
    const res = await apiClient.post<ApiResponse<CommonTrunkResponse>>('/ipron-common-trunk-create', {
      ...body,
      tenantId: COMMON_TENANT_ID,
    });
    return res.data?.data;
  },

  updateTrunk: async (sipTrunkId: number, body: CommonTrunkUpdateRequest): Promise<CommonTrunkResponse> => {
    const res = await apiClient.put<ApiResponse<CommonTrunkResponse>>('/ipron-common-trunk-update', body, {
      params: { sipTrunkId },
    });
    return res.data?.data;
  },

  deleteTrunks: async (sipTrunkIds: number[]): Promise<void> => {
    await apiClient.post('/ipron-common-trunk-delete-batch', sipTrunkIds);
  },

  // ─── 공용 그룹DN ───────────────────────────────────────────────────
  getGdns: async (params?: { nodeId?: number; keyword?: string }): Promise<CommonGdnResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: CommonGdnResponse[] }>>('/ipron-common-gdn-list', {
      params: { ...params, tenantScope: COMMON_SCOPE },
    });
    return res.data?.data?.value ?? [];
  },

  getGdnDetail: async (gdnId: number): Promise<CommonGdnResponse> => {
    const res = await apiClient.get<ApiResponse<CommonGdnResponse>>('/ipron-common-gdn-detail', {
      params: { gdnId },
    });
    return res.data?.data;
  },

  duplicateCheckGdn: async (params: { nodeId: number; gdnNo: string; excludeGdnId?: number }): Promise<boolean> => {
    const res = await apiClient.get<ApiResponse<{ value: boolean }>>('/ipron-common-gdn-dup-check', { params });
    return res.data?.data?.value ?? false;
  },

  /** 갭7: GDN 이름 중복 검증 — SWAT GdnNameDup.do 정합 */
  duplicateCheckGdnName: async (params: { nodeId: number; gdnName: string; excludeGdnId?: number }): Promise<boolean> => {
    const res = await apiClient.get<ApiResponse<{ value: boolean }>>('/ipron-common-gdn-dup-name', { params });
    return res.data?.data?.value ?? false;
  },

  /** 갭11: GDN 배정 트렁크 멤버 존재 여부 — DR노드 변경 전 체크 */
  gdnMembersExist: async (gdnId: number): Promise<boolean> => {
    const res = await apiClient.get<ApiResponse<{ value: boolean }>>('/ipron-common-gdn-members-exist', { params: { gdnId } });
    return res.data?.data?.value ?? false;
  },

  /** 갭1: 멘트 콤보 옵션 — ACD GDN과 동일한 TB_IE_ANNOUNCEBGM 참조 */
  getMentOptions: async (params?: { nodeId?: number }): Promise<{ id: number; name: string }[]> => {
    const res = await apiClient.get<ApiResponse<{ value: { id: number; name: string }[] }>>('/ipron-acd-gdn-ment-options', { params });
    return res.data?.data?.value ?? [];
  },

  createGdn: async (body: CommonGdnCreateRequest): Promise<CommonGdnResponse> => {
    const res = await apiClient.post<ApiResponse<CommonGdnResponse>>('/ipron-common-gdn-create', {
      ...body,
      tenantId: COMMON_TENANT_ID,
    });
    return res.data?.data;
  },

  updateGdn: async (gdnId: number, body: CommonGdnUpdateRequest): Promise<CommonGdnResponse> => {
    const res = await apiClient.put<ApiResponse<CommonGdnResponse>>('/ipron-common-gdn-update', body, {
      params: { gdnId },
    });
    return res.data?.data;
  },

  deleteGdns: async (gdnIds: number[]): Promise<void> => {
    await apiClient.post('/ipron-common-gdn-delete-batch', gdnIds);
  },

  // ─── 멤버 배정 (N:N) ───────────────────────────────────────────────
  getMembers: async (params: { gdnId: number; nodeId: number; assignFilter?: AssignFilter }): Promise<CommonTrunkMemberResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: CommonTrunkMemberResponse[] }>>('/ipron-common-trunk-members-list', {
      params: { ...params, tenantScope: COMMON_SCOPE },
    });
    return res.data?.data?.value ?? [];
  },

  saveMembers: async (body: CommonTrunkMemberSaveRequest): Promise<CommonTrunkMemberSaveResult> => {
    const res = await apiClient.post<ApiResponse<CommonTrunkMemberSaveResult>>('/ipron-common-trunk-members-save', body);
    return res.data?.data;
  },
};
