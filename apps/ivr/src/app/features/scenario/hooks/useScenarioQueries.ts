/**
 * IVR 시나리오/버전 관리 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { scenarioApi } from '../api/scenarioApi';
import type { DeployTargetSystem, DeployedSystem, Scenario, ScenarioVersion, SystemDeployItem } from '../types';

export const scenarioQueryKeys = createQueryKeys('ivrScenarios', {
  getScenarios: (params?: Record<string, unknown>) => [params],
  getScenarioDetail: (params?: Record<string, unknown>) => [params],
  getVersions: (params?: Record<string, unknown>) => [params],
  getVersionDetail: (params?: Record<string, unknown>) => [params],
  getDeployedSystems: (params?: Record<string, unknown>) => [params],
  getDeployTargets: (params?: Record<string, unknown>) => [params],
  getDeployConfig: (params?: Record<string, unknown>) => [params],
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
    mutationFn: scenarioApi.downloadScenario,
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
