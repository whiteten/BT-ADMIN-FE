import ApiClient, { type ApiResponse } from '@/shared-util';
import type { MonConfigItem, MonConfigSaveItem } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * 모니터링 글로벌 설정 API — 범용 category/key/value (통계 stat-config 동형).
 * 설정 화면의 각 탭이 카테고리로 구분되어 사용한다.
 */
export const monConfigApi = {
  /** 카테고리 목록 조회 (미지정 시 전체). */
  getConfigs: async (category?: string): Promise<MonConfigItem[]> => {
    const response = await apiClient.get<ApiResponse<{ items: MonConfigItem[] }>>('/insight-monitoring-config-list', {
      params: category ? { category } : undefined,
    });
    return response.data?.data?.items ?? [];
  },

  /** 카테고리 단위 일괄 저장(교체) — 요청에 없는 키는 삭제. */
  replaceCategory: async (category: string, items: MonConfigSaveItem[]): Promise<MonConfigItem[]> => {
    const response = await apiClient.put<ApiResponse<{ items: MonConfigItem[] }>>('/insight-monitoring-config-replace', { items }, { params: { category } });
    return response.data?.data?.items ?? [];
  },
};
