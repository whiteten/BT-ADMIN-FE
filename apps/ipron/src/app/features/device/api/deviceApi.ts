/**
 * 단말기 관리 API 클라이언트 (IPR20S2110)
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - device-list:            GET    단말기 목록 조회
 * - device-detail:          GET    단말기 상세 조회 (라인/버튼 포함)
 * - device-create:          POST   단말기 등록
 * - device-update:          PUT    단말기 수정
 * - device-delete:          DELETE 단말기 삭제
 * - device-firmware-use:    PUT    펌웨어 사용여부 다건 변경
 * - device-reboot:          POST   단말적용(재부팅)
 * - device-import:          POST   Excel 가져오기
 * - device-check-mac:       GET    MAC 주소 중복 체크
 * - device-line-assign:     POST   DN 배정
 * - device-line-deallocate: DELETE DN 해제
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  DevMasterCreateRequest,
  DevMasterResponse,
  DevMasterUpdateRequest,
  DeviceRebootRequest,
  DeviceTypeInfoDto,
  DnAssignRequest,
  FirmwareUseRequest,
  NodeTenantStatDto,
  ProvisionLineDto,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const deviceApi = {
  // ─── 목록 / 상세 ────────────────────────────────────────────────────────────

  /**
   * 단말기 목록 조회
   * @flow device-list
   */
  async list(params?: { nodeId?: number; deviceType?: number; macAddr?: string; devMstName?: string }) {
    const response = await apiClient.get<ApiResponse<{ items: DevMasterResponse[]; total: number }>>('/device-list', { params });
    return response.data?.data ?? { items: [], total: 0 };
  },

  /**
   * 단말기 상세 조회 (라인/버튼 포함)
   * @flow device-detail
   */
  async get(id: number) {
    const response = await apiClient.get<ApiResponse<DevMasterResponse>>(`/device-detail`, {
      params: { id },
    });
    return response.data?.data ?? null;
  },

  /**
   * 단말기 유형 목록 조회
   * @flow device-types
   * BFF 단일 step 배열 응답은 { value: [...] } 로 래핑됨 → .value 추출 필요
   * BE: ApiResponse<List<DeviceTypeInfoDto>>
   *   → BFF unwrap → data 필드 = List
   *   → BFF buildAggregationResponse(단일 step) → Map.of("value", list)
   *   → 최종 응답: { ok:true, data:{ value:[...] } }
   */
  async listDeviceTypes() {
    const response = await apiClient.get<ApiResponse<{ value: DeviceTypeInfoDto[] }>>('/device-types');
    const raw = response.data?.data;
    // Array.isArray 가드: 비배열이어도 크래시 방지
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray((raw as { value?: unknown }).value)) {
      return (raw as { value: DeviceTypeInfoDto[] }).value;
    }
    return [];
  },

  /**
   * 노드-테넌트별 단말기 통계 (카드 슬라이더용)
   * @flow device-node-tenant-stats
   * BFF 단일 step 배열 응답 → { value: [...] } 래핑 → .value 추출
   */
  async nodeTenantStats() {
    const response = await apiClient.get<ApiResponse<{ value: NodeTenantStatDto[] }>>('/device-node-tenant-stats');
    const raw = response.data?.data;
    if (Array.isArray(raw)) return raw as NodeTenantStatDto[];
    if (raw && Array.isArray((raw as { value?: unknown }).value)) {
      return (raw as { value: NodeTenantStatDto[] }).value;
    }
    return [] as NodeTenantStatDto[];
  },

  /**
   * MAC 주소 중복 체크
   * @flow device-check-mac
   */
  async checkMac(macAddr: string, excludeDevMasterId?: number) {
    const response = await apiClient.get<ApiResponse<{ duplicated: boolean }>>('/device-check-mac', {
      params: { macAddr, excludeDevMasterId },
    });
    return response.data?.data?.duplicated ?? false;
  },

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  /**
   * 단말기 등록
   * @flow device-create
   */
  async create(data: DevMasterCreateRequest) {
    const response = await apiClient.post<ApiResponse<DevMasterResponse>>('/device-create', data);
    return response.data?.data;
  },

  /**
   * 단말기 수정
   * @flow device-update
   */
  async update(id: number, data: DevMasterUpdateRequest) {
    const response = await apiClient.put<ApiResponse<DevMasterResponse>>(`/device-update`, data, {
      params: { id },
    });
    return response.data?.data;
  },

  /**
   * 단말기 삭제
   * @flow device-delete
   */
  async remove(id: number) {
    await apiClient.delete(`/device-delete`, { params: { id } });
  },

  // ─── 펌웨어 / 재부팅 ────────────────────────────────────────────────────────

  /**
   * 펌웨어 UPDATE 사용여부 다건 변경
   * @flow device-firmware-use
   */
  async updateFirmwareUse(data: FirmwareUseRequest) {
    await apiClient.put('/device-firmware-use', data);
  },

  /**
   * 단말적용(재부팅)
   * @flow device-reboot
   */
  async reboot(data: DeviceRebootRequest) {
    await apiClient.post('/device-reboot', data);
  },

  // ─── DN 배정/해제 ────────────────────────────────────────────────────────────

  /**
   * DN 배정
   * @flow device-line-assign
   */
  async assignDn(id: number, seq: number, data: DnAssignRequest) {
    const response = await apiClient.post<ApiResponse<ProvisionLineDto>>(`/device-line-assign`, data, { params: { id, seq } });
    return response.data?.data;
  },

  /**
   * DN 해제
   * @flow device-line-deallocate
   */
  async deallocateDn(id: number, seq: number) {
    await apiClient.delete('/device-line-deallocate', { params: { id, seq } });
  },

  // ─── Excel ───────────────────────────────────────────────────────────────────

  /**
   * Excel 가져오기
   * @flow device-import
   */
  async importDevices(nodeId: number, file: File) {
    const formData = new FormData();
    formData.append('uploadFile', file);
    const response = await apiClient.post<ApiResponse<{ importedCount: number }>>('/device-import', formData, { params: { nodeId } });
    return response.data?.data?.importedCount ?? 0;
  },
};
