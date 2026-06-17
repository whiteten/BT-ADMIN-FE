/**
 * 확장 어댑터 관리 API 클라이언트 (AS-IS IPR20S6042) — BFF Aggregation Flow.
 *
 * 등록 Flow (TB_BT_CM_AGG_FLOW_MST):
 *  - ivr-adaptor-list           GET    시스템별 어댑터 목록
 *  - ivr-adaptor-create         POST   어댑터 추가 (BODY_FROM=request)
 *  - ivr-adaptor-configs        GET    어댑터별 환경파일 목록
 *  - ivr-adaptor-config-upload  POST   환경파일 업로드 (multipart)
 * 재사용 Flow:
 *  - manager-node-list          GET    노드 목록
 *  - ivr-system-list            GET    FOCUS 시스템 목록 (SYS_CLASS_CD 1035/1036/1037)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  Adaptor,
  AdaptorBatchCopyRequest,
  AdaptorBatchCopyResult,
  AdaptorConfig,
  AdaptorCreateRequest,
  AdaptorNode,
  AdaptorSystem,
  AdaptorUpdateRequest,
  Watcher,
} from '../types/extAdaptor';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const adaptorApi = {
  // ─── 노드 / FOCUS 시스템 (재사용) ──────────────────────────────────────
  getNodes: async (): Promise<AdaptorNode[]> => {
    const response = await apiClient.get<ApiResponse<{ items: AdaptorNode[] }>>('/manager-node-list');
    return response.data?.data?.items ?? [];
  },

  getForcusSystems: async (params: { nodeId?: number } = {}): Promise<AdaptorSystem[]> => {
    const response = await apiClient.get<ApiResponse<{ value: AdaptorSystem[] }>>('/ivr-system-list', { params });
    return response.data?.data?.value ?? [];
  },

  // ─── 어댑터 ────────────────────────────────────────────────────────────
  getAdaptors: async (params: { systemId: number }): Promise<Adaptor[]> => {
    const response = await apiClient.get<ApiResponse<{ value: Adaptor[] }>>('/ivr-adaptor-list', { params });
    return response.data?.data?.value ?? [];
  },

  createAdaptor: async (data: AdaptorCreateRequest): Promise<Adaptor> => {
    const response = await apiClient.post<ApiResponse<Adaptor>>('/ivr-adaptor-create', data);
    return response.data?.data;
  },

  /** 어댑터 수정 — PUT /api/v1/ivr/adaptors/{adaptorId} (BFF flow ivr-adaptor-update). */
  updateAdaptor: async ({ adaptorId, data }: { adaptorId: number; data: AdaptorUpdateRequest }): Promise<Adaptor> => {
    const response = await apiClient.put<ApiResponse<Adaptor>>('/ivr-adaptor-update', data, {
      params: { adaptorId },
    });
    return response.data?.data;
  },

  /** 어댑터 삭제 — DELETE /api/v1/ivr/adaptors/{adaptorId} (BFF flow ivr-adaptor-delete). */
  deleteAdaptor: async ({ adaptorId, systemId }: { adaptorId: number; systemId: number }): Promise<boolean> => {
    const response = await apiClient.delete<ApiResponse<boolean>>('/ivr-adaptor-delete', { params: { adaptorId, systemId } });
    return response.data?.data ?? false;
  },

  /** 어댑터 배치복사 — POST /api/v1/ivr/adaptors/batch-copy (BFF flow ivr-adaptor-batch-copy, BODY_FROM=request). */
  batchCopyAdaptors: async (data: AdaptorBatchCopyRequest): Promise<AdaptorBatchCopyResult> => {
    const response = await apiClient.post<ApiResponse<AdaptorBatchCopyResult>>('/ivr-adaptor-batch-copy', data);
    return response.data?.data;
  },

  // ─── 환경파일 ──────────────────────────────────────────────────────────
  getAdaptorConfigs: async (params: { systemId: number; adaptorId: number }): Promise<AdaptorConfig[]> => {
    const response = await apiClient.get<ApiResponse<{ value: AdaptorConfig[] }>>('/ivr-adaptor-configs', { params });
    return response.data?.data?.value ?? [];
  },

  /**
   * 환경파일 업로드 — multipart. Content-Type 미지정(axios 자동).
   */
  uploadAdaptorConfig: async ({
    file,
    systemId,
    adaptorId,
    emsFilePath,
    irFilePath,
    irAdaptorConfigType,
    configDesc,
  }: {
    file: File;
    systemId: number;
    adaptorId: number;
    emsFilePath: string;
    irFilePath: string;
    irAdaptorConfigType?: string;
    configDesc?: string;
  }): Promise<AdaptorConfig> => {
    const formData = new FormData();
    formData.append('uploadFile', file); // BFF 가 모든 파일 파트를 uploadFile 로 전달 → 백엔드 part 이름과 일치
    formData.append('systemId', String(systemId));
    formData.append('adaptorId', String(adaptorId));
    formData.append('emsFilePath', emsFilePath);
    formData.append('irFilePath', irFilePath);
    if (irAdaptorConfigType) formData.append('irAdaptorConfigType', irAdaptorConfigType);
    if (configDesc) formData.append('configDesc', configDesc);
    const response = await apiClient.post<ApiResponse<AdaptorConfig>>('/ivr-adaptor-config-upload', formData);
    return response.data?.data;
  },

  /**
   * 환경파일 수정 — 파일 교체 또는 설명만 수정 (multipart, 파일 optional). 기존 configId 갱신(중복 방지).
   *  @flow ivr-adaptor-config-update
   */
  updateAdaptorConfig: async ({
    irAdaptorConfigId,
    file,
    emsFilePath,
    irFilePath,
    configDesc,
  }: {
    irAdaptorConfigId: number;
    file?: File;
    emsFilePath?: string;
    irFilePath?: string;
    configDesc?: string;
  }): Promise<AdaptorConfig> => {
    const formData = new FormData();
    if (file) formData.append('uploadFile', file);
    if (emsFilePath) formData.append('emsFilePath', emsFilePath);
    if (irFilePath) formData.append('irFilePath', irFilePath);
    if (configDesc !== undefined) formData.append('configDesc', configDesc);
    const response = await apiClient.post<ApiResponse<AdaptorConfig>>('/ivr-adaptor-config-update', formData, { params: { irAdaptorConfigId } });
    return response.data?.data;
  },

  /** 환경파일 삭제. @flow ivr-adaptor-config-delete */
  deleteAdaptorConfig: async ({ irAdaptorConfigId }: { irAdaptorConfigId: number }): Promise<boolean> => {
    const response = await apiClient.delete<ApiResponse<boolean>>('/ivr-adaptor-config-delete', { params: { irAdaptorConfigId } });
    return response.data?.data ?? false;
  },

  // ─── Watcher 환경파일 (시스템당 1건) ──────────────────────────────────────
  getWatchers: async (params: { systemId: number }): Promise<Watcher[]> => {
    const response = await apiClient.get<ApiResponse<{ value: Watcher[] }>>('/ivr-watcher-list', { params });
    return response.data?.data?.value ?? [];
  },

  /** Watcher 추가 — multipart (EMS 저장 → F222 → F221 → DB). */
  createWatcher: async ({
    file,
    systemId,
    watcherName,
    watcherDesc,
    emsFilePath,
    irFilePath,
  }: {
    file: File;
    systemId: number;
    watcherName: string;
    watcherDesc?: string;
    emsFilePath: string;
    irFilePath: string;
  }): Promise<Watcher> => {
    const formData = new FormData();
    formData.append('uploadFile', file); // BFF 가 모든 파일 파트를 uploadFile 로 전달 → 백엔드 part 이름과 일치
    formData.append('systemId', String(systemId));
    formData.append('watcherName', watcherName);
    if (watcherDesc) formData.append('watcherDesc', watcherDesc);
    formData.append('emsFilePath', emsFilePath);
    formData.append('irFilePath', irFilePath);
    const response = await apiClient.post<ApiResponse<Watcher>>('/ivr-watcher-create', formData);
    return response.data?.data;
  },

  deleteWatcher: async ({ watcherId, systemId }: { watcherId: number; systemId: number }): Promise<boolean> => {
    const response = await apiClient.delete<ApiResponse<boolean>>('/ivr-watcher-delete', { params: { watcherId, systemId } });
    return response.data?.data ?? false;
  },

  /**
   * Watcher 재시작 — 선택 시스템 IOSVR reloading (AS-IS IPR20S6042_Reloading). {systemId} path.
   *  body 는 빈 객체 {} 전송 — null 이면 axios 가 Content-Type 을 제거해 BFF POST 핸들러 매칭 실패(415).
   *  (BFF flow 에 BODY_FROM 없어 빈 body 는 백엔드로 전달되지 않음)
   */
  restartWatcher: async ({ systemId }: { systemId: number }): Promise<boolean> => {
    const response = await apiClient.post<ApiResponse<boolean>>('/ivr-watcher-restart', {}, { params: { systemId } });
    return response.data?.data ?? false;
  },
};
