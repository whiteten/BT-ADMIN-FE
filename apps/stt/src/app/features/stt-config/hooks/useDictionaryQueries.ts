import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { dictionaryApi } from '../api/dictionaryApi';
import type { KeywordBoostingCreateData, KeywordBoostingItem, KeywordBoostingSearchParams, SttDictionaryCreateData, SttDictionaryItem, SttDictionarySearchParams } from '../types';

export const dictionaryQueryKeys = createQueryKeys('dictionary', {
  getKeywordBoostingList: (params?: KeywordBoostingSearchParams) => [params],
  getSttDictionaryList: (params?: SttDictionarySearchParams) => [params],
});

export const useGetKeywordBoostingList = ({ params, queryOptions }: QueryHookWithParamsOptions<KeywordBoostingItem[]> = {}) => {
  return useQuery({
    queryKey: dictionaryQueryKeys.getKeywordBoostingList(params as KeywordBoostingSearchParams).queryKey,
    queryFn: () => dictionaryApi.getKeywordBoostingList(params as KeywordBoostingSearchParams),
    ...queryOptions,
  });
};

export const useCreateKeywordBoosting = ({ mutationOptions }: MutationHookOptions<unknown, KeywordBoostingCreateData> = {}) => {
  return useMutation({
    mutationFn: dictionaryApi.createKeywordBoosting,
    ...mutationOptions,
  });
};

export const useDeleteKeywordBoosting = ({ mutationOptions }: MutationHookOptions<unknown, number> = {}) => {
  return useMutation({
    mutationFn: dictionaryApi.deleteKeywordBoosting,
    ...mutationOptions,
  });
};

export const useGetSttDictionaryList = ({ params, queryOptions }: QueryHookWithParamsOptions<SttDictionaryItem[]> = {}) => {
  return useQuery({
    queryKey: dictionaryQueryKeys.getSttDictionaryList(params as SttDictionarySearchParams).queryKey,
    queryFn: () => dictionaryApi.getSttDictionaryList(params as SttDictionarySearchParams),
    ...queryOptions,
  });
};

export const useCreateSttDictionary = ({ mutationOptions }: MutationHookOptions<unknown, SttDictionaryCreateData> = {}) => {
  return useMutation({
    mutationFn: dictionaryApi.createSttDictionary,
    ...mutationOptions,
  });
};

export const useDeleteSttDictionary = ({ mutationOptions }: MutationHookOptions<unknown, number> = {}) => {
  return useMutation({
    mutationFn: dictionaryApi.deleteSttDictionary,
    ...mutationOptions,
  });
};
