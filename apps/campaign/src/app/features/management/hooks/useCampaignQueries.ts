import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { campaignApi } from '../api/campaignApi';
import type { CampaignMasterDetailParams, CampaignMasterItem, CampaignMasterListItem } from '../types/campaign';

export const campaignQueryKeys = createQueryKeys('campaigns', {
  getCampaignMasterList: (params?: Record<string, unknown>) => [params],
  getCampaignMasterDetail: (params?: CampaignMasterDetailParams) => [params],
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
