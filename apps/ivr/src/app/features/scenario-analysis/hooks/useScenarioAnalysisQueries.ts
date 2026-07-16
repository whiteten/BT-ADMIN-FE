/**
 * 시나리오 분석 결과(AS-IS IPR20S6050/IPR20S6070) React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import { type MutationHookOptions, type QueryHookWithParamsOptions } from '@/shared-util';
import { type ScenarioAnalysisMenuUpdateParams, scenarioAnalysisApi } from '../api/scenarioAnalysisApi';
import type {
  ScenarioAnalysisCodeRow,
  ScenarioAnalysisMenuRow,
  ScenarioAnalysisPacketItemRow,
  ScenarioAnalysisPacketRow,
  ScenarioAnalysisTrackingItemRow,
  ScenarioAnalysisUserStatCategoryRow,
  ScenarioAnalysisUserStatItemRow,
} from '../types';

export const scenarioAnalysisQueryKeys = createQueryKeys('ivrScenarioAnalysis', {
  getMenus: (params?: Record<string, unknown>) => [params],
  getCodes: (params?: Record<string, unknown>) => [params],
  getTrackingItems: (params?: Record<string, unknown>) => [params],
  getPackets: (params?: Record<string, unknown>) => [params],
  getPacketItems: (params?: Record<string, unknown>) => [params],
  getUserStatCategories: (params?: Record<string, unknown>) => [params],
  getUserStatItems: (params?: Record<string, unknown>) => [params],
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

export const useGetScenarioAnalysisTrackingItems = ({ params, queryOptions }: QueryHookWithParamsOptions<ScenarioAnalysisTrackingItemRow[]> = {}) => {
  return useQuery({
    queryKey: scenarioAnalysisQueryKeys.getTrackingItems(params).queryKey,
    queryFn: () => scenarioAnalysisApi.getTrackingItems(params as { serviceId: number; serviceVer: string }),
    ...queryOptions,
  });
};

export const useGetScenarioAnalysisPackets = ({ params, queryOptions }: QueryHookWithParamsOptions<ScenarioAnalysisPacketRow[]> = {}) => {
  return useQuery({
    queryKey: scenarioAnalysisQueryKeys.getPackets(params).queryKey,
    queryFn: () => scenarioAnalysisApi.getPackets(params as { serviceId: number; serviceVer: string }),
    ...queryOptions,
  });
};

export const useGetScenarioAnalysisPacketItems = ({ params, queryOptions }: QueryHookWithParamsOptions<ScenarioAnalysisPacketItemRow[]> = {}) => {
  return useQuery({
    queryKey: scenarioAnalysisQueryKeys.getPacketItems(params).queryKey,
    queryFn: () => scenarioAnalysisApi.getPacketItems(params as { serviceId: number; serviceVer: string; packetId: string }),
    ...queryOptions,
  });
};

export const useGetScenarioAnalysisUserStatCategories = ({ params, queryOptions }: QueryHookWithParamsOptions<ScenarioAnalysisUserStatCategoryRow[]> = {}) => {
  return useQuery({
    queryKey: scenarioAnalysisQueryKeys.getUserStatCategories(params).queryKey,
    queryFn: () => scenarioAnalysisApi.getUserStatCategories(params as { serviceId: number; serviceVer: string }),
    ...queryOptions,
  });
};

export const useGetScenarioAnalysisUserStatItems = ({ params, queryOptions }: QueryHookWithParamsOptions<ScenarioAnalysisUserStatItemRow[]> = {}) => {
  return useQuery({
    queryKey: scenarioAnalysisQueryKeys.getUserStatItems(params).queryKey,
    queryFn: () => scenarioAnalysisApi.getUserStatItems(params as { serviceId: number; serviceVer: string; categoryId: string }),
    ...queryOptions,
  });
};
