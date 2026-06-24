import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  EvalGenerateRequest,
  KnowledgeChunkData,
  KnowledgeChunkItem,
  KnowledgeEvalCreateDatas,
  KnowledgeEvalExecution,
  KnowledgeEvalItem,
  KnowledgeEvalLLMGenerateResult,
  KnowledgeEvalResult,
  KnowledgeEvalUpdateDatas,
  KnowledgeFileItem,
  KnowledgeFileMeta,
  KnowledgeItem,
  KnowledgeListItem,
  KnowledgeMetadataItem,
  KnowledgeSearchChunk,
  KnowledgeSearchRecord,
  KnowledgeUpdateDatas,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const knowledgeApi = {
  getKnowledges: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiResponse<{ items: KnowledgeListItem[] }>>('/aoe-knowledge-list', { params });
    return response.data?.data?.items ?? [];
  },
  getKnowledge: async (params: { documentId: string }) => {
    const response = await apiClient.get<ApiResponse<KnowledgeItem>>('/aoe-knowledge-detail', { params });
    return response.data?.data;
  },
  previewKnowledge: async (data: { chunkSize: number; chunkOverlap: number; file: File }) => {
    const formData = new FormData();
    formData.append('chunkSize', String(data.chunkSize));
    formData.append('chunkOverlap', String(data.chunkOverlap));
    formData.append('file', data.file);
    const response = await apiClient.post<ApiResponse<{ items: KnowledgeChunkData[] }>>('/aoe-knowledge-preview', formData);
    return response.data?.data?.items ?? [];
  },
  updateKnowledge: async ({ params, data }: { params: { documentId: string }; data: KnowledgeUpdateDatas }) => {
    const response = await apiClient.put<ApiResponse<KnowledgeItem>>('/aoe-knowledge-update', data, { params });
    return response.data?.data;
  },
  getKnowledgeFiles: async (params: { documentId: string }) => {
    const response = await apiClient.get<ApiResponse<{ items: KnowledgeFileItem[] }>>('/aoe-knowledge-files', { params });
    return response.data?.data?.items ?? [];
  },
  addKnowledgeFile: async ({ params, files }: { params: { documentId: string }; files: File[] }) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    await apiClient.post('/aoe-knowledge-file-add', formData, { params });
  },
  deleteKnowledgeFiles: async ({ params, data }: { params: { documentId: string }; data: { fileIds: string[] } }) => {
    await apiClient.delete('/aoe-knowledge-file-delete', { params: { ...params, ...data } });
  },
  updateKnowledgeFileRole: async (data: { fileId: string; roleCode: number }) => {
    await apiClient.put('/aoe-knowledge-file-role', { roleCode: data.roleCode }, { params: { fileId: data.fileId } });
  },
  getKnowledgeMetadata: async (params: { documentId: string }) => {
    const response = await apiClient.get<ApiResponse<{ items: KnowledgeMetadataItem[] }>>('/aoe-knowledge-metadata', { params });
    return response.data?.data?.items ?? [];
  },
  addKnowledgeMetadata: async ({ params, data }: { params: { documentId: string }; data: { metaName: string; metaType: string } }) => {
    await apiClient.post('/aoe-knowledge-metadata-add', data, { params });
  },
  deleteKnowledgeMetadata: async (data: { documentId: string; metaId: string }) => {
    await apiClient.delete('/aoe-knowledge-metadata-delete', { params: data });
  },
  deleteKnowledge: async (documentId: string) => {
    await apiClient.delete('/aoe-knowledge-delete', { params: { documentId } });
  },
  searchKnowledge: async (data: { documentId: string; query: string }) => {
    const response = await apiClient.post<ApiResponse<{ items: KnowledgeSearchChunk[] }>>('/aoe-knowledge-search', data);
    return response.data?.data?.items ?? [];
  },
  getKnowledgeSearchRecords: async (params: { documentId: string }) => {
    const response = await apiClient.get<ApiResponse<{ items: KnowledgeSearchRecord[] }>>('/aoe-knowledge-search-records', { params });
    return response.data?.data?.items ?? [];
  },
  getKnowledgeEvals: async (params: { documentId: string }) => {
    const response = await apiClient.get<ApiResponse<{ items: KnowledgeEvalItem[] }>>('/aoe-knowledge-evals', { params });
    return response.data?.data?.items ?? [];
  },
  getKnowledgeEval: async (params: { documentId: string; evalId: string }) => {
    const response = await apiClient.get<ApiResponse<KnowledgeEvalItem>>('/aoe-knowledge-eval-detail', { params });
    return response.data?.data;
  },
  updateKnowledgeEval: async ({ params, data }: { params: { documentId: string; evalId: string }; data: KnowledgeEvalUpdateDatas }) => {
    await apiClient.put('/aoe-knowledge-eval-update', data, { params });
  },
  deleteKnowledgeEval: async (data: { documentId: string; evalId: string }) => {
    await apiClient.delete('/aoe-knowledge-eval-delete', { params: data });
  },
  deleteKnowledgeEvalResult: async (data: { documentId: string; evalId: string; resultId: string }) => {
    await apiClient.delete('/aoe-knowledge-eval-result-delete', { params: data });
  },
  runKnowledgeEval: async ({ params, data }: { params: { documentId: string; evalId: string }; data: { metrics: string[] } }) => {
    await apiClient.post('/aoe-knowledge-eval-run', data, { params });
  },
  getKnowledgeEvalHistory: async (params: { documentId: string; evalId: string }) => {
    const response = await apiClient.get<ApiResponse<{ items: KnowledgeEvalExecution[] }>>('/aoe-knowledge-eval-history-list', { params });
    return response.data?.data?.items ?? [];
  },
  getKnowledgeEvalResult: async (params: { documentId: string; evalId: string; resultId: string }) => {
    const response = await apiClient.get<ApiResponse<KnowledgeEvalResult>>('/aoe-knowledge-eval-result', { params });
    return response.data?.data;
  },
  getKnowledgeChunks: async (params: { fileId: string }) => {
    const response = await apiClient.get<ApiResponse<{ items: KnowledgeChunkItem[] }>>('/aoe-knowledge-chunks', { params });
    return response.data?.data?.items ?? [];
  },
  updateKnowledgeChunk: async (data: { fileChunkId: string; chunk: string }) => {
    await apiClient.put('/aoe-knowledge-chunk-update', data);
  },
  getKnowledgeFileMeta: async (params: { fileId: string }) => {
    // BFF 응답이 배열/{items}/{list} 중 어느 형태로 와도 배열로 정규화
    const response = await apiClient.get<ApiResponse<KnowledgeFileMeta[] | { items?: KnowledgeFileMeta[]; list?: KnowledgeFileMeta[] }>>('/aoe-knowledge-file-metadata', {
      params,
    });
    const data = response.data?.data;
    if (Array.isArray(data)) return data;
    return data?.items ?? data?.list ?? [];
  },
  upsertKnowledgeFileMeta: async (data: { fileId: string; metaId: string; metaValue: string }) => {
    await apiClient.put('/aoe-knowledge-file-metadata-upsert', data);
  },
  deleteKnowledgeFileMeta: async (params: { fileMetaId: string }) => {
    await apiClient.delete('/aoe-knowledge-file-metadata-delete', { params });
  },
  createKnowledgeEval: async ({ params, data }: { params: { documentId: string }; data: KnowledgeEvalCreateDatas }) => {
    await apiClient.post('/aoe-knowledge-eval-create', data, { params });
  },
  generateKnowledgeEvalLLM: async ({ params, data }: EvalGenerateRequest) => {
    const response = await apiClient.post<ApiResponse<{ items: { chunkId: string; index: number; question: string; answer: string }[] }>>('/aoe-knowledge-eval-generate', data, {
      params,
    });
    const items = response.data?.data?.items ?? [];
    const grouped = new Map<string, { question: string; answer: string }[]>();
    for (const item of items.sort((a, b) => a.index - b.index)) {
      if (!grouped.has(item.chunkId)) grouped.set(item.chunkId, []);
      const entry = grouped.get(item.chunkId);
      if (entry) entry.push({ question: item.question, answer: item.answer });
    }
    return Array.from(grouped.entries()).map(([chunkId, questions]) => ({ chunkId, questions })) as KnowledgeEvalLLMGenerateResult[];
  },
  processKnowledge: async (data: {
    documentName: string;
    description?: string;
    chunkSize: number;
    chunkOverlap: number;
    topK: number;
    enableHybridSearch: string;
    denseWeight?: number;
    bm25Weight?: number;
    files: File[];
  }) => {
    const formData = new FormData();
    formData.append('documentName', data.documentName);
    if (data.description) formData.append('description', data.description);
    formData.append('chunkSize', String(data.chunkSize));
    formData.append('chunkOverlap', String(data.chunkOverlap));
    formData.append('topK', String(data.topK));
    formData.append('enableHybridSearch', data.enableHybridSearch);
    if (data.denseWeight !== undefined) formData.append('denseWeight', String(data.denseWeight));
    if (data.bm25Weight !== undefined) formData.append('bm25Weight', String(data.bm25Weight));
    data.files.forEach((file) => formData.append('files', file));
    const response = await apiClient.post<ApiResponse<KnowledgeItem>>('/aoe-knowledge-process', formData);
    return response.data?.data;
  },
};
