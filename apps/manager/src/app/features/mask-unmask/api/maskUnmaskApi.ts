import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type {
  AuditByTargetParams,
  AuditByUserParams,
  AuditListParams,
  MaskAudit,
  MaskUnmaskRequest,
  UnmaskApproveRequest,
  UnmaskCheckResponse,
  UnmaskCreateRequest,
  UnmaskListParams,
  UnmaskRejectRequest,
} from '../types/maskUnmask.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const maskUnmaskApi = {
  /** 검토 필요 — 관리자가 본인 권한 카테고리만 조회 (서버에서 필터링) */
  listPending: async (params: UnmaskListParams = {}): Promise<MaskUnmaskRequest[]> => {
    const response = await apiClient.get<ListResponse<MaskUnmaskRequest>>('/manager-mask-unmask-list', { params: { ...params } });
    return extractList(response);
  },

  /** 내 요청 이력 */
  myRequests: async (): Promise<MaskUnmaskRequest[]> => {
    const response = await apiClient.get<ListResponse<MaskUnmaskRequest>>('/manager-mask-unmask-mine');
    return extractList(response);
  },

  /** 평문 노출 가능 여부 체크 (특정 대상 기준) */
  check: async (params: { targetType: string; targetId: string }): Promise<UnmaskCheckResponse> => {
    const response = await apiClient.get<DetailResponse<UnmaskCheckResponse>>('/manager-mask-unmask-check', { params });
    return extractDetail(response);
  },

  /** 해지 요청 등록 */
  create: async (data: UnmaskCreateRequest): Promise<MaskUnmaskRequest> => {
    const response = await apiClient.post<DetailResponse<MaskUnmaskRequest>>('/manager-mask-unmask-create', data);
    return extractDetail(response);
  },

  /** 승인 (관리자 전용) */
  approve: async (data: UnmaskApproveRequest): Promise<MaskUnmaskRequest> => {
    const response = await apiClient.post<DetailResponse<MaskUnmaskRequest>>('/manager-mask-unmask-approve', data);
    return extractDetail(response);
  },

  /** 반려 (관리자 전용) */
  reject: async (data: UnmaskRejectRequest): Promise<MaskUnmaskRequest> => {
    const response = await apiClient.post<DetailResponse<MaskUnmaskRequest>>('/manager-mask-unmask-reject', data);
    return extractDetail(response);
  },

  /** 토큰 회수 (요청자 본인 또는 관리자) */
  revoke: async (requestId: number): Promise<void> => {
    await apiClient.delete('/manager-mask-unmask-revoke', { params: { requestId } });
  },

  /** 감사 로그 — 테넌트 단위 */
  auditList: async (params: AuditListParams = {}): Promise<MaskAudit[]> => {
    const response = await apiClient.get<ListResponse<MaskAudit>>('/manager-mask-audit-list', { params });
    return extractList(response);
  },

  /** 감사 로그 — 사용자별 */
  auditByUser: async (params: AuditByUserParams): Promise<MaskAudit[]> => {
    const response = await apiClient.get<ListResponse<MaskAudit>>('/manager-mask-audit-by-user', { params });
    return extractList(response);
  },

  /** 감사 로그 — 대상별 */
  auditByTarget: async (params: AuditByTargetParams): Promise<MaskAudit[]> => {
    const response = await apiClient.get<ListResponse<MaskAudit>>('/manager-mask-audit-by-target', { params });
    return extractList(response);
  },
};
