import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { campaignStatisticsApi } from '../api/campaignStatisticsApi';
import type { CampaignAchievementStatList, CampaignOptionListItem, CampaignResultStatList, TenantOptionListItem } from '../types';

export const campaignStatisticsQueryKeys = createQueryKeys('campaignStatistics', {
  getCampaignResultStatList: (params?: Record<string, unknown>) => [params],
  getCampaignAchievementStatList: (params?: Record<string, unknown>) => [params],
  getTenantOptionList: (params?: Record<string, unknown>) => [params],
  getCampaignOptionList: (params?: Record<string, unknown>) => [params],
});

export const useGetCampaignResultStatList = ({ params, queryOptions }: QueryHookWithParamsOptions<CampaignResultStatList> = {}) => {
  return useQuery({
    queryKey: campaignStatisticsQueryKeys.getCampaignResultStatList(params).queryKey,
    queryFn: () => campaignStatisticsApi.getCampaignResultStatList(params),
    ...queryOptions,
  });
};

export const useGetCampaignAchievementStatList = ({ params, queryOptions }: QueryHookWithParamsOptions<CampaignAchievementStatList> = {}) => {
  return useQuery({
    queryKey: campaignStatisticsQueryKeys.getCampaignAchievementStatList(params).queryKey,
    queryFn: () => campaignStatisticsApi.getCampaignAchievementStatList(params),
    ...queryOptions,
  });
};

export const useGetTenantOptionList = ({ params, queryOptions }: QueryHookWithParamsOptions<TenantOptionListItem[]> = {}) => {
  return useQuery({
    queryKey: campaignStatisticsQueryKeys.getTenantOptionList(params).queryKey,
    queryFn: () => campaignStatisticsApi.getTenantOptionList(params),
    ...queryOptions,
  });
};

export const useGetCampaignOptionList = ({ params, queryOptions }: QueryHookWithParamsOptions<CampaignOptionListItem[]> = {}) => {
  return useQuery({
    queryKey: campaignStatisticsQueryKeys.getCampaignOptionList(params).queryKey,
    queryFn: () => campaignStatisticsApi.getCampaignOptionList(params),
    ...queryOptions,
  });
};
