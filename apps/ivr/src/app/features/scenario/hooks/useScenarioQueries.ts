/**
 * IVR 시나리오/버전 관리 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import { type MutationHookOptions, type QueryHookOptions, type QueryHookWithParamsOptions, downloadBlob, extractFileName } from '@/shared-util';
import { scenarioApi, scenarioMenuControlApi } from '../api/scenarioApi';
import type {
  DeployTargetSystem,
  DeployedSystem,
  Scenario,
  ScenarioAssignedStatusRow,
  ScenarioMenuControlRow,
  ScenarioMenuControlUpdateRequest,
  ScenarioMenuSuperAni,
  ScenarioMenuSuperAniCreateRequest,
  ScenarioMenuSuperAniUpdateRequest,
  ScenarioVersion,
  SystemDeployItem,
} from '../types';

export const scenarioQueryKeys = createQueryKeys('ivrScenarios', {
  getScenarios: (params?: Record<string, unknown>) => [params],
  getScenarioDetail: (params?: Record<string, unknown>) => [params],
  getVersions: (params?: Record<string, unknown>) => [params],
  getVersionDetail: (params?: Record<string, unknown>) => [params],
  getDeployedSystems: (params?: Record<string, unknown>) => [params],
  getDeployStatus: (params?: Record<string, unknown>) => [params],
  getDeployTargets: (params?: Record<string, unknown>) => [params],
  getDeployConfig: (params?: Record<string, unknown>) => [params],
  getAssignedStatus: (params?: Record<string, unknown>) => [params],
  getAssignedHistory: (params?: Record<string, unknown>) => [params],
});

// ─── 시나리오 마스터 ────────────────────────────────────────────────────────

export const useGetScenarios = ({ params, queryOptions }: QueryHookWithParamsOptions<Scenario[]> = {}) => {
  return useQuery({
    queryKey: scenarioQueryKeys.getScenarios(params).queryKey,
    queryFn: () => scenarioApi.getScenarios(params),
    ...queryOptions,
  });
};

export const useGetScenarioDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<Scenario> = {}) => {
  return useQuery({
    queryKey: scenarioQueryKeys.getScenarioDetail(params).queryKey,
    queryFn: () => scenarioApi.getScenarioDetail(params ?? {}),
    ...queryOptions,
  });
};

export const useCreateScenario = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: scenarioApi.createScenario,
    ...mutationOptions,
  });
};

export const useUpdateScenario = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: scenarioApi.updateScenario,
    ...mutationOptions,
  });
};

export const useDeleteScenario = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: scenarioApi.deleteScenario,
    ...mutationOptions,
  });
};

// ─── 시스템별 시나리오 할당 현황 (IPR20S6020) ──────────────────────────────
export const useGetScenarioAssignedStatus = ({ params, queryOptions }: QueryHookWithParamsOptions<ScenarioAssignedStatusRow[]> = {}) => {
  return useQuery({
    queryKey: scenarioQueryKeys.getAssignedStatus(params).queryKey,
    queryFn: () => scenarioApi.getAssignedStatus(params),
    ...queryOptions,
  });
};

export const useGetScenarioAssignedHistory = ({ params, queryOptions }: QueryHookWithParamsOptions<ScenarioAssignedStatusRow[]> = {}) => {
  return useQuery({
    queryKey: scenarioQueryKeys.getAssignedHistory(params).queryKey,
    queryFn: () => scenarioApi.getAssignedHistory(params),
    ...queryOptions,
  });
};

// ─── 시나리오 버전 ──────────────────────────────────────────────────────────

export const useGetVersions = ({ params, queryOptions }: QueryHookWithParamsOptions<ScenarioVersion[]> = {}) => {
  return useQuery({
    queryKey: scenarioQueryKeys.getVersions(params).queryKey,
    queryFn: () => scenarioApi.getVersions(params ?? {}),
    ...queryOptions,
  });
};

export const useGetVersionDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<ScenarioVersion> = {}) => {
  return useQuery({
    queryKey: scenarioQueryKeys.getVersionDetail(params).queryKey,
    queryFn: () => scenarioApi.getVersionDetail(params ?? {}),
    ...queryOptions,
  });
};

export const useCreateVersion = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: scenarioApi.createVersion,
    ...mutationOptions,
  });
};

export const useDeleteVersion = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: scenarioApi.deleteVersion,
    ...mutationOptions,
  });
};

// ─── 배포 + IFE 진입 ────────────────────────────────────────────────────────

export const usePublishScenario = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: scenarioApi.publishScenario,
    ...mutationOptions,
  });
};

export const useGetDeployedSystems = ({ params, queryOptions }: QueryHookWithParamsOptions<DeployedSystem[]> = {}) => {
  return useQuery({
    queryKey: scenarioQueryKeys.getDeployedSystems(params).queryKey,
    queryFn: () => scenarioApi.getDeployedSystems(params ?? {}),
    ...queryOptions,
  });
};

/** 배포 현황 — 시나리오 전체의 모든 DNIS 시스템 풀상세. */
export const useGetDeployStatus = ({ params, queryOptions }: QueryHookWithParamsOptions<DeployedSystem[]> = {}) => {
  return useQuery({
    queryKey: scenarioQueryKeys.getDeployStatus(params).queryKey,
    queryFn: () => scenarioApi.getDeployStatus(params ?? {}),
    ...queryOptions,
  });
};

