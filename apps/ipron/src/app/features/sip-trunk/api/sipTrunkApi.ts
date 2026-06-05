/**
 * SIP 트렁크(테넌트) API 클라이언트.
 *
 * BFF Aggregation Flow 매핑 (시드: C:\\bt-admin-ipron-work\\ipron-sip-trunk\\seed.sql — 통합 워커 담당):
 *  좌패널 그룹DN (GDN_TYPE=18)
 *   - ipron-sip-gdn-list             GET  목록 (?nodeId&tenantScope&keyword)
 *   - ipron-sip-gdn-detail           GET  상세 ({gdnId})
 *   - ipron-sip-gdn-dup-check        GET  번호 중복 검증 (?nodeId&gdnNo&excludeGdnId)
 *   - ipron-sip-gdn-create           POST 등록
 *   - ipron-sip-gdn-update           PUT  수정 ({gdnId})
 *   - ipron-sip-gdn-delete-batch     POST 일괄 삭제 (body: gdnIds[])
 *  우패널 트렁크 마스터
 *   - ipron-sip-trunk-list           GET  목록 (?nodeId&tenantScope)
 *   - ipron-sip-trunk-nodes          GET  노드 요약 (카드 슬라이더, ?tenantScope)
 *   - ipron-sip-trunk-channel-usage  GET  채널 사용량 (?sipTrunkIds=1,2,3)
 *   - ipron-sip-trunk-detail         GET  상세 ({sipTrunkId})
 *   - ipron-sip-trunk-create         POST 등록 (시작DN+채널수 → TDN 자동채번)
 *   - ipron-sip-trunk-update         PUT  수정 ({sipTrunkId})
 *   - ipron-sip-trunk-delete-batch   POST 일괄 삭제 (body: sipTrunkIds[])
 *  멤버 배정 (N:N)
 *   - ipron-sip-trunk-members-list   GET  멤버 그리드 (?gdnId&nodeId&assignFilter&tenantScope)
 *   - ipron-sip-trunk-members-save   POST 일괄 저장 (rows i/u/d 자동 분류)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  ChannelUsage,
  SipGdnCreateRequest,
  SipGdnResponse,
  SipGdnUpdateRequest,
  SipTrunkCreateRequest,
  SipTrunkMemberResponse,
  SipTrunkMemberSaveRequest,
  SipTrunkMemberSaveResult,
  SipTrunkNodeSummary,
  SipTrunkResponse,
  SipTrunkUpdateRequest,
  TenantScope,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const sipTrunkApi = {
  // ─── 그룹DN (GDN_TYPE=18) ────────────────────────────────────────
  getGdnList: async (params?: { nodeId?: number; tenantScope?: TenantScope; keyword?: string }): Promise<SipGdnResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: SipGdnResponse[] }>>('/ipron-sip-gdn-list', { params });
    return res.data?.data?.value ?? [];
  },

  getGdnDetail: async (gdnId: number): Promise<SipGdnResponse> => {
    const res = await apiClient.get<ApiResponse<SipGdnResponse>>('/ipron-sip-gdn-detail', { params: { gdnId } });
    return res.data?.data;
  },

  duplicateCheckGdn: async (params: { nodeId: number; gdnNo: string; excludeGdnId?: number }): Promise<boolean> => {
    const res = await apiClient.get<ApiResponse<{ value: boolean }>>('/ipron-sip-gdn-dup-check', { params });
    return res.data?.data?.value ?? false;
  },

  createGdn: async (body: SipGdnCreateRequest): Promise<SipGdnResponse> => {
    const res = await apiClient.post<ApiResponse<SipGdnResponse>>('/ipron-sip-gdn-create', body);
    return res.data?.data;
  },

  updateGdn: async (gdnId: number, body: SipGdnUpdateRequest): Promise<SipGdnResponse> => {
    const res = await apiClient.put<ApiResponse<SipGdnResponse>>('/ipron-sip-gdn-update', body, { params: { gdnId } });
    return res.data?.data;
  },

  deleteGdnBatch: async (gdnIds: number[]): Promise<void> => {
    await apiClient.post('/ipron-sip-gdn-delete-batch', gdnIds);
  },

  // ─── 트렁크 마스터 ───────────────────────────────────────────────
  getTrunkList: async (params?: { nodeId?: number; tenantScope?: TenantScope }): Promise<SipTrunkResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: SipTrunkResponse[] }>>('/ipron-sip-trunk-list', { params });
    return res.data?.data?.value ?? [];
  },

  getTrunkNodes: async (params?: { tenantScope?: TenantScope }): Promise<SipTrunkNodeSummary[]> => {
    const res = await apiClient.get<ApiResponse<{ value: SipTrunkNodeSummary[] }>>('/ipron-sip-trunk-nodes', { params });
    return res.data?.data?.value ?? [];
  },

  getChannelUsage: async (sipTrunkIds: number[]): Promise<ChannelUsage[]> => {
    const res = await apiClient.get<ApiResponse<{ value: ChannelUsage[] }>>('/ipron-sip-trunk-channel-usage', {
      params: { sipTrunkIds: sipTrunkIds.join(',') },
    });
    return res.data?.data?.value ?? [];
  },

  getTrunkDetail: async (sipTrunkId: number): Promise<SipTrunkResponse> => {
    const res = await apiClient.get<ApiResponse<SipTrunkResponse>>('/ipron-sip-trunk-detail', { params: { sipTrunkId } });
    return res.data?.data;
  },

  createTrunk: async (body: SipTrunkCreateRequest): Promise<SipTrunkResponse> => {
    const res = await apiClient.post<ApiResponse<SipTrunkResponse>>('/ipron-sip-trunk-create', body);
    return res.data?.data;
  },

  updateTrunk: async (sipTrunkId: number, body: SipTrunkUpdateRequest): Promise<SipTrunkResponse> => {
    const res = await apiClient.put<ApiResponse<SipTrunkResponse>>('/ipron-sip-trunk-update', body, { params: { sipTrunkId } });
    return res.data?.data;
  },

  deleteTrunkBatch: async (sipTrunkIds: number[]): Promise<void> => {
    await apiClient.post('/ipron-sip-trunk-delete-batch', sipTrunkIds);
  },

  // ─── 멤버 배정 (N:N) ─────────────────────────────────────────────
  getMembers: async (params: { gdnId: number; nodeId: number; assignFilter?: 'all' | 'assigned' | 'unassigned'; tenantScope?: TenantScope }): Promise<SipTrunkMemberResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: SipTrunkMemberResponse[] }>>('/ipron-sip-trunk-members-list', { params });
    return res.data?.data?.value ?? [];
  },

  saveMembers: async (body: SipTrunkMemberSaveRequest): Promise<SipTrunkMemberSaveResult> => {
    const res = await apiClient.post<ApiResponse<SipTrunkMemberSaveResult>>('/ipron-sip-trunk-members-save', body);
    return res.data?.data;
  },
};
