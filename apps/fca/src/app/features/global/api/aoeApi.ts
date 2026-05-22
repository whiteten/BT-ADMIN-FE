import ApiClient, { type ApiResponse } from '@/shared-util';
import type { ExcelImportResult } from '../../bot-config/types/intent';
import type { AoeBasicCreateDatas, AoeBasicDetailItem, FaqAgentListItem, FaqCreateDatas, FaqDetailItem, FaqListItem, FaqUpdateDatas } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * AOE 확장 API
 */
export const aoeApi = {
  // AOE 확장 기본 정보 조회
  getAoeBasicDetail: async (params?: Record<string, unknown>): Promise<AoeBasicDetailItem> => {
    const response = await apiClient.get<ApiResponse<AoeBasicDetailItem>>('/basic-aoe-detail', { params });
    return response.data?.data;
  },
  // AOE 확장 기본 정보 생성 (upsert)
  createAoeBasic: async (data: AoeBasicCreateDatas) => {
    const response = await apiClient.post('/basic-aoe-create', data);
    return response;
  },
  // FAQ Agent 목록 조회
  getFaqAgentList: async (params?: Record<string, unknown>): Promise<FaqAgentListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: FaqAgentListItem[] }>>('/faq-agent-list', { params });
    return response.data?.data?.items ?? [];
  },
  // FAQ 목록 조회
  getFaqList: async (params?: Record<string, unknown>): Promise<FaqListItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: FaqListItem[] }>>('/faq-list', { params });
    return response.data?.data?.items ?? [];
  },
  // FAQ 상세 조회
  getFaqDetail: async (params?: Record<string, unknown>): Promise<FaqDetailItem> => {
    const response = await apiClient.get<ApiResponse<FaqDetailItem>>('/faq-detail', { params });
    return response.data?.data;
  },
  // FAQ 생성
  createFaq: async ({ params, data }: { params: Record<string, unknown>; data: FaqCreateDatas }) => {
    const response = await apiClient.post('/faq-create', data, { params });
    return response;
  },
  // FAQ 수정
  updateFaq: async ({ params, data }: { params: Record<string, unknown>; data: FaqUpdateDatas }) => {
    const response = await apiClient.put('/faq-update', data, { params });
    return response;
  },
  // FAQ 삭제
  deleteFaq: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/faq-delete', { params });
    return response;
  },
  // FAQ 적용
  applyFaq: async (params: Record<string, unknown>) => {
    const response = await apiClient.post('/faq-apply', {}, { params });
    return response;
  },
  // FAQ Export
  exportFaq: async (params: Record<string, unknown>) => {
    const response = await apiClient.get<Blob>('/faq-excel-export', { params, responseType: 'blob' });
    return response;
  },
  // FAQ Import
  importFaq: async ({ params, data }: { params: Record<string, unknown>; data: File }) => {
    const formData = new FormData();
    formData.append('uploadFile', data);
    const response = await apiClient.post<ApiResponse<ExcelImportResult>>('/faq-excel-import', formData, { params });
    return response.data?.data;
  },
};
