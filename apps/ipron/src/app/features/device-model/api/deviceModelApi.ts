/**
 * 단말모델 관리 API 클라이언트 (IPR20S2120)
 * BFF Aggregation Flow 기반
 *
 * 등록 flow (시드: C:\bt-admin-ipron-work\ipron-device-model\seed.sql — BE DeviceModelController 정합):
 * - ipron-device-model-list:              GET    단말모델 목록 (usedDeviceCount 포함)
 * - ipron-device-model-detail:            GET    단말모델 상세 (?id)
 * - ipron-device-model-check-model:       GET    모델명 글로벌 중복 체크 (?modelName&excludeId)
 * - ipron-device-model-usage:             GET    참조 단말기 수 조회 (?id)
 * - ipron-device-model-create:            POST   단말모델 등록 (DEVICE_TYPE 채번)
 * - ipron-device-model-update:            PUT    단말모델 수정 (?id)
 * - ipron-device-model-delete:            DELETE 단말모델 삭제 (?id, 참조 단말기 존재 시 409 차단)
 * - ipron-device-model-firmware-upload:   POST   펌웨어 파일 업로드 (?id, multipart file — 메타 즉시 기록)
 * - ipron-device-model-firmware-download: GET    펌웨어 파일 다운로드 (?id, blob)
 * - ipron-device-model-firmware-sync:     POST   펌웨어 파일 IE노드 동기화 (?id)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { DeviceModelCreateRequest, DeviceModelResponse, DeviceModelUpdateRequest, FirmwareSyncResult, FirmwareUploadResult } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * BFF 단일 step 배열 응답 정규화
 * BE List → BFF unwrap → 단일 step 시 { value: [...] } 래핑 / PagedResponse 시 { items: [...] }
 */
function unwrapList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object') {
    const obj = raw as { value?: unknown; items?: unknown };
    if (Array.isArray(obj.value)) return obj.value as T[];
    if (Array.isArray(obj.items)) return obj.items as T[];
  }
  return [];
}

/**
 * 동기화 결과 정규화 — BE FirmwareSyncResponse(record):
 * { fileName, syncOk, totalCount, successCount, failCount, results: [{ nodeId, systemId, systemName, success, code, message }] }
 */
function normalizeSyncResults(raw: unknown): FirmwareSyncResult[] {
  let listSource: unknown = raw;
  if (raw && typeof raw === 'object' && Array.isArray((raw as { results?: unknown }).results)) {
    listSource = (raw as { results: unknown[] }).results;
  }
  return unwrapList<Record<string, unknown>>(listSource).map((r) => ({
    nodeId: typeof r['nodeId'] === 'number' ? (r['nodeId'] as number) : undefined,
    nodeName: String(r['systemName'] ?? r['nodeName'] ?? r['name'] ?? r['nodeId'] ?? '-'),
    success: r['success'] === true || r['success'] === 1 || r['result'] === true || r['result'] === 1,
    message: (r['message'] as string | undefined) ?? null,
  }));
}

export const deviceModelApi = {
  /**
   * 단말모델 목록 조회 (참조 단말기 수 usedDeviceCount 포함)
   * @flow ipron-device-model-list
   */
  async list() {
    const response = await apiClient.get<ApiResponse<unknown>>('/ipron-device-model-list');
    return unwrapList<DeviceModelResponse>(response.data?.data);
  },

  /**
   * 단말모델 상세 조회
   * @flow ipron-device-model-detail
   */
  async get(id: number) {
    const response = await apiClient.get<ApiResponse<DeviceModelResponse>>('/ipron-device-model-detail', { params: { id } });
    return response.data?.data ?? null;
  },

  /**
   * 모델명 글로벌 중복 체크 (수정 시 본인 제외)
   * @flow ipron-device-model-check-model
   */
  async checkModel(modelName: string, excludeId?: number) {
    const response = await apiClient.get<ApiResponse<{ duplicated: boolean }>>('/ipron-device-model-check-model', {
      params: { modelName, excludeId },
    });
    return response.data?.data?.duplicated ?? false;
  },

  /**
   * 단말모델 등록 (DEVICE_TYPE 은 BE 에서 채번)
   * @flow ipron-device-model-create
   */
  async create(data: DeviceModelCreateRequest) {
    const response = await apiClient.post<ApiResponse<DeviceModelResponse>>('/ipron-device-model-create', data);
    return response.data?.data;
  },

  /**
   * 단말모델 수정
   * @flow ipron-device-model-update
   */
  async update(id: number, data: DeviceModelUpdateRequest) {
    const response = await apiClient.put<ApiResponse<DeviceModelResponse>>('/ipron-device-model-update', data, { params: { id } });
    return response.data?.data;
  },

  /**
   * 단말모델 삭제 — 해당 모델을 쓰는 단말기(TB_IE_DEV_MASTER) 존재 시 서버에서 409 차단
   * @flow ipron-device-model-delete
   */
  async remove(id: number) {
    await apiClient.delete('/ipron-device-model-delete', { params: { id } });
  },

  // ─── 펌웨어 ──────────────────────────────────────────────────────────────

  /**
   * 펌웨어 파일 업로드 — 저장 서버 반영 + FIRM_FILE_NAME 메타 즉시 기록 (저장된 모델만 가능)
   * @flow ipron-device-model-firmware-upload
   */
  async uploadFirmware(id: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<unknown>>('/ipron-device-model-firmware-upload', formData, { params: { id } });
    const raw = (response.data?.data ?? {}) as Record<string, unknown>;
    // 필드명 방어적 정규화: {fileName, filePath} | {firmFileName, firmFilePath}
    const result: FirmwareUploadResult = {
      fileName: String(raw['fileName'] ?? raw['firmFileName'] ?? file.name),
      filePath: String(raw['filePath'] ?? raw['firmFilePath'] ?? ''),
    };
    return result;
  },

  /**
   * 펌웨어 파일 IE노드 동기화 (F222 + IE 시스템별 F221) — 노드별 결과 반환
   * @flow ipron-device-model-firmware-sync
   */
  async syncFirmware(id: number) {
    const response = await apiClient.post<ApiResponse<unknown>>('/ipron-device-model-firmware-sync', undefined, { params: { id } });
    return normalizeSyncResults(response.data?.data);
  },

  /**
   * 펌웨어 파일 다운로드 (binary attachment)
   * @flow ipron-device-model-firmware-download
   */
  async downloadFirmware(id: number, fileName: string) {
    const response = await apiClient.get<Blob>('/ipron-device-model-firmware-download', {
      params: { id },
      responseType: 'blob',
      skipGlobalHandler: true,
    } as Parameters<typeof apiClient.get>[1]);
    const blob = response.data;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'firmware.bin';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
