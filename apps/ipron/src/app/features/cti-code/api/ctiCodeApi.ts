/**
 * CTI 코드 관리 API 클라이언트.
 *
 * BFF Aggregation Flow 매핑 (시드: C:\bt-admin-ipron-work\cti-code-mgmt\seed.sql):
 *
 *  REASON_CODE (/api/ipron/reason-codes)
 *    ipron-cti-code-reason-list          GET   목록 (?tenantId&codeType)
 *    ipron-cti-code-reason-detail        GET   상세 (?tenantId&codeType&reasonCode)
 *    ipron-cti-code-reason-create        POST  등록
 *    ipron-cti-code-reason-update        PUT   수정
 *    ipron-cti-code-reason-delete-batch  POST  일괄 삭제
 *    ipron-cti-code-reason-copy          POST  테넌트 일괄 복사
 *    ipron-cti-code-reason-usage         GET   사용 통계 (Phase 1 placeholder)
 *
 *  MEDIA_TYPE (/api/ipron/media-types)
 *    ipron-cti-code-media-list           GET   목록 (?classCd)
 *    ipron-cti-code-media-detail         GET   상세 (?classCd&codeCd)
 *    ipron-cti-code-media-create         POST  등록
 *    ipron-cti-code-media-update         PUT   수정
 *    ipron-cti-code-media-usage          GET   사용처 화면 목록 (?classCd)
 *
 *  Category (/api/ipron/cti-codes)
 *    ipron-cti-code-categories           GET   5 카테고리 메타 (?tenantId)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  CtiCodeCategory,
  MediaTypeListParams,
  MediaTypeResponse,
  MediaTypeUpsertRequest,
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

interface MediaTypePathParams {
  classCd: string;
  codeCd: string;
}

export const ctiCodeApi = {
  // ─── Category ─────────────────────────────────────────────────────────
  getCategories: async (params?: { tenantId?: number }): Promise<CtiCodeCategory[]> => {
    const res = await apiClient.get<ApiResponse<{ value: CtiCodeCategory[] }>>('/ipron-cti-code-categories', { params });
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

  copyReasonCodes: async (body: ReasonCodeCopyRequest): Promise<ReasonCodeCopyResult> => {
    const res = await apiClient.post<ApiResponse<ReasonCodeCopyResult>>('/ipron-cti-code-reason-copy', body);
    return res.data?.data;
  },

  getReasonCodeUsage: async (params?: ReasonCodeListParams): Promise<ReasonCodeResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: ReasonCodeResponse[] }>>('/ipron-cti-code-reason-usage', { params });
    return res.data?.data?.value ?? [];
  },

  // ─── MediaType ────────────────────────────────────────────────────────
  getMediaTypes: async (params?: MediaTypeListParams): Promise<MediaTypeResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: MediaTypeResponse[] }>>('/ipron-cti-code-media-list', { params });
    return res.data?.data?.value ?? [];
  },

  getMediaTypeDetail: async (path: MediaTypePathParams): Promise<MediaTypeResponse> => {
    const res = await apiClient.get<ApiResponse<MediaTypeResponse>>('/ipron-cti-code-media-detail', { params: path });
    return res.data?.data;
  },

  createMediaType: async (body: MediaTypeUpsertRequest): Promise<MediaTypeResponse> => {
    const res = await apiClient.post<ApiResponse<MediaTypeResponse>>('/ipron-cti-code-media-create', body);
    return res.data?.data;
  },

  updateMediaType: async (path: MediaTypePathParams, body: MediaTypeUpsertRequest): Promise<MediaTypeResponse> => {
    const res = await apiClient.put<ApiResponse<MediaTypeResponse>>('/ipron-cti-code-media-update', body, { params: path });
    return res.data?.data;
  },

  getMediaTypeUsage: async (classCd: string): Promise<string[]> => {
    const res = await apiClient.get<ApiResponse<{ value: string[] }>>('/ipron-cti-code-media-usage', { params: { classCd } });
    return res.data?.data?.value ?? [];
  },
};
