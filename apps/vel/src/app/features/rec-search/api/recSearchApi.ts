import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import ApiClient from '@/shared-util';
import type { CustInfoField, MarkCode, RecFileListItem, RecFilePagedResult, RecMarkingRequest, RecSearchParams, RecUpdateInfoRequest } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const recSearchApi = {
  getRecordings: async (params: RecSearchParams): Promise<RecFilePagedResult> => {
    const response = await apiClient.get<{ data: RecFilePagedResult }>('/vel-rec-list', { params });
    return (response as { data: { data: RecFilePagedResult } }).data.data;
  },

  getRecording: async (params: { recKey: string }): Promise<RecFileListItem> => {
    const response = await apiClient.get<{ data: RecFileListItem }>('/vel-rec-detail', { params });
    return (response as { data: { data: RecFileListItem } }).data.data;
  },

  updateRecordingInfo: async (recKey: string, data: RecUpdateInfoRequest): Promise<void> => {
    await apiClient.put(`/vel-rec-update-info`, data, { params: { recKey } });
  },

  updateMarking: async (recKey: string, data: RecMarkingRequest): Promise<void> => {
    await apiClient.put(`/vel-rec-marking`, data, { params: { recKey } });
  },

  /**
   * 파일청취 로그 등록 (REALTIME_FLAG='0'). 플레이어가 녹취를 재생(트랙 로드)할 때 1회 호출.
   * 레거시(V4)가 재생 시점에 청취로그를 남기던 것과 동일. 실패해도 재생 자체는 막지 않는다.
   */
  insertListenLog: async (recKey: string): Promise<void> => {
    await apiClient.post('/vel-rec-listen-log', {}, { params: { recKey } });
  },

  getCustInfoFields: async (tenantId: string): Promise<CustInfoField[]> => {
    const response = await apiClient.get('/vel-custinfo-fields', { params: { tenantId } });
    const data = (response as { data: { data: CustInfoField[] | { value: CustInfoField[] } } }).data.data;
    return Array.isArray(data) ? data : ((data as { value: CustInfoField[] }).value ?? []);
  },

  getMarkCodes: async (tenantId: string): Promise<MarkCode[]> => {
    const response = await apiClient.get('/vel-markcode-list', { params: { tenantId } });
    const data = (response as { data: { data: MarkCode[] | { value: MarkCode[] } } }).data.data;
    return Array.isArray(data) ? data : ((data as { value: MarkCode[] }).value ?? []);
  },

  /**
   * 녹취 파일 다운로드. MFU 변환 실패 등은 502로 내려오며, 호출 측 catch에서 toast 처리한다.
   * (전역 에러 핸들러는 skipGlobalHandler로 우회 — blob 응답은 본문 파싱이 불가하므로 중복 토스트 방지)
   */
  downloadRecording: async (recKey: string): Promise<AxiosResponse<Blob>> => {
    return await apiClient.get<Blob>('/vel-rec-download', {
      params: { recKey },
      responseType: 'blob',
      skipGlobalHandler: true,
    } as AxiosRequestConfig & { skipGlobalHandler: boolean });
  },
};
