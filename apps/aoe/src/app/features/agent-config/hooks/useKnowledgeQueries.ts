import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { knowledgeApi } from '../api/knowledgeApi';
import type {
  KnowledgeChunkData,
  KnowledgeChunkItem,
  KnowledgeEvalCreateDatas,
  KnowledgeEvalExecution,
  KnowledgeEvalItem,
  KnowledgeEvalLLMGenerateResult,
  KnowledgeEvalResult,
  KnowledgeFileItem,
  KnowledgeItem,
  KnowledgeListItem,
  KnowledgeMetadataItem,
  KnowledgeSearchChunk,
  KnowledgeSearchRecord,
  KnowledgeUpdateDatas,
} from '../types';

export const knowledgeQueryKeys = createQueryKeys('knowledges', {
  getKnowledges: (params?: Record<string, unknown>) => [params],
  getKnowledge: (params?: Record<string, unknown>) => [params],
  getKnowledgeFiles: (params?: Record<string, unknown>) => [params],
  getKnowledgeChunks: (params?: Record<string, unknown>) => [params],
  getKnowledgeMetadata: (params?: Record<string, unknown>) => [params],
  getKnowledgeSearchRecords: (params?: Record<string, unknown>) => [params],
  getKnowledgeEvals: (params?: Record<string, unknown>) => [params],
  getKnowledgeEvalHistory: (params?: Record<string, unknown>) => [params],
  getKnowledgeEvalResult: (params?: Record<string, unknown>) => [params],
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

export const useGetKnowledgeFiles = ({ params, queryOptions }: QueryHookWithParamsOptions<KnowledgeFileItem[]> = {}) => {
  return useQuery({
    queryKey: knowledgeQueryKeys.getKnowledgeFiles(params).queryKey,
    queryFn: () => knowledgeApi.getKnowledgeFiles(params as { documentId: string }),
    enabled: !!params?.documentId,
    ...queryOptions,
  });
};

export const usePreviewKnowledge = ({ mutationOptions }: MutationHookOptions<KnowledgeChunkData[], { chunkSize: number; chunkOverlap: number; file: File }> = {}) => {
  return useMutation({
    mutationFn: knowledgeApi.previewKnowledge,
    ...mutationOptions,
  });
};

export const useUpdateKnowledge = ({ mutationOptions }: MutationHookOptions<KnowledgeItem | null, { params: { documentId: string }; data: KnowledgeUpdateDatas }> = {}) => {
  return useMutation({
    mutationFn: knowledgeApi.updateKnowledge,
    ...mutationOptions,
  });
};

export const useDeleteKnowledge = ({ mutationOptions }: MutationHookOptions<void, string> = {}) => {
  return useMutation({
    mutationFn: knowledgeApi.deleteKnowledge,
    ...mutationOptions,
  });
};

export const useGetKnowledgeMetadata = ({ params, queryOptions }: QueryHookWithParamsOptions<KnowledgeMetadataItem[]> = {}) => {
  return useQuery({
    queryKey: knowledgeQueryKeys.getKnowledgeMetadata(params).queryKey,
    queryFn: () => knowledgeApi.getKnowledgeMetadata(params as { documentId: string }),
    enabled: !!params?.documentId,
    ...queryOptions,
  });
};

export const useAddKnowledgeFile = ({ mutationOptions }: MutationHookOptions<void, { params: { documentId: string }; files: File[] }> = {}) => {
  return useMutation({
    mutationFn: knowledgeApi.addKnowledgeFile,
    ...mutationOptions,
  });
};

export const useDeleteKnowledgeFiles = ({ mutationOptions }: MutationHookOptions<void, { params: { documentId: string }; data: { fileIds: string[] } }> = {}) => {
  return useMutation({
    mutationFn: knowledgeApi.deleteKnowledgeFiles,
    ...mutationOptions,
  });
};

export const useUpdateKnowledgeFileRole = ({ mutationOptions }: MutationHookOptions<void, { fileId: string; roleCode: number }> = {}) => {
  return useMutation({
    mutationFn: knowledgeApi.updateKnowledgeFileRole,
    ...mutationOptions,
  });
};

export const useAddKnowledgeMetadata = ({ mutationOptions }: MutationHookOptions<void, { params: { documentId: string }; data: { metaName: string; metaType: string } }> = {}) => {
  return useMutation({
    mutationFn: knowledgeApi.addKnowledgeMetadata,
    ...mutationOptions,
  });
};

export const useDeleteKnowledgeMetadata = ({ mutationOptions }: MutationHookOptions<void, { documentId: string; metaId: string }> = {}) => {
  return useMutation({
    mutationFn: knowledgeApi.deleteKnowledgeMetadata,
    ...mutationOptions,
  });
};

export const useGetKnowledgeSearchRecords = ({ params, queryOptions }: QueryHookWithParamsOptions<KnowledgeSearchRecord[]> = {}) => {
  return useQuery({
    queryKey: knowledgeQueryKeys.getKnowledgeSearchRecords(params).queryKey,
    queryFn: () => knowledgeApi.getKnowledgeSearchRecords(params as { documentId: string }),
    enabled: !!params?.documentId,
    ...queryOptions,
  });
};

export const useSearchKnowledge = ({ mutationOptions }: MutationHookOptions<KnowledgeSearchChunk[], { documentId: string; query: string }> = {}) => {
  return useMutation({
    mutationFn: knowledgeApi.searchKnowledge,
    ...mutationOptions,
  });
};

export const useGetKnowledgeEvals = ({ params, queryOptions }: QueryHookWithParamsOptions<KnowledgeEvalItem[]> = {}) => {
  return useQuery({
    queryKey: knowledgeQueryKeys.getKnowledgeEvals(params).queryKey,
    queryFn: () => knowledgeApi.getKnowledgeEvals(params as { documentId: string }),
    enabled: !!params?.documentId,
    ...queryOptions,
  });
};

export const useDeleteKnowledgeEval = ({ mutationOptions }: MutationHookOptions<void, { documentId: string; evalId: string }> = {}) => {
  return useMutation({
    mutationFn: knowledgeApi.deleteKnowledgeEval,
    ...mutationOptions,
  });
};

export const useRunKnowledgeEval = ({ mutationOptions }: MutationHookOptions<void, { documentId: string; evalId: string; metrics: string[] }> = {}) => {
  return useMutation({
    mutationFn: knowledgeApi.runKnowledgeEval,
    ...mutationOptions,
  });
};

export const useGetKnowledgeEvalHistory = ({ params, queryOptions }: QueryHookWithParamsOptions<KnowledgeEvalExecution[]> = {}) => {
  return useQuery({
    queryKey: knowledgeQueryKeys.getKnowledgeEvalHistory(params).queryKey,
    queryFn: () => knowledgeApi.getKnowledgeEvalHistory(params as { evalId: string }),
    enabled: !!params?.evalId,
    ...queryOptions,
  });
};

export const useGetKnowledgeEvalResult = ({ params, queryOptions }: QueryHookWithParamsOptions<KnowledgeEvalResult> = {}) => {
  return useQuery({
    queryKey: knowledgeQueryKeys.getKnowledgeEvalResult(params).queryKey,
    queryFn: () => knowledgeApi.getKnowledgeEvalResult(params as { resultId: string }),
    enabled: !!params?.resultId,
    ...queryOptions,
  });
};

export const useGetKnowledgeChunks = ({ params, queryOptions }: QueryHookWithParamsOptions<KnowledgeChunkItem[]> = {}) => {
  return useQuery({
    queryKey: knowledgeQueryKeys.getKnowledgeChunks(params).queryKey,
    queryFn: () => knowledgeApi.getKnowledgeChunks(params as { fileId: string }),
    enabled: !!params?.fileId,
    ...queryOptions,
  });
};

export const useCreateKnowledgeEval = ({ mutationOptions }: MutationHookOptions<void, KnowledgeEvalCreateDatas> = {}) => {
  return useMutation({
    mutationFn: knowledgeApi.createKnowledgeEval,
    ...mutationOptions,
  });
};

export const useGenerateKnowledgeEvalLLM = ({
  mutationOptions,
}: MutationHookOptions<KnowledgeEvalLLMGenerateResult[], { documentId: string; chunkIds: string[]; chunkCount: number; difficultyLvl: string }> = {}) => {
  return useMutation({
    mutationFn: knowledgeApi.generateKnowledgeEvalLLM,
    ...mutationOptions,
  });
};

export const useProcessKnowledge = ({
  mutationOptions,
}: MutationHookOptions<
  KnowledgeItem | null,
  {
    documentName: string;
    chunkSize: number;
    chunkOverlap: number;
    topK: number;
    enableHybridSearch: string;
    denseWeight?: number;
    bm25Weight?: number;
    files: File[];
  }
> = {}) => {
  return useMutation({
    mutationFn: knowledgeApi.processKnowledge,
    ...mutationOptions,
  });
};
