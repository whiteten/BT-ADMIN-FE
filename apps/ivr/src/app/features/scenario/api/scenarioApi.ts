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
import ApiClient, { type DetailResponse, extractDetail } from '@/shared-util';
import type {
  DeployedSystem,
  IfeTokenInfo,
  Scenario,
  ScenarioCreateRequest,
  ScenarioPublishRequest,
  ScenarioUpdateRequest,
  ScenarioVersion,
  ScenarioVersionCreateRequest,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const scenarioApi = {
  // ─── 시나리오 마스터 CRUD ────────────────────────────────────────────────

  getScenarios: async (params?: Record<string, unknown>): Promise<Scenario[]> => {
    const response = await apiClient.get<DetailResponse<{ value: Scenario[] }>>('/ivr-scenario-list', { params });
    return extractDetail(response)?.value ?? [];
  },

  getScenarioDetail: async (params: Record<string, unknown>): Promise<Scenario> => {
    const response = await apiClient.get<DetailResponse<Scenario>>('/ivr-scenario-detail', { params });
    return extractDetail(response);
  },

  createScenario: async (data: ScenarioCreateRequest): Promise<Scenario> => {
    const response = await apiClient.post<DetailResponse<Scenario>>('/ivr-scenario-create', data);
    return extractDetail(response);
  },

  updateScenario: async ({ params, data }: { params: Record<string, unknown>; data: ScenarioUpdateRequest }): Promise<Scenario> => {
    const response = await apiClient.put<DetailResponse<Scenario>>('/ivr-scenario-update', data, { params });
    return extractDetail(response);
  },

  deleteScenario: async (params: Record<string, unknown>) => {
    return apiClient.delete('/ivr-scenario-delete', { params });
  },

  // ─── 시나리오 버전 CRUD ─────────────────────────────────────────────────

  getVersions: async (params: Record<string, unknown>): Promise<ScenarioVersion[]> => {
    const response = await apiClient.get<DetailResponse<{ value: ScenarioVersion[] }>>('/ivr-scenario-version-list', { params });
    return extractDetail(response)?.value ?? [];
  },

  getVersionDetail: async (params: Record<string, unknown>): Promise<ScenarioVersion> => {
    const response = await apiClient.get<DetailResponse<ScenarioVersion>>('/ivr-scenario-version-detail', { params });
    return extractDetail(response);
  },

  createVersion: async ({ params, data }: { params: Record<string, unknown>; data: ScenarioVersionCreateRequest }): Promise<ScenarioVersion> => {
    const response = await apiClient.post<DetailResponse<ScenarioVersion>>('/ivr-scenario-version-create', data, { params });
    return extractDetail(response);
  },

  deleteVersion: async (params: Record<string, unknown>) => {
    return apiClient.delete('/ivr-scenario-version-delete', { params });
  },

  // ─── 배포 + IFE 진입 ────────────────────────────────────────────────────

  publishScenario: async ({ params, data }: { params: Record<string, unknown>; data: ScenarioPublishRequest }) => {
    return apiClient.post('/ivr-scenario-publish', data, { params });
  },

  getDeployedSystems: async (params: Record<string, unknown>): Promise<DeployedSystem[]> => {
    const response = await apiClient.get<DetailResponse<{ value: DeployedSystem[] }>>('/ivr-scenario-deployed-systems', { params });
    return extractDetail(response)?.value ?? [];
  },

  /**
   * IFE 토큰 발급 (대화편집 버튼 클릭 시 호출).
   * 응답의 redirectUrl을 window.open으로 열어 IFE 진입.
   */
  getIfeInfo: async ({ params, data }: { params: Record<string, unknown>; data: Record<string, unknown> }): Promise<IfeTokenInfo> => {
    const response = await apiClient.post<DetailResponse<IfeTokenInfo>>('/ivr-scenario-webfloweditor', data, { params });
    return extractDetail(response);
  },

  /**
   * SXML 파일 다운로드 (Blob).
   */
  downloadScenario: async (params: Record<string, unknown>) => {
    const response = await apiClient.get<Blob>('/ivr-scenario-download', { params, responseType: 'blob' });
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
    const response = await apiClient.post<DetailResponse<ScenarioVersion>>('/ivr-scenario-upload', formData, { params });
    return extractDetail(response);
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
    if (file) formData.append('uploadFile', file);
    const response = await apiClient.post<DetailResponse<ScenarioVersion>>('/ivr-scenario-version-create-with-file', formData, { params });
    return extractDetail(response);
  },
};
