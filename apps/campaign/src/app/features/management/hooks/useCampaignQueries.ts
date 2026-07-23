import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { campaignApi } from '../api/campaignApi';
import type { CampaignMasterDetailParams, CampaignMasterItem, CampaignMasterListItem } from '../types/campaign';
import type { CampaignScenarioListParams, CampaignScenarioMaster } from '../types/campaignScenario';

export const campaignQueryKeys = createAppQueryKeys('campaigns', {
  getCampaignMasterList: (params?: Record<string, unknown>) => [params],
  getCampaignMasterDetail: (params?: CampaignMasterDetailParams) => [params],
  getCampaignScenarioList: (params?: CampaignScenarioListParams) => [params],
});

export const useGetCampaignMasters = ({ params, queryOptions }: QueryHookWithParamsOptions<CampaignMasterListItem[]> = {}) =>
  useQuery({
    queryKey: campaignQueryKeys.getCampaignMasterList(params).queryKey,
    queryFn: () => campaignApi.getCampaignMasterList(params),
    ...queryOptions,
  });

export const useGetCampaignMasterDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<CampaignMasterItem | undefined> = {}) =>
  useQuery({
    queryKey: campaignQueryKeys.getCampaignMasterDetail(params as CampaignMasterDetailParams | undefined).queryKey,
    queryFn: () => campaignApi.getCampaignMasterDetail(params as CampaignMasterDetailParams),
    ...queryOptions,
  });

export const useGetCampaignScenarios = ({ params, queryOptions }: QueryHookWithParamsOptions<CampaignScenarioMaster[]> = {}) =>
  useQuery({
    queryKey: campaignQueryKeys.getCampaignScenarioList(params as CampaignScenarioListParams | undefined).queryKey,
    queryFn: () => campaignApi.getCampaignScenarioList(params as CampaignScenarioListParams),
    ...queryOptions,
  });

export const useCreateCampaignMaster = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: campaignApi.createCampaignMaster,
    ...mutationOptions,
  });

export const useUpdateCampaignMaster = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: campaignApi.updateCampaignMaster,
    ...mutationOptions,
  });

export const useDeleteCampaignMaster = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: campaignApi.deleteCampaignMaster,
    ...mutationOptions,
  });
