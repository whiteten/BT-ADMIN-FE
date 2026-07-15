/**
 * 시나리오 메뉴 제어(AS-IS IPR30S3035) React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import { type MutationHookOptions, type QueryHookOptions, type QueryHookWithParamsOptions } from '@/shared-util';
import { scenarioMenuControlApi } from '../api/scenarioMenuControlApi';
import type {
  ScenarioMenuControlRow,
  ScenarioMenuControlUpdateRequest,
  ScenarioMenuSuperAni,
  ScenarioMenuSuperAniCreateRequest,
  ScenarioMenuSuperAniUpdateRequest,
} from '../types';

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
