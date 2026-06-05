/**
 * IVR 시나리오/버전 관리 API 클라이언트
 * BFF Aggregation Flow 기반 (V80 등록).
 *
 * 등록된 flow (TB_BT_CM_AGG_FLOW_MST):
 * - ivr-scenario-list             GET    시나리오 목록 (BOT 제외)
 * - ivr-scenario-detail           GET    시나리오 단건
 * - ivr-scenario-create           POST   시나리오 등록
 * - ivr-scenario-update           PUT    시나리오 수정
 * - ivr-scenario-delete           DELETE 시나리오 삭제
 * - ivr-scenario-version-list     GET    버전 목록
 * - ivr-scenario-version-detail   GET    버전 단건
 * - ivr-scenario-version-create   POST   버전 등록 (IFE Flow 자동)
 * - ivr-scenario-version-delete   DELETE 버전 삭제
 * - ivr-scenario-publish          POST   시나리오 배포 (실시간/예약)
 * - ivr-scenario-deployed-systems GET    배포된 시스템 목록 (사이드바용)
 * - ivr-scenario-webfloweditor    POST   IFE 토큰 발급 (대화편집 진입)
 * - ivr-scenario-download         GET    SXML 파일 다운로드
 *
 * ※ upload는 IFE → BT-ADMIN 직접 콜백 (BFF 미경유)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  DeployTargetSystem,
  DeployedSystem,
  IfeTokenInfo,
  Scenario,
  ScenarioCreateRequest,
  ScenarioPublishRequest,
  ScenarioUpdateRequest,
  ScenarioVersion,
  ScenarioVersionCreateRequest,
  ScenarioVersionUpdateRequest,
  SystemDeployConfigSaveRequest,
  SystemDeployItem,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const scenarioApi = {
  // ─── 시나리오 마스터 CRUD ────────────────────────────────────────────────

  getScenarios: async (params?: Record<string, unknown>): Promise<Scenario[]> => {
    const response = await apiClient.get<ApiResponse<{ value: Scenario[] }>>('/ivr-scenario-list', { params });
    return response.data?.data?.value ?? [];
  },

  getScenarioDetail: async (params: Record<string, unknown>): Promise<Scenario> => {
    const response = await apiClient.get<ApiResponse<Scenario>>('/ivr-scenario-detail', { params });
    return response.data?.data;
  },

  createScenario: async (data: ScenarioCreateRequest): Promise<Scenario> => {
    const response = await apiClient.post<ApiResponse<Scenario>>('/ivr-scenario-create', data);
    return response.data?.data;
  },

  updateScenario: async ({ params, data }: { params: Record<string, unknown>; data: ScenarioUpdateRequest }): Promise<Scenario> => {
    const response = await apiClient.put<ApiResponse<Scenario>>('/ivr-scenario-update', data, { params });
    return response.data?.data;
  },

  deleteScenario: async (params: Record<string, unknown>) => {
    return apiClient.delete('/ivr-scenario-delete', { params });
  },

  // ─── 시나리오 버전 CRUD ─────────────────────────────────────────────────

  getVersions: async (params: Record<string, unknown>): Promise<ScenarioVersion[]> => {
    const response = await apiClient.get<ApiResponse<{ value: ScenarioVersion[] }>>('/ivr-scenario-version-list', { params });
    return response.data?.data?.value ?? [];
  },

  getVersionDetail: async (params: Record<string, unknown>): Promise<ScenarioVersion> => {
    const response = await apiClient.get<ApiResponse<ScenarioVersion>>('/ivr-scenario-version-detail', { params });
    return response.data?.data;
  },

  createVersion: async ({ params, data }: { params: Record<string, unknown>; data: ScenarioVersionCreateRequest }): Promise<ScenarioVersion> => {
    const response = await apiClient.post<ApiResponse<ScenarioVersion>>('/ivr-scenario-version-create', data, { params });
    return response.data?.data;
  },

  deleteVersion: async (params: Record<string, unknown>) => {
    return apiClient.delete('/ivr-scenario-version-delete', { params });
  },

  // ─── 배포 + IFE 진입 ────────────────────────────────────────────────────

  publishScenario: async ({ params, data }: { params: Record<string, unknown>; data: ScenarioPublishRequest }) => {
    return apiClient.post('/ivr-scenario-publish', data, { params });
  },

  getDeployedSystems: async (params: Record<string, unknown>): Promise<DeployedSystem[]> => {
    const response = await apiClient.get<ApiResponse<{ value: DeployedSystem[] }>>('/ivr-scenario-deployed-systems', { params });
    return response.data?.data?.value ?? [];
  },

  /**
   * 배포 현황 — 시나리오 전체의 모든 DNIS 시스템 풀상세 (버전 무관).
   *  @flow ivr-scenario-deploy-status
   */
  getDeployStatus: async (params: Record<string, unknown>): Promise<DeployedSystem[]> => {
    const response = await apiClient.get<ApiResponse<{ value: DeployedSystem[] }>>('/ivr-scenario-deploy-status', { params });
    return response.data?.data?.value ?? [];
  },

  /** 배포 대상 시스템 조회 — 할당 + HA 백업 포함 (사이드바용). */
  getDeployTargets: async (params: Record<string, unknown>): Promise<DeployTargetSystem[]> => {
    const response = await apiClient.get<ApiResponse<{ value: DeployTargetSystem[] }>>('/ivr-scenario-deploy-targets', { params });
    return response.data?.data?.value ?? [];
  },

  /**
   * IFE 토큰 발급 (대화편집 버튼 클릭 시 호출).
   * 응답의 redirectUrl을 window.open으로 열어 IFE 진입.
   */
  getIfeInfo: async ({ params, data }: { params: Record<string, unknown>; data: Record<string, unknown> }): Promise<IfeTokenInfo> => {
    const response = await apiClient.post<ApiResponse<IfeTokenInfo>>('/ivr-scenario-webfloweditor', data, { params });
    return response.data?.data;
  },

  /**
   * 시나리오 파일 다운로드 (Blob).
   */
  downloadScenario: async (params: Record<string, unknown>) => {
    const response = await apiClient.get<Blob>('/ivr-scenario-download', { params, responseType: 'blob' });
    return response;
  },

  /**
   * 시나리오 첨부 문서 다운로드 (Blob). SXML 다운로드와 좌우 대칭.
   *  @flow ivr-scenario-document-download
   */
  downloadScenarioDocument: async (params: Record<string, unknown>) => {
    const response = await apiClient.get<Blob>('/ivr-scenario-document-download', { params, responseType: 'blob' });
    return response;
  },

  /**
   * SXML 파일 업로드 — multipart. AS-IS SWAT 패턴 회귀로 사용자가 직접 업로드.
   *  ⚠ Content-Type 헤더는 명시하지 않는다. axios가 FormData를 감지하면 자동 설정.
   *  @flow ivr-scenario-upload
   */
  uploadScenarioFile: async ({ params, data }: { params: Record<string, unknown>; data: File }): Promise<ScenarioVersion> => {
    const formData = new FormData();
    formData.append('uploadFile', data);
    const response = await apiClient.post<ApiResponse<ScenarioVersion>>('/ivr-scenario-upload', formData, { params });
    return response.data?.data;
  },

  /**
   * 버전 등록 + SXML 파일 업로드 통합 — multipart. AS-IS SWAT IPR20S6020 패턴.
   * 파일은 옵션 — 없으면 메타정보만 등록.
   *  ⚠ Content-Type 헤더는 명시하지 않는다.
   *  @flow ivr-scenario-version-create-with-file
   */
  createVersionWithFile: async ({ params, data, file }: { params: Record<string, unknown>; data: ScenarioVersionCreateRequest; file?: File }): Promise<ScenarioVersion> => {
    const formData = new FormData();
    formData.append('serviceVer', data.serviceVer);
    if (data.versionName) formData.append('versionName', data.versionName);
    if (data.versionDesc) formData.append('versionDesc', data.versionDesc);
    if (data.statVisible !== undefined && data.statVisible !== null) formData.append('statVisible', String(data.statVisible));
    if (data.charsetType) formData.append('charsetType', data.charsetType);
    if (data.doScenarioAnal !== undefined && data.doScenarioAnal !== null) formData.append('doScenarioAnal', String(data.doScenarioAnal));
    if (file) formData.append('uploadFile', file);
    const response = await apiClient.post<ApiResponse<ScenarioVersion>>('/ivr-scenario-version-create-with-file', formData, { params });
    return response.data?.data;
  },

  /**
   * 버전 메타 수정 (파일 제외) — AS-IS SWAT IPR20S6020VU.do 대응.
   * versionName / versionDesc / statVisible / charsetType 만 수정. null 필드는 기존 값 유지.
   * @flow ivr-scenario-version-update
   */
  updateVersion: async ({ params, data }: { params: Record<string, unknown>; data: ScenarioVersionUpdateRequest }): Promise<ScenarioVersion> => {
    const response = await apiClient.put<ApiResponse<ScenarioVersion>>('/ivr-scenario-version-update', data, { params });
    return response.data?.data;
  },

  /**
   * 버전 메타 + SXML 재업로드 통합 — AS-IS SWAT IPR20S6020FU.do update 분기 (문서 제외).
   * multipart. SXML 옵션 — 없으면 메타만 수정.
   *  ⚠ Content-Type 헤더는 명시하지 않는다.
   *  ⚠ 시나리오 문서는 별도 호출(uploadDocument) — BFF의 multipart part name 강제 변환 회피용 분리.
   *  @flow ivr-scenario-version-update-with-file
   */
  updateVersionWithFile: async ({ params, data, file }: { params: Record<string, unknown>; data: ScenarioVersionUpdateRequest; file?: File }): Promise<ScenarioVersion> => {
    const formData = new FormData();
    if (data.versionName !== undefined) formData.append('versionName', data.versionName);
    if (data.versionDesc !== undefined) formData.append('versionDesc', data.versionDesc);
    if (data.statVisible !== undefined && data.statVisible !== null) formData.append('statVisible', String(data.statVisible));
    if (data.charsetType) formData.append('charsetType', data.charsetType);
    if (data.doScenarioAnal !== undefined && data.doScenarioAnal !== null) formData.append('doScenarioAnal', String(data.doScenarioAnal));
    if (file) formData.append('uploadFile', file);
    const response = await apiClient.post<ApiResponse<ScenarioVersion>>('/ivr-scenario-version-update-with-file', formData, { params });
    return response.data?.data;
  },

  /**
   * 시나리오 첨부 문서 업로드 (UPSERT) — AS-IS scenarioDocumentBinary 동등.
   * multipart 단일 파일. 버전 메타/SXML 업로드와 분리된 독립 호출.
   *  ⚠ Content-Type 헤더는 명시하지 않는다.
   *  @flow ivr-scenario-version-document-upload
   */
  uploadDocument: async ({ params, file }: { params: Record<string, unknown>; file: File }): Promise<ScenarioVersion> => {
    const formData = new FormData();
    formData.append('documentFile', file);
    const response = await apiClient.post<ApiResponse<ScenarioVersion>>('/ivr-scenario-version-document-upload', formData, { params });
    return response.data?.data;
  },

  // ─── 배포 설정 (FCA 봇 'bot-deploy-config' / 'bot-deploy-config-save' 미러링) ───

  /**
   * 시나리오의 배포 후보 시스템 + 할당 여부 조회.
   * 백엔드 응답: ApiResponse<PagedResponse<SystemDeployItem>> → data.items[].
   * @flow ivr-scenario-deploy-config
   */
  getDeployConfig: async (params?: Record<string, unknown>): Promise<SystemDeployItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: SystemDeployItem[] }>>('/ivr-scenario-deploy-config', { params });
    return response.data?.data?.items ?? [];
  },

  /**
   * 시나리오 배포 설정 저장 — systemIds 리스트 (delta apply).
   * @flow ivr-scenario-deploy-config-save
   */
  saveDeployConfig: async ({ params, data }: { params: Record<string, unknown>; data: SystemDeployConfigSaveRequest }) => {
    const response = await apiClient.post('/ivr-scenario-deploy-config-save', data, { params });
    return response;
  },
};
