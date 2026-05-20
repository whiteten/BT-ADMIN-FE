import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import dayjs from 'dayjs';
import { type MutationHookOptions, type QueryHookWithParamsOptions, downloadBlob, extractFileName } from '@/shared-util';
import { aoeApi } from '../api/aoeApi';
import type { AoeBasicDetailItem, FaqAgentListItem, FaqDetailItem, FaqListItem } from '../types';

/**
 * AOE 확장 Query Keys
 */
export const aoeQueryKeys = createQueryKeys('aoe', {
  getAoeBasicDetail: (params?: Record<string, unknown>) => [params],
  getFaqAgentList: (params?: Record<string, unknown>) => [params],
  getFaqList: (params?: Record<string, unknown>) => [params],
  getFaqDetail: (params?: Record<string, unknown>) => [params],
});

/**
 * AOE 확장 기본 정보 조회 훅
 */
export const useGetAoeBasicDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<AoeBasicDetailItem> = {}) => {
  return useQuery({
    queryKey: aoeQueryKeys.getAoeBasicDetail(params).queryKey,
    queryFn: () => aoeApi.getAoeBasicDetail(params),
    ...queryOptions,
  });
};

/**
 * AOE 확장 기본 정보 생성 훅 (upsert)
 */
export const useCreateAoeBasic = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: aoeApi.createAoeBasic,
    ...mutationOptions,
  });
};

/**
 * FAQ Agent 목록 조회 훅
 */
export const useGetFaqAgentList = ({ params, queryOptions }: QueryHookWithParamsOptions<FaqAgentListItem[]> = {}) => {
  return useQuery({
    queryKey: aoeQueryKeys.getFaqAgentList(params).queryKey,
    queryFn: () => aoeApi.getFaqAgentList(params),
    ...queryOptions,
  });
};

/**
 * FAQ 목록 조회 훅
 */
export const useGetFaqList = ({ params, queryOptions }: QueryHookWithParamsOptions<FaqListItem[]> = {}) => {
  return useQuery({
    queryKey: aoeQueryKeys.getFaqList(params).queryKey,
    queryFn: () => aoeApi.getFaqList(params),
    ...queryOptions,
  });
};

/**
 * FAQ 상세 조회 훅
 */
export const useGetFaqDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<FaqDetailItem> = {}) => {
  return useQuery({
    queryKey: aoeQueryKeys.getFaqDetail(params).queryKey,
    queryFn: () => aoeApi.getFaqDetail(params),
    ...queryOptions,
  });
};

/**
 * FAQ 생성 훅
 */
export const useCreateFaq = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: aoeApi.createFaq,
    ...mutationOptions,
  });
};

/**
 * FAQ 삭제 훅
 */
export const useDeleteFaq = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: aoeApi.deleteFaq,
    ...mutationOptions,
  });
};

/**
 * FAQ 수정 훅
 */
export const useUpdateFaq = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: aoeApi.updateFaq,
    ...mutationOptions,
  });
};

/**
 * FAQ 적용 훅
 */
export const useApplyFaq = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: aoeApi.applyFaq,
    ...mutationOptions,
  });
};

/**
 * FAQ Export 훅
 */
export const useExportFaq = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: async (params: Record<string, unknown>) => {
      const response = await aoeApi.exportFaq(params);
      const fileName = extractFileName(response.headers['content-disposition'], `FAQ_${dayjs().format('YYYYMMDD')}.xlsx`);
      downloadBlob(response.data, fileName);
    },
    ...mutationOptions,
  });
};

/**
 * FAQ Import 훅
 */
export const useImportFaq = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: aoeApi.importFaq,
    ...mutationOptions,
  });
};
