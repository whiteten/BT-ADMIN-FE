import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { knowledgeApi } from '../api/knowledgeApi';
import type { KnowledgeChunkData, KnowledgeItem, KnowledgeListItem } from '../types';

export const knowledgeQueryKeys = createQueryKeys('knowledges', {
  getKnowledges: (params?: Record<string, unknown>) => [params],
  getKnowledge: (params?: Record<string, unknown>) => [params],
});

export const useGetKnowledges = ({ params, queryOptions }: QueryHookWithParamsOptions<KnowledgeListItem[]> = {}) => {
  return useQuery({
    queryKey: knowledgeQueryKeys.getKnowledges(params).queryKey,
    queryFn: () => knowledgeApi.getKnowledges(params),
    ...queryOptions,
  });
};

export const useGetKnowledge = ({ params, queryOptions }: QueryHookWithParamsOptions<KnowledgeItem> = {}) => {
  return useQuery({
    queryKey: knowledgeQueryKeys.getKnowledge(params).queryKey,
    queryFn: () => knowledgeApi.getKnowledge(params as { documentId: string }),
    enabled: !!params?.documentId,
    ...queryOptions,
  });
};

export const usePreviewKnowledge = ({ mutationOptions }: MutationHookOptions<KnowledgeChunkData[] | null, { chunkSize: number; chunkOverlap: number; file: File }> = {}) => {
  return useMutation({
    mutationFn: knowledgeApi.previewKnowledge,
    ...mutationOptions,
  });
};