export const useGetDeployTargets = ({ params, queryOptions }: QueryHookWithParamsOptions<DeployTargetSystem[]> = {}) => {
  return useQuery({
    queryKey: scenarioQueryKeys.getDeployTargets(params).queryKey,
    queryFn: () => scenarioApi.getDeployTargets(params ?? {}),
    ...queryOptions,
  });
};

export const useGetIfeInfo = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: scenarioApi.getIfeInfo,
    ...mutationOptions,
  });
};

export const useDownloadScenario = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: async (params: Record<string, unknown>) => {
      const response = await scenarioApi.downloadScenario(params);
      const fileName = extractFileName(response.headers['content-disposition'], `scenario_${params['serviceId']}_v${params['serviceVer']}.SXML`);
      downloadBlob(response.data, fileName);
    },
    ...mutationOptions,
  });
};

/** 시나리오 첨부 문서 다운로드 (Blob). SXML 다운로드와 좌우 대칭. */
export const useDownloadScenarioDocument = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: async (params: Record<string, unknown>) => {
      const response = await scenarioApi.downloadScenarioDocument(params);
      const fileName = extractFileName(response.headers['content-disposition'], `scenario_doc_${params['serviceId']}_v${params['serviceVer']}`);
      downloadBlob(response.data, fileName);
    },
    ...mutationOptions,
  });
};

/** SXML 파일 업로드 — AS-IS SWAT 패턴 (사용자가 직접 업로드). */
export const useUploadScenarioFile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: scenarioApi.uploadScenarioFile,
    ...mutationOptions,
  });
};

/** 버전 등록 + 파일 업로드 통합 (AS-IS IPR20S6020 패턴, 단일 multipart 호출). */
export const useCreateVersionWithFile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: scenarioApi.createVersionWithFile,
    ...mutationOptions,
  });
};

/** 버전 메타 수정 (AS-IS IPR20S6020VU.do 대응). 파일은 변경 안 함. */
export const useUpdateVersion = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: scenarioApi.updateVersion,
    ...mutationOptions,
  });
};

/** 버전 메타 + SXML 재업로드 통합 (AS-IS IPR20S6020FU.do update 분기, 문서 제외). */
export const useUpdateVersionWithFile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: scenarioApi.updateVersionWithFile,
    ...mutationOptions,
  });
};

/** 시나리오 첨부 문서 업로드 (UPSERT) — 버전 메타/SXML 업로드와 분리된 독립 호출. */
export const useUploadDocument = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: scenarioApi.uploadDocument,
    ...mutationOptions,
  });
};

// ─── 배포 설정 (FCA 봇 useGetBotDeployConfig / useSaveBotDeployConfig 미러링) ───

export const useGetDeployConfig = ({ params, queryOptions }: QueryHookWithParamsOptions<SystemDeployItem[]> = {}) => {
  return useQuery({
    queryKey: scenarioQueryKeys.getDeployConfig(params).queryKey,
    queryFn: () => scenarioApi.getDeployConfig(params),
    ...queryOptions,
  });
};

export const useSaveDeployConfig = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: scenarioApi.saveDeployConfig,
    ...mutationOptions,
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// 시나리오 메뉴 제어 (AS-IS IPR30S3035)
// ═══════════════════════════════════════════════════════════════════════════

export const scenarioMenuControlQueryKeys = createQueryKeys('ivrScenarioMenuControl', {
  getScenarioMenuControls: (params?: Record<string, unknown>) => [params],
  getSuperAnis: null,
});

// ─── 시나리오 메뉴 제어 ────────────────────────────────────────────────────

export const useGetScenarioMenuControls = ({ params, queryOptions }: QueryHookWithParamsOptions<ScenarioMenuControlRow[]> = {}) => {
  return useQuery({
    queryKey: scenarioMenuControlQueryKeys.getScenarioMenuControls(params).queryKey,
    queryFn: () => scenarioMenuControlApi.getScenarioMenuControls(params ?? {}),
    ...queryOptions,
  });
};

export const useUpdateScenarioMenuControl = ({
  mutationOptions,
}: MutationHookOptions<ScenarioMenuControlRow, { serviceId: number; serviceVer: string; menuId: string; data: ScenarioMenuControlUpdateRequest }> = {}) => {
  return useMutation({
    mutationFn: scenarioMenuControlApi.updateScenarioMenuControl,
    ...mutationOptions,
  });
};

// ─── Super ANI ─────────────────────────────────────────────────────────────

export const useGetSuperAnis = ({ queryOptions }: QueryHookOptions<ScenarioMenuSuperAni[]> = {}) => {
  return useQuery({
    queryKey: scenarioMenuControlQueryKeys.getSuperAnis.queryKey,
    queryFn: () => scenarioMenuControlApi.getSuperAnis(),
    ...queryOptions,
  });
};

export const useCreateSuperAni = ({ mutationOptions }: MutationHookOptions<ScenarioMenuSuperAni, ScenarioMenuSuperAniCreateRequest> = {}) => {
  return useMutation({
    mutationFn: scenarioMenuControlApi.createSuperAni,
    ...mutationOptions,
  });
};

export const useUpdateSuperAni = ({ mutationOptions }: MutationHookOptions<ScenarioMenuSuperAni, { ani: string; data: ScenarioMenuSuperAniUpdateRequest }> = {}) => {
  return useMutation({
    mutationFn: scenarioMenuControlApi.updateSuperAni,
    ...mutationOptions,
  });
};

export const useDeleteSuperAni = ({ mutationOptions }: MutationHookOptions<unknown, { ani: string }> = {}) => {
  return useMutation({
    mutationFn: scenarioMenuControlApi.deleteSuperAni,
    ...mutationOptions,
  });
};
