import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { KnowledgeChunkData, KnowledgeItem, KnowledgeListItem } from '../types';

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
    const response = await apiClient.post<DetailResponse<KnowledgeChunkData[]>>('/aoe-knowledge-preview', formData);
    return extractDetail(response);
  },
};
