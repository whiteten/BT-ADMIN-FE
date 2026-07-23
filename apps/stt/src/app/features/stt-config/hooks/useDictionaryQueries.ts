import { useMutation, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { type MutationHookOptions, type QueryHookWithParamsOptions, downloadBlob, extractFileName } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
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

export const dictionaryQueryKeys = createAppQueryKeys('dictionary', {
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

export const useDeleteKeywordBoosting = ({ mutationOptions }: MutationHookOptions<unknown, { tenantId: number; engineCode: string; keyword: string }> = {}) => {
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

export const useDeleteSttDictionary = ({ mutationOptions }: MutationHookOptions<unknown, { tenantId: number; beforeWord: string }> = {}) => {
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

export const useExportSttDictionaryTemplate = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: async () => {
      const response = await dictionaryApi.exportSttDictionaryTemplate();
      const fileName = extractFileName(response.headers['content-disposition'], `STT_사전_가져오기_템플릿_${dayjs().format('YYYYMMDD')}.xlsx`);
      downloadBlob(response.data, fileName);
    },
    ...mutationOptions,
  });
};

export const useExportKeywordBoostingTemplate = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: async () => {
      const response = await dictionaryApi.exportKeywordBoostingTemplate();
      const fileName = extractFileName(response.headers['content-disposition'], `STT_키워드부스팅_가져오기_템플릿_${dayjs().format('YYYYMMDD')}.xlsx`);
      downloadBlob(response.data, fileName);
    },
    ...mutationOptions,
  });
};
