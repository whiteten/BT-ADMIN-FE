import ApiClient from '@/shared-util';
import type {
  BotBasicInfoUpdateDatas,
  BotCreateDatas,
  BotItem,
  BotListItem,
  BotScheduleUpdateDatas,
  BotVersionCreateDatas,
  BotVersionItem,
  BotVersionListItem,
  BotVersionUpdateDatas,
  BotVoiceUpdateDatas,
  SttListItem,
  TtsListItem,
  WorkTimeListItem,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });
interface BotListResponse {
  data: { list: { data: { items: BotListItem[] } } };
}

interface BotDetailResponse {
  data: { detail: { data: BotItem } };
}

interface BotVersionListResponse {
  data: { list: { data: BotVersionListItem[] } };
}

interface BotVersionDetailResponse {
  data: { detail: { data: BotVersionItem } };
}

interface SttListResponse {
  data: { list: { data: { items: SttListItem[] } } };
}

interface TtsListResponse {
  data: { list: { data: { items: TtsListItem[] } } };
}

interface WorkTimeListResponse {
  data: { list: { data: { items: WorkTimeListItem[] } } };
}

export const botApi = {
  getBots: async (params?: Record<string, unknown>): Promise<BotListItem[]> => {
    const response = await apiClient.get<BotListResponse>('/bot-list', { params });
    return response?.data?.data?.list?.data?.items ?? [];
  },
  getBot: async (params?: Record<string, unknown>): Promise<BotItem> => {
    const response = await apiClient.get<BotDetailResponse>(`/bot-detail`, { params });
    return response?.data?.data?.detail?.data;
  },
  createBot: async (data: BotCreateDatas) => {
    const response = await apiClient.post('/bot-create', data);
    return response?.data;
  },
  updateBot: async ({ params, data }: { params: Record<string, unknown>; data: BotBasicInfoUpdateDatas }) => {
    const response = await apiClient.put('/bot-update', data, { params });
    return response?.data;
  },
  deleteBot: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete(`/bot-delete`, { params });
    return response?.data;
  },
  updateBotVoice: async ({ params, data }: { params: Record<string, unknown>; data: BotVoiceUpdateDatas }) => {
    const response = await apiClient.put('/bot-stt-tts-update', data, { params });
    return response?.data;
  },
  updateBotSchedule: async ({ params, data }: { params: Record<string, unknown>; data: BotScheduleUpdateDatas }) => {
    const response = await apiClient.put('/bot-schedule-update', data, { params });
    return response?.data;
  },
  getBotVersions: async (params?: Record<string, unknown>): Promise<BotVersionListItem[]> => {
    const response = await apiClient.get<BotVersionListResponse>('/bot-version-list', { params });
    return response?.data?.data?.list?.data ?? [];
  },
  getBotVersion: async (params?: Record<string, unknown>): Promise<BotVersionItem> => {
    const response = await apiClient.get<BotVersionDetailResponse>('/bot-version-detail', { params });
    return response?.data?.data?.detail?.data;
  },
  createBotVersion: async ({ params, data }: { params: Record<string, unknown>; data: BotVersionCreateDatas }) => {
    const response = await apiClient.post('/bot-version-create', data, { params });
    return response?.data;
  },
  updateBotVersion: async ({ params, data }: { params: Record<string, unknown>; data: BotVersionUpdateDatas }) => {
    const response = await apiClient.put('/bot-version-update', data, { params });
    return response?.data;
  },
  deleteBotVersion: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/bot-version-delete', { params });
    return response?.data;
  },
  getSttList: async (params?: Record<string, unknown>): Promise<SttListItem[]> => {
    const response = await apiClient.get<SttListResponse>('/stt-list', { params });
    return response?.data?.data?.list?.data?.items ?? [];
  },
  getTtsList: async (params?: Record<string, unknown>): Promise<TtsListItem[]> => {
    const response = await apiClient.get<TtsListResponse>('/tts-list', { params });
    return response?.data?.data?.list?.data?.items ?? [];
  },
  getWorkTimeList: async (params?: Record<string, unknown>): Promise<WorkTimeListItem[]> => {
    const response = await apiClient.get<WorkTimeListResponse>('/worktime-list', { params });
    return response?.data?.data?.list?.data?.items ?? [];
  },
};
