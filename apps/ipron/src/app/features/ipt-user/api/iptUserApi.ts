/**
 * IPT 사용자관리 API 클라이언트.
 *
 * BFF Aggregation Flow 매핑 (시드: BT-ADMIN-SERVICE-MIGRATION V141):
 *  IPT 사용자 (/api/ipron/ipt-users)
 *    ipron-ipt-user-list             GET    목록 (?tenantId&dnGroupId&userId&userName — dnGroupId 는 하위 재귀 포함)
 *    ipron-ipt-user-detail           GET    단건
 *    ipron-ipt-user-check-id         GET    ID 중복검사 (data=true 사용 가능)
 *    ipron-ipt-user-create           POST   등록
 *    ipron-ipt-user-update           PUT    수정
 *    ipron-ipt-user-delete           DELETE 다건 삭제 (body: [ieUserId...])
 *    ipron-ipt-user-dn-list          GET    할당가능 DN (?dnNo prefix)
 *    ipron-ipt-user-dn-assign        PUT    DN 할당 (body: {dnId})
 *    ipron-ipt-user-dn-unassign      DELETE DN 할당 해제
 *    ipron-ipt-user-group-update     PUT    조직 일괄변경 (body: {dnGroupId, ieUserIds})
 *    ipron-ipt-user-import           POST   엑셀 가져오기 (multipart, 207 부분성공)
 *    ipron-ipt-user-export           GET    엑셀 내보내기 (XLSX)
 *    ipron-ipt-user-import-template  GET    Import 템플릿 (XLSX)
 *    ipron-ipt-common-codes          GET    사용언어/타임존 공통코드
 *  직급/직책 (/api/ipron/ipt-level-duties)
 *    ipron-ipt-level-duty-list / -create / -update / -delete / -users
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  AssignableDn,
  CommonCodeOption,
  IptLevelDuty,
  IptLevelDutyRequest,
  IptUserCreateRequest,
  IptUserGroupMoveRequest,
  IptUserImportResult,
  IptUserResponse,
  IptUserUpdateRequest,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const iptUserApi = {
  // ─── 사용자 조회 ─────────────────────────────────────────────────────────

  getList: async (params: { tenantId?: number; dnGroupId?: number; userId?: string; userName?: string }): Promise<IptUserResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: IptUserResponse[] }>>('/ipron-ipt-user-list', { params });
    return res.data?.data?.value ?? [];
  },

  getDetail: async (ieUserId: number): Promise<IptUserResponse> => {
    const res = await apiClient.get<ApiResponse<IptUserResponse>>('/ipron-ipt-user-detail', { params: { ieUserId } });
    return res.data?.data;
  },

  /** true = 사용 가능 */
  checkId: async (params: { tenantId: number; userId: string }): Promise<boolean> => {
    const res = await apiClient.get<ApiResponse<boolean>>('/ipron-ipt-user-check-id', { params });
    return res.data?.data;
  },

  getCommonCodes: async (): Promise<{ localLang: CommonCodeOption[]; timeZone: CommonCodeOption[] }> => {
    const res = await apiClient.get<ApiResponse<{ localLang: CommonCodeOption[]; timeZone: CommonCodeOption[] }>>('/ipron-ipt-common-codes');
    return res.data?.data ?? { localLang: [], timeZone: [] };
  },

  // ─── 사용자 변경 ─────────────────────────────────────────────────────────

  create: async (body: IptUserCreateRequest): Promise<IptUserResponse> => {
    // 운영자 전체(view-all) 모드 등록: body.tenantId 를 X-Act-As-Tenant 로 승격 (ipron 공통 패턴)
    const res = await apiClient.post<ApiResponse<IptUserResponse>>('/ipron-ipt-user-create', body, { actAsTenantFromBody: true });
    return res.data?.data;
  },

  update: async (ieUserId: number, body: IptUserUpdateRequest): Promise<IptUserResponse> => {
    const res = await apiClient.put<ApiResponse<IptUserResponse>>('/ipron-ipt-user-update', body, { params: { ieUserId } });
    return res.data?.data;
  },

  deleteBatch: async (ieUserIds: number[]): Promise<void> => {
    await apiClient.delete('/ipron-ipt-user-delete', { data: ieUserIds });
  },

  moveGroup: async (body: IptUserGroupMoveRequest): Promise<void> => {
    await apiClient.put('/ipron-ipt-user-group-update', body);
  },

  // ─── DN 할당 ─────────────────────────────────────────────────────────────

  getAssignableDns: async (ieUserId: number, dnNo?: string): Promise<AssignableDn[]> => {
    const res = await apiClient.get<ApiResponse<{ value: AssignableDn[] }>>('/ipron-ipt-user-dn-list', { params: { ieUserId, dnNo } });
    return res.data?.data?.value ?? [];
  },

  assignDn: async (ieUserId: number, dnId: number): Promise<void> => {
    await apiClient.put('/ipron-ipt-user-dn-assign', { dnId }, { params: { ieUserId } });
  },

  unassignDn: async (ieUserId: number): Promise<void> => {
    await apiClient.delete('/ipron-ipt-user-dn-unassign', { params: { ieUserId } });
  },

  // ─── 직급/직책 ───────────────────────────────────────────────────────────

  getLevelDuties: async (type?: number): Promise<IptLevelDuty[]> => {
    const res = await apiClient.get<ApiResponse<{ value: IptLevelDuty[] }>>('/ipron-ipt-level-duty-list', { params: { type } });
    return res.data?.data?.value ?? [];
  },

  getLevelDutyUsers: async (levelDutyId: number): Promise<string[]> => {
    const res = await apiClient.get<ApiResponse<{ value: string[] }>>('/ipron-ipt-level-duty-users', { params: { levelDutyId } });
    return res.data?.data?.value ?? [];
  },

  createLevelDuty: async (body: IptLevelDutyRequest): Promise<IptLevelDuty> => {
    const res = await apiClient.post<ApiResponse<IptLevelDuty>>('/ipron-ipt-level-duty-create', body);
    return res.data?.data;
  },

  updateLevelDuty: async (levelDutyId: number, body: IptLevelDutyRequest): Promise<IptLevelDuty> => {
    const res = await apiClient.put<ApiResponse<IptLevelDuty>>('/ipron-ipt-level-duty-update', body, { params: { levelDutyId } });
    return res.data?.data;
  },

  deleteLevelDuty: async (levelDutyId: number): Promise<void> => {
    await apiClient.delete('/ipron-ipt-level-duty-delete', { params: { levelDutyId } });
  },

  // ─── 엑셀 가져오기/내보내기 ─────────────────────────────────────────────

  exportExcel: async (params: { tenantId?: number; dnGroupId?: number; userId?: string; userName?: string }): Promise<Blob> => {
    const response = await apiClient.get<Blob>('/ipron-ipt-user-export', { params, responseType: 'blob' });
    return (response as unknown as { data: Blob }).data;
  },

  downloadImportTemplate: async (): Promise<Blob> => {
    const response = await apiClient.get<Blob>('/ipron-ipt-user-import-template', { responseType: 'blob' });
    return (response as unknown as { data: Blob }).data;
  },

  /** 서버 일괄 처리 — 행별 결과 반환 (부분 성공 시 207, axios 기본 validateStatus 는 2xx 만 성공이므로 207 도 성공 처리됨) */
  importExcel: async (params: { tenantId: number; file: File }): Promise<IptUserImportResult> => {
    const formData = new FormData();
    formData.append('file', params.file);
    // Content-Type 미지정 — axios 가 FormData 감지 시 multipart boundary 자동 설정
    const response = await apiClient.post<ApiResponse<IptUserImportResult>>('/ipron-ipt-user-import', formData, {
      params: { tenantId: params.tenantId },
    });
    return response.data?.data;
  },
};
