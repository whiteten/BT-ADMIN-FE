import { useQuery } from '@tanstack/react-query';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { searchApi } from '../api/searchApi';
import type {
  SttResultSentenceItem,
  SttResultSentenceParams,
  SttSearchCallbotDetailItem,
  SttSearchCallbotDetailParams,
  SttSearchCallbotItem,
  SttSearchCallbotParams,
  SttSearchItem,
  SttSearchListenParams,
  SttSearchListenParsed,
  SttSearchParams,
} from '../types';

export const searchQueryKeys = createAppQueryKeys('stts', {
  getSttSearch: (params?: SttSearchParams) => [params],
  getSttSearchCallbotList: (params?: SttSearchCallbotParams) => [params],
  getSttSearchCallbotDetail: (params?: SttSearchCallbotDetailParams) => [params],
  getSttResultSentence: (params?: SttResultSentenceParams) => [params],
  getSttSearchListen: (params?: SttSearchListenParams) => [params],
});

export const useGetSttSearch = ({ params, queryOptions }: QueryHookWithParamsOptions<SttSearchItem[]> = {}) => {
  return useQuery({
    queryKey: searchQueryKeys.getSttSearch(params as SttSearchParams).queryKey,
    queryFn: () => searchApi.getSttSearch(params as SttSearchParams),
    ...queryOptions,
  });
};

export const useGetSttSearchCallbot = ({ params, queryOptions }: QueryHookWithParamsOptions<SttSearchCallbotItem[]> = {}) => {
  return useQuery({
    queryKey: searchQueryKeys.getSttSearchCallbotList(params as SttSearchCallbotParams).queryKey,
    queryFn: () => searchApi.getSttSearchCallbot(params as SttSearchCallbotParams),
    ...queryOptions,
  });
};

export const useGetSttSearchCallbotDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<SttSearchCallbotDetailItem[]> = {}) => {
  return useQuery({
    queryKey: searchQueryKeys.getSttSearchCallbotDetail(params as SttSearchCallbotDetailParams).queryKey,
    queryFn: () => searchApi.getSttSearchCallbotDetail(params as SttSearchCallbotDetailParams),
    ...queryOptions,
  });
};

export const useGetSttResultSentence = ({ params, queryOptions }: QueryHookWithParamsOptions<SttResultSentenceItem[]> = {}) => {
  return useQuery({
    queryKey: searchQueryKeys.getSttResultSentence(params as unknown as SttResultSentenceParams).queryKey,
    queryFn: () => searchApi.getSttResultSentence(params as unknown as SttResultSentenceParams),
    ...queryOptions,
  });
};

export const useGetSttSearchListen = ({ params, queryOptions }: QueryHookWithParamsOptions<SttSearchListenParsed> = {}) => {
  return useQuery({
    queryKey: searchQueryKeys.getSttSearchListen(params as unknown as SttSearchListenParams).queryKey,
    queryFn: () => searchApi.getSttSearchListen(params as unknown as SttSearchListenParams),
    ...queryOptions,
  });
};
