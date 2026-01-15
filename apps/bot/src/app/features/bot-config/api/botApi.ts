import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type {
  BotAoeDetailItem,
  BotAoeUpdateDatas,
  BotBasicInfoUpdateDatas,
  BotCreateDatas,
  BotDeployConfigCreateDatas,
  BotDeployConfigItem,
  BotItem,
  BotListItem,
  BotScheduleUpdateDatas,
  BotVersionCreateDatas,
  BotVersionItem,
  BotVersionListItem,
  BotVersionUpdateDatas,
  BotVoiceUpdateDatas,
  IfeInfo,
  SttListItem,
  TtsListItem,
  WorkTimeListItem,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const botApi = {
  getBots: async (params?: Record<string, unknown>): Promise<BotListItem[]> => {
    const response = await apiClient.get<ListResponse<BotListItem>>('/bot-list', { params });
    return extractList(response);
  },
  getBot: async (params?: Record<string, unknown>): Promise<BotItem> => {
    const response = await apiClient.get<DetailResponse<BotItem>>('/bot-detail', { params });
    return extractDetail(response);
  },
  createBot: async (data: BotCreateDatas) => {
    const response = await apiClient.post('/bot-create', data);
    return response;
  },
  updateBot: async ({ params, data }: { params: Record<string, unknown>; data: BotBasicInfoUpdateDatas }) => {
    const response = await apiClient.put('/bot-update', data, { params });
    return response;
  },
  deleteBot: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/bot-delete', { params });
    return response;
  },
  updateBotVoice: async ({ params, data }: { params: Record<string, unknown>; data: BotVoiceUpdateDatas }) => {
    const response = await apiClient.put('/bot-stt-tts-update', data, { params });
    return response;
  },
  updateBotSchedule: async ({ params, data }: { params: Record<string, unknown>; data: BotScheduleUpdateDatas }) => {
    const response = await apiClient.put('/bot-schedule-update', data, { params });
    return response;
  },
  getBotVersions: async (params?: Record<string, unknown>): Promise<BotVersionListItem[]> => {
    const response = await apiClient.get<ListResponse<BotVersionListItem>>('/bot-version-list', { params });
    return extractList(response);
  },
  getBotVersion: async (params?: Record<string, unknown>): Promise<BotVersionItem> => {
    const response = await apiClient.get<DetailResponse<BotVersionItem>>('/bot-version-detail', { params });
    return extractDetail(response);
  },
  createBotVersion: async ({ params, data }: { params: Record<string, unknown>; data: BotVersionCreateDatas }) => {
    const response = await apiClient.post('/bot-version-create', data, { params });
    return response;
  },
  updateBotVersion: async ({ params, data }: { params: Record<string, unknown>; data: BotVersionUpdateDatas }) => {
    const response = await apiClient.put('/bot-version-update', data, { params });
    return response;
  },
  deleteBotVersion: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/bot-version-delete', { params });
    return response;
  },
  publishBotVersion: async ({ params, data }: { params: Record<string, unknown>; data: Record<string, unknown> }) => {
    const response = await apiClient.post('/bot-version-publish', data, { params });
    return response;
  },
  getIfeInfo: async ({ params, data }: { params: Record<string, unknown>; data: Record<string, unknown> }): Promise<IfeInfo> => {
    const response = await apiClient.post<DetailResponse<IfeInfo>>('/bot-version-webfloweditor', data, { params });
    return extractDetail(response);
  },
  getSttList: async (params?: Record<string, unknown>): Promise<SttListItem[]> => {
    const response = await apiClient.get<ListResponse<SttListItem>>('/stt-list', { params });
    return extractList(response);
  },
  getTtsList: async (params?: Record<string, unknown>): Promise<TtsListItem[]> => {
    const response = await apiClient.get<ListResponse<TtsListItem>>('/tts-list', { params });
    return extractList(response);
  },
  getWorkTimeList: async (params?: Record<string, unknown>): Promise<WorkTimeListItem[]> => {
    const response = await apiClient.get<ListResponse<WorkTimeListItem>>('/worktime-list', { params });
    return extractList(response);
  },
  getBotDeployConfig: async (params?: Record<string, unknown>): Promise<BotDeployConfigItem[]> => {
    const response = await apiClient.get<ListResponse<BotDeployConfigItem>>('/bot-deploy-config', { params });
    return extractList(response);
  },
  // delete -> insert
  saveBotDeployConfig: async ({ params, data }: { params: Record<string, unknown>; data: BotDeployConfigCreateDatas }) => {
    const response = await apiClient.post('/bot-deploy-config-save', data, { params });
    return response;
  },
  getBotAoeDetail: async (params?: Record<string, unknown>): Promise<BotAoeDetailItem> => {
    const response = await apiClient.get<DetailResponse<BotAoeDetailItem>>('/bot-aoe-detail', { params });
    return extractDetail(response);
  },
  updateBotAoe: async ({ params, data }: { params: Record<string, unknown>; data: BotAoeUpdateDatas }) => {
    const response = await apiClient.put('/bot-aoe-update', data, { params });
    return response;
  },
};
