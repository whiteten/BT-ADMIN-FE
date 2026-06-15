/**
 * 미디어타입 사용처 API 클라이언트.
 *
 * BFF Aggregation Flow 매핑 (시드: C:\bt-admin-ipron-work\ipron-media-type\seed.sql):
 *
 *  ipron-media-type-list     GET    목록
 *  ipron-media-type-meta     GET    IC_MEDIA_TYPE 콤보 메타
 *  ipron-media-type-detail   GET    상세
 *  ipron-media-type-create   POST   등록
 *  ipron-media-type-update   PUT    수정
 *  ipron-media-type-delete   DELETE 삭제
 *  ipron-media-type-delete-batch DELETE 일괄 삭제 (body: mediaTypes[] number[])
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { MediaTypeMetaOption, MediaTypeResponse, MediaTypeUpsertRequest } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const mediaTypeApi = {
  getMediaTypes: async (): Promise<MediaTypeResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: MediaTypeResponse[] }>>('/ipron-media-type-list');
    return res.data?.data?.value ?? [];
  },

  getMediaTypeMeta: async (): Promise<MediaTypeMetaOption[]> => {
    const res = await apiClient.get<ApiResponse<{ value: MediaTypeMetaOption[] }>>('/ipron-media-type-meta');
    return res.data?.data?.value ?? [];
  },

  getMediaTypeDetail: async (mediaType: number): Promise<MediaTypeResponse> => {
    const res = await apiClient.get<ApiResponse<MediaTypeResponse>>('/ipron-media-type-detail', { params: { mediaType } });
    return res.data?.data;
  },

  createMediaType: async (body: MediaTypeUpsertRequest): Promise<MediaTypeResponse> => {
    const res = await apiClient.post<ApiResponse<MediaTypeResponse>>('/ipron-media-type-create', body);
    return res.data?.data;
  },

  updateMediaType: async (mediaType: number, body: MediaTypeUpsertRequest): Promise<MediaTypeResponse> => {
    const res = await apiClient.put<ApiResponse<MediaTypeResponse>>('/ipron-media-type-update', body, { params: { mediaType } });
    return res.data?.data;
  },

  deleteMediaType: async (mediaType: number): Promise<void> => {
    await apiClient.delete('/ipron-media-type-delete', { params: { mediaType } });
  },

  /**
   * 미디어타입 일괄 삭제
   * @flow ipron-media-type-delete-batch (DELETE /api/ipron/media-types/delete-batch, body: { mediaTypes })
   */
  deleteMediaTypeBatch: async (mediaTypes: number[]): Promise<void> => {
    await apiClient.delete('/ipron-media-type-delete-batch', { data: { mediaTypes } });
  },
};
