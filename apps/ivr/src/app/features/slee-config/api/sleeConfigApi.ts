/**
 * SLEE 환경변수 API 클라이언트
 * BFF Aggregation Flow 기반.
 *
 * 등록된 flow:
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
  SleeConfigApplyResultRow,
  SleeConfigBackupCompareRow,
  SleeConfigBackupHeader,
  SleeConfigBackupRestoreResponse,
  SleeConfigCategory,
  SleeConfigDeleteFileResponse,
  SleeConfigFile,
  SleeConfigHistoryRow,
  SleeConfigIrSystem,
  SleeConfigItemApplyRequest,
  SleeConfigProperty,
  SleeConfigReservationRequest,
  SleeConfigReservationResult,
  SleeUserconfigCreateRequest,
  SleeUserconfigImportResponse,
  SleeUserconfigUpdateRequest,
} from '../types';

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
  /** 환경변수 cfg ZIP Export (Blob) — AS-IS IPR30S3030EX. @flow ivr-slee-config-export */
  exportConfig: async (params: { tenantId: number; configFile: string }) => {
    return await apiClient.get<Blob>('/ivr-slee-config-export', { params, responseType: 'blob', silent: true });
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

  /** 예약 적용 결과 조회 — AS-IS IPR30S3030L3 / selectApplyList. ApiResponse<List<T>> → data.value[]. */
  getApplyResults: async (params: { tenantId: number; configFile: string }): Promise<SleeConfigApplyResultRow[]> => {
    const response = await apiClient.get<ApiResponse<{ value: SleeConfigApplyResultRow[] }>>('/ivr-slee-config-apply-results', { params });
    return response.data?.data?.value ?? [];
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

  /**
   * SLEE 환경변수 cfg 파일 다중 Import — AS-IS IPR20S6060MFU 동등.
   *
   * <p>여러 cfg 파일을 한 multipart 요청으로 업로드. BFF 가 part name 을 모두 'uploadFile' 로
   * 강제하므로 같은 키로 N번 append.</p>
   *
   * <p>응답은 파일별 결과 list — 일부 실패해도 다른 파일은 성공 처리됨 (BE 가 REQUIRES_NEW 로 격리).</p>
   *
   *  ⚠ Content-Type 헤더는 명시하지 않는다. axios 가 FormData 감지 시 자동 설정.
   *  @flow ivr-slee-userconfig-import
   */
  importUserconfig: async ({ params, files }: { params: { tenantId: number }; files: File[] }): Promise<SleeUserconfigImportResponse> => {
    const formData = new FormData();
    formData.append('tenantId', String(params.tenantId));
    files.forEach((f) => formData.append('uploadFile', f));
    const response = await apiClient.post<ApiResponse<SleeUserconfigImportResponse>>('/ivr-slee-userconfig-import', formData);
    return response.data?.data;
  },

  // ─── Phase 1: 환경파일 전체 삭제 ───────────────────────────────────────

  /** 환경파일 전체 삭제 (진행예약 차단 + bulk delete). */
  deleteConfigFile: async (params: { tenantId: number; configFile: string }): Promise<SleeConfigDeleteFileResponse> => {
    const response = await apiClient.delete<ApiResponse<SleeConfigDeleteFileResponse>>('/ivr-slee-config-delete-file', { params });
    return response.data?.data;
  },

  // ─── Phase 2: 적용 이력 + 백업 ─────────────────────────────────────────

  /** 적용 이력 조회 — 즉시/예약 통합. rtResvKind null=전체 / 1=즉시 / 2=예약. */
  getHistory: async (params: {
    tenantId: number;
    configFile: string;
    rtResvKind?: number;
    startDate?: string;
    endDate?: string;
    applyReason?: string;
  }): Promise<SleeConfigHistoryRow[]> => {
    const response = await apiClient.get<ApiResponse<{ value: SleeConfigHistoryRow[] }>>('/ivr-slee-config-history', { params });
    return response.data?.data?.value ?? [];
  },

  /** 백업 헤더 목록 조회. */
  getBackups: async (params: { tenantId: number; configFile: string }): Promise<SleeConfigBackupHeader[]> => {
    const response = await apiClient.get<ApiResponse<{ value: SleeConfigBackupHeader[] }>>('/ivr-slee-config-backups', { params });
    return response.data?.data?.value ?? [];
  },

  /** 백업 vs 현재 USERCONFIG 비교. */
  getBackupCompare: async (params: { backupListId: number; tenantId: number; configFile: string }): Promise<SleeConfigBackupCompareRow[]> => {
    const response = await apiClient.get<ApiResponse<{ value: SleeConfigBackupCompareRow[] }>>('/ivr-slee-config-backup-compare', { params });
    return response.data?.data?.value ?? [];
  },

  /** 백업 복구 — USERCONFIG 전체 삭제 후 BK_DATA 로 INSERT. */
  restoreBackup: async (params: { backupListId: number; tenantId: number; configFile: string }): Promise<SleeConfigBackupRestoreResponse> => {
    const response = await apiClient.post<ApiResponse<SleeConfigBackupRestoreResponse>>('/ivr-slee-config-backup-restore', undefined, { params });
    return response.data?.data;
  },
};
