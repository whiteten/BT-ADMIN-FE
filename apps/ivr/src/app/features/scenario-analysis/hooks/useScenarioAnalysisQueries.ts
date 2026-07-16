/**
 * 시나리오 분석 결과(AS-IS IPR20S6050/IPR20S6070) React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import { type MutationHookOptions, type QueryHookWithParamsOptions } from '@/shared-util';
import { type ScenarioAnalysisMenuUpdateParams, scenarioAnalysisApi } from '../api/scenarioAnalysisApi';
import type { ScenarioAnalysisCodeRow, ScenarioAnalysisMenuRow } from '../types';

export const scenarioAnalysisQueryKeys = createQueryKeys('ivrScenarioAnalysis', {
  getMenus: (params?: Record<string, unknown>) => [params],
  getCodes: (params?: Record<string, unknown>) => [params],
});

export const useGetScenarioAnalysisMenus = ({ params, queryOptions }: QueryHookWithParamsOptions<ScenarioAnalysisMenuRow[]> = {}) => {
  return useQuery({
    queryKey: scenarioAnalysisQueryKeys.getMenus(params).queryKey,
    queryFn: () => scenarioAnalysisApi.getMenus(params as { serviceId: number; serviceVer: string }),
    ...queryOptions,
  });
};

export const useGetScenarioAnalysisCodes = ({ params, queryOptions }: QueryHookWithParamsOptions<ScenarioAnalysisCodeRow[]> = {}) => {
  return useQuery({
    queryKey: scenarioAnalysisQueryKeys.getCodes(params).queryKey,
    queryFn: () => scenarioAnalysisApi.getCodes(params as { serviceId: number; serviceVer: string }),
    ...queryOptions,
  });
};

export const useUpdateScenarioAnalysisMenu = ({ mutationOptions }: MutationHookOptions<void, ScenarioAnalysisMenuUpdateParams> = {}) => {
  return useMutation({
    mutationFn: scenarioAnalysisApi.updateMenu,
    ...mutationOptions,
  });
};
