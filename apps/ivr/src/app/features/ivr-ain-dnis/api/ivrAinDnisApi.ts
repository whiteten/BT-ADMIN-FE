/**
 * 대표번호별 DNIS 관리 API 클라이언트 (IPR20S6043).
 * BFF Aggregation Flow 기반.
 *
 * 등록된 flow (TB_BT_CM_AGG_FLOW_MST):
 * - ivr-ain-list:           GET    AIN-DNIS 목록 (tenantId 필수)
 * - ivr-ain-detail:         GET    AIN-DNIS 단건 (tenantId, ainNo, originDnis)
 * - ivr-ain-create:         POST   AIN-DNIS 등록
 * - ivr-ain-update:         PUT    AIN-DNIS 수정 (tenantId, ainNo, originDnis)
 * - ivr-ain-delete:         DELETE AIN-DNIS 삭제 (tenantId, ainNo, originDnis)
 * - ivr-ain-excel-export:   GET    AIN-DNIS 엑셀 내보내기 (binary, tenantId 필수)
 * - ivr-ain-excel-import:   POST   AIN-DNIS 엑셀 가져오기 (multipart, tenantId 필수)
 * - manager-tenant-list:    GET    테넌트 목록 (cross-service)
 */
import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { ExcelImportResult, IrAinMaster, IrAinMasterCreateRequest, IrAinMasterUpdateRequest, TenantSimpleResponse } from '../types/ivrAinDnis.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export interface AinKey {
  tenantId: number;
  ainNo: string;
  originDnis: string;
}

export const ivrAinDnisApi = {
  // ─── 목록 / 단건 ─────────────────────────────────────────────────────────

  /**
   * AIN-DNIS 목록 조회 (선택된 테넌트 기준).
   * 백엔드: ApiResponse<PagedResponse<IrAinMasterResponse>> → data.items[]
   */
  getList: async (params: Record<string, unknown>): Promise<IrAinMaster[]> => {
    const response = await apiClient.get<ListResponse<IrAinMaster>>('/ivr-ain-list', { params });
    return extractList(response);
  },

  getDetail: async (params: AinKey): Promise<IrAinMaster> => {
    const response = await apiClient.get<DetailResponse<IrAinMaster>>('/ivr-ain-detail', {
      params: params as unknown as Record<string, unknown>,
    });
    return extractDetail(response);
  },

  // ─── CUD ─────────────────────────────────────────────────────────────────

  create: async (data: IrAinMasterCreateRequest): Promise<IrAinMaster> => {
    const response = await apiClient.post<DetailResponse<IrAinMaster>>('/ivr-ain-create', data);
    return extractDetail(response);
  },

  /**
   * 수정 — 복합 PK 3개는 query parameter, 변경 필드는 body.
   */
  update: async ({ key, data }: { key: AinKey; data: IrAinMasterUpdateRequest }): Promise<IrAinMaster> => {
    const response = await apiClient.put<DetailResponse<IrAinMaster>>('/ivr-ain-update', data, {
      params: key as unknown as Record<string, unknown>,
    });
    return extractDetail(response);
  },

  remove: async (key: AinKey) => {
    return await apiClient.delete('/ivr-ain-delete', { params: key as unknown as Record<string, unknown> });
  },

  // ─── 엑셀 내보내기 / 가져오기 (백엔드 처리) ────────────────────────────────

  /**
   * AIN-DNIS 목록 엑셀 내보내기 — 선택된 테넌트 기준 전체 행을 .xlsx로 다운로드.
   * Backend: byte[] (XLSX binary) — BFF가 그대로 forward.
   * @flow ivr-ain-excel-export
   */
  exportExcel: async (params: Record<string, unknown>) => {
    const response = await apiClient.get<Blob>('/ivr-ain-excel-export', { params, responseType: 'blob' });
    return response;
  },

  /**
   * AIN-DNIS 엑셀 가져오기 — multipart 업로드. 백엔드가 파싱·검증·저장.
   * Backend: ApiResponse<ExcelImportResult> — totalCount/successCount/failCount + 행별 결과.
   * ⚠ Content-Type 헤더는 명시하지 않는다. axios가 FormData를 감지하면 자동 설정.
   * @flow ivr-ain-excel-import
   */
  importExcel: async ({ params, data }: { params: Record<string, unknown>; data: File }): Promise<ExcelImportResult> => {
    const formData = new FormData();
    formData.append('uploadFile', data);
    const response = await apiClient.post<DetailResponse<ExcelImportResult>>('/ivr-ain-excel-import', formData, { params });
    return extractDetail(response);
  },

  // ─── 테넌트 목록 (cross-service) ─────────────────────────────────────────

  getTenants: async (): Promise<TenantSimpleResponse[]> => {
    const response = await apiClient.get<ListResponse<TenantSimpleResponse>>('/manager-tenant-list');
    return extractList(response);
  },
};
