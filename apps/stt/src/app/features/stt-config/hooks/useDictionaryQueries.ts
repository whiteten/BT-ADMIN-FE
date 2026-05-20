import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { dictionaryApi } from '../api/dictionaryApi';
import type {
  ExcelImportResult,
  KeywordBoostingCreateData,
  KeywordBoostingItem,
  KeywordBoostingSearchParams,
  SttDictionaryCreateData,
  SttDictionaryItem,
  SttDictionarySearchParams,
  SttDictionaryUpdateData,
} from '../types';

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

export const useDeleteKeywordBoosting = ({ mutationOptions }: MutationHookOptions<unknown, { engineCode: string; keyword: string }> = {}) => {
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

export const useUpdateSttDictionary = ({ mutationOptions }: MutationHookOptions<unknown, SttDictionaryUpdateData> = {}) => {
  return useMutation({
    mutationFn: dictionaryApi.updateSttDictionary,
    ...mutationOptions,
  });
};

export const useDeleteSttDictionary = ({ mutationOptions }: MutationHookOptions<unknown, { beforeWord: string }> = {}) => {
  return useMutation({
    mutationFn: dictionaryApi.deleteSttDictionary,
    ...mutationOptions,
  });
};

export const useImportSttDictionary = ({ mutationOptions }: MutationHookOptions<ExcelImportResult, File> = {}) => {
  return useMutation({
    mutationFn: dictionaryApi.importSttDictionary,
    ...mutationOptions,
  });
};

export const useImportKeywordBoosting = ({ mutationOptions }: MutationHookOptions<ExcelImportResult, { engineCode: string; data: File }> = {}) => {
  return useMutation({
    mutationFn: dictionaryApi.importKeywordBoosting,
    ...mutationOptions,
  });
};
