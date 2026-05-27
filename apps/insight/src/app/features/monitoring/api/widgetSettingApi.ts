import ApiClient, { type ApiResponse } from '@/shared-util';

const apiClient = new ApiClient({ serviceURL: '/bff' });

// ─── 미디어 타입 (TB_IC_MEDIA_USAGE) ─────────────────────────────

export interface MediaTypeItem {
  mediaType: number; // 0, 10, 20
  mediaAlias: string; // VOIP, CHAT, VIDEO_VOICE
}

// ─── 사용자별 위젯 설정 (D55) ─────────────────────────────────────

/** WS SUBSCRIBE options 에 머지될 임의 키/값 맵. */
export type WidgetUserSettings = Record<string, unknown>;

export interface WidgetUserSettingDetail {
  widgetId: number;
  userId: string;
  settings: WidgetUserSettings;
}

// ─── API ─────────────────────────────────────────────────────────

export const widgetSettingApi = {
  /** 미디어 타입 목록 — 시스템 전역 lookup. */
  getMediaTypes: async (): Promise<MediaTypeItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: MediaTypeItem[] }>>('/media-type-list');
    return response.data?.data?.items ?? [];
  },

  /** 본인 설정 조회 (저장 안 된 경우 settings = {}). */
  getUserSetting: async (widgetId: number): Promise<WidgetUserSettingDetail> => {
    const response = await apiClient.get<ApiResponse<WidgetUserSettingDetail>>('/widget-user-setting-get', {
      params: { widgetId },
    });
    return response.data?.data;
  },

  /** 본인 설정 upsert. */
  updateUserSetting: async (widgetId: number, settings: WidgetUserSettings): Promise<WidgetUserSettingDetail> => {
    const response = await apiClient.put<ApiResponse<WidgetUserSettingDetail>>('/widget-user-setting-update', { settings }, { params: { widgetId } });
    return response.data?.data;
  },
};
