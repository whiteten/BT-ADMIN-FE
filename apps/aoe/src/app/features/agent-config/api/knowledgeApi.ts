import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type {
  EvalGenerateRequest,
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

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const knowledgeApi = {
  getKnowledges: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ListResponse<KnowledgeListItem>>('/aoe-knowledge-list', { params });
    return extractList(response);
  },
  getKnowledge: async (params: { documentId: string }) => {
    const response = await apiClient.get<DetailResponse<KnowledgeItem>>('/aoe-knowledge-detail', { params });
    return extractDetail(response);
  },
  previewKnowledge: async (data: { chunkSize: number; chunkOverlap: number; file: File }) => {
    const formData = new FormData();
    formData.append('chunkSize', String(data.chunkSize));
    formData.append('chunkOverlap', String(data.chunkOverlap));
    formData.append('file', data.file);
    const response = await apiClient.post<ListResponse<KnowledgeChunkData>>('/aoe-knowledge-preview', formData);
    return extractList(response);
  },
  updateKnowledge: async ({ params, data }: { params: { documentId: string }; data: KnowledgeUpdateDatas }) => {
    const response = await apiClient.put<DetailResponse<KnowledgeItem>>('/aoe-knowledge-update', data, { params });
    return extractDetail(response);
  },
  getKnowledgeFiles: async (params: { documentId: string }) => {
    const response = await apiClient.get<ListResponse<KnowledgeFileItem>>('/aoe-knowledge-files', { params });
    return extractList(response);
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
    const response = await apiClient.get<ListResponse<KnowledgeMetadataItem>>('/aoe-knowledge-metadata', { params });
    return extractList(response);
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
    const response = await apiClient.post<ListResponse<KnowledgeSearchChunk>>('/aoe-knowledge-search', data);
    return extractList(response);
  },
  getKnowledgeSearchRecords: async (params: { documentId: string }) => {
    const response = await apiClient.get<ListResponse<KnowledgeSearchRecord>>('/aoe-knowledge-search-records', { params });
    return extractList(response);
  },
  getKnowledgeEvals: async (params: { documentId: string }) => {
    const response = await apiClient.get<ListResponse<KnowledgeEvalItem>>('/aoe-knowledge-evals', { params });
    return extractList(response);
  },
  deleteKnowledgeEval: async (data: { documentId: string; evalId: string }) => {
    await apiClient.post('/aoe-knowledge-eval-delete', data);
  },
  runKnowledgeEval: async (data: { documentId: string; evalId: string; metrics: string[] }) => {
    await apiClient.post('/aoe-knowledge-eval-run', data);
  },
  getKnowledgeEvalHistory: async (params: { evalId: string }) => {
    const response = await apiClient.get<ListResponse<KnowledgeEvalExecution>>('/aoe-knowledge-eval-history', { params });
    return extractList(response);
  },
  getKnowledgeEvalResult: async (params: { resultId: string }) => {
    const response = await apiClient.get<DetailResponse<KnowledgeEvalResult>>('/aoe-knowledge-eval-result', { params });
    return extractDetail(response);
  },
  getKnowledgeChunks: async (params: { fileId: string }) => {
    const response = await apiClient.get<ListResponse<KnowledgeChunkItem>>('/aoe-knowledge-chunks', { params });
    return extractList(response);
  },
  createKnowledgeEval: async (data: KnowledgeEvalCreateDatas) => {
    await apiClient.post('/aoe-knowledge-eval-create', data);
  },
  generateKnowledgeEvalLLM: async (data: EvalGenerateRequest) => {
    const response = await apiClient.post<ListResponse<KnowledgeEvalLLMGenerateResult>>('/aoe-knowledge-eval-generate', data);
    return extractList(response);
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
    const response = await apiClient.post<DetailResponse<KnowledgeItem>>('/aoe-knowledge-process', formData);
    return extractDetail(response);
  },
};
