/**
 * 휴식/ACW 사유 코드 관리 API 클라이언트.
 *
 * BFF Aggregation Flow 매핑 (시드: C:\bt-admin-ipron-work\cti-code-mgmt\seed.sql):
 *
 *  ipron-cti-code-tenant-stats         GET   테넌트별 휴식/ACW 코드 통계 (카드 슬라이더)
 *  ipron-cti-code-reason-list          GET   목록 (?tenantId&codeType)
 *  ipron-cti-code-reason-detail        GET   상세 (?tenantId&codeType&reasonCode)
 *  ipron-cti-code-reason-create        POST  등록
 *  ipron-cti-code-reason-update        PUT   수정
 *  ipron-cti-code-reason-delete-batch  POST  일괄 삭제
 *  ipron-cti-code-reason-copy          POST  테넌트 일괄 복사
 *  ipron-cti-code-reason-usage         GET   사용 통계 (Phase 1 placeholder)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  CtiCodeTenantStat,
  ReasonCodeCopyRequest,
  ReasonCodeCopyResult,
  ReasonCodeCreateRequest,
  ReasonCodeListParams,
  ReasonCodeResponse,
  ReasonCodeUpdateRequest,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

interface ReasonCodePathParams {
  tenantId: number;
  codeType: number;
  reasonCode: number;
}

export const ctiCodeApi = {
  // ─── Tenant Stats (상단 카드 슬라이더 — ADN 패턴) ─────────────────────
  getTenantStats: async (): Promise<CtiCodeTenantStat[]> => {
    const res = await apiClient.get<ApiResponse<{ value: CtiCodeTenantStat[] }>>('/ipron-cti-code-tenant-stats');
    return res.data?.data?.value ?? [];
  },

  // ─── ReasonCode ───────────────────────────────────────────────────────
  getReasonCodes: async (params?: ReasonCodeListParams): Promise<ReasonCodeResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: ReasonCodeResponse[] }>>('/ipron-cti-code-reason-list', { params });
    return res.data?.data?.value ?? [];
  },

  getReasonCodeDetail: async (path: ReasonCodePathParams): Promise<ReasonCodeResponse> => {
    const res = await apiClient.get<ApiResponse<ReasonCodeResponse>>('/ipron-cti-code-reason-detail', { params: path });
    return res.data?.data;
  },

  createReasonCode: async (body: ReasonCodeCreateRequest): Promise<ReasonCodeResponse> => {
    const res = await apiClient.post<ApiResponse<ReasonCodeResponse>>('/ipron-cti-code-reason-create', body);
    return res.data?.data;
  },

  updateReasonCode: async (path: ReasonCodePathParams, body: ReasonCodeUpdateRequest): Promise<ReasonCodeResponse> => {
    const res = await apiClient.put<ApiResponse<ReasonCodeResponse>>('/ipron-cti-code-reason-update', body, { params: path });
    return res.data?.data;
  },

  deleteReasonCode: async (path: ReasonCodePathParams): Promise<void> => {
    await apiClient.post('/ipron-cti-code-reason-delete-batch', [path]);
  },

  deleteReasonCodesBatch: async (paths: ReasonCodePathParams[]): Promise<void> => {
    await apiClient.post('/ipron-cti-code-reason-delete-batch', paths);
  },

  copyReasonCodes: async (body: ReasonCodeCopyRequest): Promise<ReasonCodeCopyResult> => {
    const res = await apiClient.post<ApiResponse<ReasonCodeCopyResult>>('/ipron-cti-code-reason-copy', body);
    return res.data?.data;
  },

  getReasonCodeUsage: async (params?: ReasonCodeListParams): Promise<ReasonCodeResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: ReasonCodeResponse[] }>>('/ipron-cti-code-reason-usage', { params });
    return res.data?.data?.value ?? [];
  },
};
