/**
 * ADN 설정 API 클라이언트.
 *
 * BFF Aggregation Flow 매핑 (DB: TB_BT_CM_AGG_FLOW_MST, 시드: V73):
 *  - ipron-dn-adn-list             GET    목록
 *  - ipron-dn-adn-detail           GET    상세
 *  - ipron-dn-adn-create           POST   등록
 *  - ipron-dn-adn-update           PUT    수정
 *  - ipron-dn-adn-delete-batch     POST   일괄 삭제 (body: adnIds[])
 *  - ipron-dn-adn-duplicate-check  GET    번호 중복 체크
 *  - ipron-dn-adn-relation-count   GET    관계 카운트 (삭제 전 체크)
 *  - ipron-dn-adn-copy             POST   범위 일괄 복사
 *  - ipron-dn-adn-tenants          GET    테넌트 통계
 *  - ipron-dn-adn-excel-import     POST   엑셀 가져오기 (multipart)
 *  - ipron-dn-adn-excel-export     GET    엑셀 내보내기 (binary)
 */
import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { AdnCopyRequest, AdnCreateRequest, AdnExcelImportResult, AdnResponse, AdnTenantStat, AdnUpdateRequest } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const adnApi = {
  // ─── List / Detail ────────────────────────────────────────────────────────

  getList: async (params?: { tenantId?: number; dnNo?: string }): Promise<AdnResponse[]> => {
    const res = await apiClient.get<ListResponse<AdnResponse>>('/ipron-dn-adn-list', { params });
    return extractList(res);
  },

  getDetail: async (id: number): Promise<AdnResponse> => {
    const res = await apiClient.get<DetailResponse<AdnResponse>>('/ipron-dn-adn-detail', {
      params: { id },
    });
    return extractDetail(res);
  },

  // BFF 가 ApiResponse<List<X>> 를 data.value 로 wrap — extractDetail 후 .value 풀기 (DN node-tenants 패턴과 동일)
  getTenants: async (): Promise<AdnTenantStat[]> => {
    const res = await apiClient.get<DetailResponse<{ value: AdnTenantStat[] }>>('/ipron-dn-adn-tenants');
    return extractDetail(res)?.value ?? [];
  },

  duplicateCheck: async (params: { tenantId: number; dnNo: string; excludeDnId?: number }): Promise<boolean> => {
    const res = await apiClient.get<DetailResponse<boolean>>('/ipron-dn-adn-duplicate-check', { params });
    return extractDetail(res);
  },

  relationCount: async (id: number): Promise<number> => {
    const res = await apiClient.get<DetailResponse<number>>('/ipron-dn-adn-relation-count', {
      params: { id },
    });
    return extractDetail(res);
  },

  // ─── Mutations ────────────────────────────────────────────────────────────

  create: async (body: AdnCreateRequest): Promise<AdnResponse> => {
    const res = await apiClient.post<DetailResponse<AdnResponse>>('/ipron-dn-adn-create', body);
    return extractDetail(res);
  },

  update: async (id: number, body: AdnUpdateRequest): Promise<AdnResponse> => {
    const res = await apiClient.put<DetailResponse<AdnResponse>>('/ipron-dn-adn-update', body, {
      params: { id },
    });
    return extractDetail(res);
  },

  deleteBatch: async (adnIds: number[]): Promise<void> => {
    await apiClient.post('/ipron-dn-adn-delete-batch', { adnIds });
  },

  copy: async (body: AdnCopyRequest): Promise<AdnResponse[]> => {
    const res = await apiClient.post<DetailResponse<{ value: AdnResponse[] }>>('/ipron-dn-adn-copy', body);
    return extractDetail(res)?.value ?? [];
  },

  // ─── Excel ────────────────────────────────────────────────────────────────

  importExcel: async (file: File): Promise<AdnExcelImportResult> => {
    const fd = new FormData();
    fd.append('uploadFile', file);
    const res = await apiClient.post<DetailResponse<AdnExcelImportResult>>('/ipron-dn-adn-excel-import', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return extractDetail(res);
  },

  exportExcel: async (params?: { tenantId?: number; dnNo?: string }): Promise<Blob> => {
    const res = await apiClient.get('/ipron-dn-adn-excel-export', {
      params,
      responseType: 'blob',
    });
    return res as unknown as Blob;
  },

  /** Import 양식 (빈 4컬럼 헤더) 다운로드 */
  downloadTemplate: async (): Promise<Blob> => {
    const res = await apiClient.get('/ipron-dn-adn-excel-template', { responseType: 'blob' });
    return res as unknown as Blob;
  },
};
