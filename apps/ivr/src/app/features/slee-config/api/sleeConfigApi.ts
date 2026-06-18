/**
 * SLEE 환경변수 API 클라이언트
 * BFF Aggregation Flow 기반.
 *
 * 등록된 flow:
 * - ivr-slee-config-tenants:            GET  테넌트 목록
 * - ivr-slee-config-files:              GET  ConfigFile 목록
 * - ivr-slee-config-categories:         GET  카테고리 목록
 * - ivr-slee-config-properties:         GET  속성 목록
 * - ivr-slee-config-ir-systems:         GET  IR 시스템 목록
 * - ivr-slee-config-apply-item:         POST 즉시 적용 (항목/카테고리/파일 × OFF/ON)
 * - ivr-slee-config-apply-reservation:  POST 예약 적용 (항목/카테고리/파일)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  SleeConfigApplyResult,
  SleeConfigCategory,
  SleeConfigFile,
  SleeConfigIrSystem,
  SleeConfigItemApplyRequest,
  SleeConfigProperty,
  SleeConfigReservationRequest,
  SleeConfigReservationResult,
  SleeConfigTenant,
  SleeUserconfigCreateRequest,
  SleeUserconfigUpdateRequest,
} from '../types/sleeConfig.types';

interface PropertyKey {
  tenantId: number;
  configFile: string;
  category: string;
  property: string;
}

interface DeletePropertyParams {
  tenantId: number;
  configFile: string;
  /** 있으면 단건 / 없으면 카테고리 또는 파일 단위 */
  property?: string;
  /** 있으면 카테고리 / 없으면 파일 단위 */
  category?: string;
}

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const sleeConfigApi = {
  getTenants: async (): Promise<SleeConfigTenant[]> => {
    const response = await apiClient.get<ApiResponse<{ value: SleeConfigTenant[] }>>('/ivr-slee-config-tenants');
    return response.data?.data?.value ?? [];
  },

  getConfigFiles: async (params?: Record<string, unknown>): Promise<SleeConfigFile[]> => {
    const response = await apiClient.get<ApiResponse<{ value: SleeConfigFile[] }>>('/ivr-slee-config-files', { params });
    return response.data?.data?.value ?? [];
  },

  getCategories: async (params: Record<string, unknown>): Promise<SleeConfigCategory[]> => {
    const response = await apiClient.get<ApiResponse<{ value: SleeConfigCategory[] }>>('/ivr-slee-config-categories', { params });
    return response.data?.data?.value ?? [];
  },

  getProperties: async (params: Record<string, unknown>): Promise<SleeConfigProperty[]> => {
    const response = await apiClient.get<ApiResponse<{ value: SleeConfigProperty[] }>>('/ivr-slee-config-properties', { params });
    return response.data?.data?.value ?? [];
  },

  getIrSystems: async (params: Record<string, unknown>): Promise<SleeConfigIrSystem[]> => {
    const response = await apiClient.get<ApiResponse<{ value: SleeConfigIrSystem[] }>>('/ivr-slee-config-ir-systems', { params });
    return response.data?.data?.value ?? [];
  },

  applyItemImmediate: async (data: SleeConfigItemApplyRequest): Promise<SleeConfigApplyResult[]> => {
    const response = await apiClient.post<ApiResponse<{ value: SleeConfigApplyResult[] }>>('/ivr-slee-config-apply-item', data);
    return response.data?.data?.value ?? [];
  },

  applyReservation: async (data: SleeConfigReservationRequest): Promise<SleeConfigReservationResult> => {
    // ApiResponse<SleeConfigReservationResultDto> (단건) — BFF 응답: data:{...} 직접 (CLAUDE.md 규칙).
    const response = await apiClient.post<ApiResponse<SleeConfigReservationResult>>('/ivr-slee-config-apply-reservation', data);
    if (!response.data?.data) {
      throw new Error('예약 적용 응답이 비어있습니다');
    }
    return response.data.data;
  },

  /** 속성 사전 중복 체크 — ApiResponse<Boolean> → BFF: data.value, 프론트: data?.value */
  checkPropertyDuplicate: async (params: PropertyKey): Promise<boolean> => {
    const response = await apiClient.get<ApiResponse<{ value: boolean }>>('/ivr-slee-config-property-check', { params });
    return response.data?.data?.value ?? false;
  },

  createProperty: async (data: SleeUserconfigCreateRequest): Promise<void> => {
    await apiClient.post<ApiResponse<unknown>>('/ivr-slee-config-property-create', data);
  },

  updateProperty: async (params: PropertyKey, data: SleeUserconfigUpdateRequest): Promise<void> => {
    await apiClient.put<ApiResponse<unknown>>('/ivr-slee-config-property-update', data, { params });
  },

  /** 삭제 — property 있으면 단건 / 없으면 category 있으면 카테고리 / 둘 다 없으면 파일 */
  deleteProperty: async (params: DeletePropertyParams): Promise<number> => {
    const response = await apiClient.delete<ApiResponse<number>>('/ivr-slee-config-property-delete', { params });
    return response.data?.data ?? 0;
  },
};
