import { type UseMutationOptions, useMutation, useQuery } from '@tanstack/react-query';
import type { QueryHookWithParamsOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { ingestionApi } from '../api/ingestionApi';
import type { IngestError, IngestHistory, IngestMapping, IngestMappingListItem, IngestMappingSaveDatas, TargetFieldDef } from '../types';

export const ingestionQueryKeys = createAppQueryKeys('campaignIngestion', {
  targetFields: null,
  mappingList: null,
  mapping: (mappingId: number) => [mappingId],
  historyList: null,
  historyErrors: (historyId: number) => [historyId],
});

// ===== 조회 =====

export const useGetTargetFields = ({ queryOptions }: QueryHookWithParamsOptions<TargetFieldDef[]> = {}) =>
  useQuery({
    queryKey: ingestionQueryKeys.targetFields.queryKey,
    queryFn: () => ingestionApi.getTargetFields(),
    ...queryOptions,
  });

export const useGetIngestMappingList = ({ queryOptions }: QueryHookWithParamsOptions<IngestMappingListItem[]> = {}) =>
  useQuery({
    queryKey: ingestionQueryKeys.mappingList.queryKey,
    queryFn: () => ingestionApi.getMappingList(),
    ...queryOptions,
  });

export const useGetIngestMapping = ({ params, queryOptions }: QueryHookWithParamsOptions<IngestMapping | null> = {}) => {
  const mappingId = Number(params?.mappingId);
  return useQuery({
    queryKey: ingestionQueryKeys.mapping(mappingId).queryKey,
    queryFn: () => ingestionApi.getMapping(mappingId),
    ...queryOptions,
  });
};

export const useGetIngestHistoryList = ({ queryOptions }: QueryHookWithParamsOptions<IngestHistory[]> = {}) =>
  useQuery({
    queryKey: ingestionQueryKeys.historyList.queryKey,
    queryFn: () => ingestionApi.getHistoryList(),
    ...queryOptions,
  });

export const useGetIngestHistoryErrors = ({ params, queryOptions }: QueryHookWithParamsOptions<IngestError[]> = {}) => {
  const historyId = Number(params?.historyId);
  return useQuery({
    queryKey: ingestionQueryKeys.historyErrors(historyId).queryKey,
    queryFn: () => ingestionApi.getHistoryErrors(historyId),
    ...queryOptions,
  });
};

// ===== 변경 =====

export const useCreateIngestMapping = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<IngestMapping | undefined, Error, IngestMappingSaveDatas> } = {}) =>
  useMutation({
    mutationFn: (datas: IngestMappingSaveDatas) => ingestionApi.createMapping(datas),
    ...mutationOptions,
  });

export const useUpdateIngestMapping = ({
  mutationOptions,
}: {
  mutationOptions?: UseMutationOptions<IngestMapping | undefined, Error, { mappingId: number; datas: IngestMappingSaveDatas }>;
} = {}) =>
  useMutation({
    mutationFn: ({ mappingId, datas }: { mappingId: number; datas: IngestMappingSaveDatas }) => ingestionApi.updateMapping(mappingId, datas),
    ...mutationOptions,
  });

export const useDeleteIngestMapping = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<void, Error, number> } = {}) =>
  useMutation({
    mutationFn: (mappingId: number) => ingestionApi.deleteMapping(mappingId),
    ...mutationOptions,
  });

export const useRunIngestion = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<IngestHistory | undefined, Error, { mappingId: number; file: File }> } = {}) =>
  useMutation({
    mutationFn: ({ mappingId, file }: { mappingId: number; file: File }) => ingestionApi.runIngestion({ mappingId, file }),
    ...mutationOptions,
  });
