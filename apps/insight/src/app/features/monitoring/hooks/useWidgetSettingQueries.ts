import { type UseMutationOptions, type UseQueryOptions, useMutation, useQueries, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import { type MediaTypeItem, type WidgetUserSettingDetail, type WidgetUserSettings, widgetSettingApi } from '../api/widgetSettingApi';

export const widgetSettingKeys = createQueryKeys('monitoring-widget-setting', {
  mediaTypes: () => ['media-types'],
  userSetting: (widgetId: number) => [widgetId],
});

// ─── 미디어 타입 ─────────────────────────────────────────────────

export const useGetMediaTypes = ({ queryOptions }: { queryOptions?: Omit<UseQueryOptions<MediaTypeItem[]>, 'queryKey' | 'queryFn'> } = {}) =>
  useQuery({
    ...widgetSettingKeys.mediaTypes(),
    queryFn: () => widgetSettingApi.getMediaTypes(),
    staleTime: 5 * 60 * 1000, // 5분 — 거의 변하지 않는 시스템 코드
    ...queryOptions,
  });

// ─── 사용자별 위젯 설정 ───────────────────────────────────────────

export const useGetWidgetUserSetting = ({
  params: { widgetId },
  queryOptions,
}: {
  params: { widgetId: number };
  queryOptions?: Omit<UseQueryOptions<WidgetUserSettingDetail>, 'queryKey' | 'queryFn'>;
}) =>
  useQuery({
    ...widgetSettingKeys.userSetting(widgetId),
    queryFn: () => widgetSettingApi.getUserSetting(widgetId),
    ...queryOptions,
  });

export const useUpdateWidgetUserSetting = ({
  mutationOptions,
}: {
  mutationOptions?: UseMutationOptions<WidgetUserSettingDetail, Error, { widgetId: number; settings: WidgetUserSettings }>;
} = {}) =>
  useMutation({
    mutationFn: ({ widgetId, settings }) => widgetSettingApi.updateUserSetting(widgetId, settings),
    ...mutationOptions,
  });

/**
 * 위젯 인스턴스 N개의 사용자 설정을 일괄 조회 — `useDashboardSocket` 의
 * widgetUserSettings prop 으로 그대로 사용 가능한 `{ [widgetId]: settings }` Map 반환.
 *
 * widgetId 가 변하면 자동으로 추가/취소된다. 개별 mutation 후 invalidateQueries
 * 가 호출되면 본 hook 의 useQueries 결과도 즉시 최신화 → 다음 SUBSCRIBE 에 반영.
 */
export function useWidgetUserSettingsMap(widgetIds: number[]): Record<string, WidgetUserSettings> {
  return useQueries({
    queries: widgetIds.map((id) => ({
      ...widgetSettingKeys.userSetting(id),
      queryFn: () => widgetSettingApi.getUserSetting(id),
      staleTime: 30 * 1000,
    })),
    // combine 으로 결과를 즉시 Map 으로 변환 — React Query 가 입력 안정성을 보장.
    combine: (results) => {
      const map: Record<string, WidgetUserSettings> = {};
      results.forEach((r, i) => {
        const settings = r.data?.settings;
        if (settings && Object.keys(settings).length > 0) {
          map[String(widgetIds[i])] = settings;
        }
      });
      return map;
    },
  });
}
