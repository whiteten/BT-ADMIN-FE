import { useEffect } from 'react';
import { LOG } from '@/log';
import type { PageMapping } from '@/shared-api';
import { type PageMappingsMap, usePageMappingsStore } from '@/shared-store';
import { useGetPageMappings } from '../../common/hooks/usePageMappingQueries';

const Log = new LOG('usePageMappingsLoader');

const toMappingsMap = (mappings: PageMapping[]): PageMappingsMap =>
  mappings.reduce<PageMappingsMap>((acc, item) => {
    if (!acc[item.appId]) acc[item.appId] = {};
    acc[item.appId][item.path] = item.componentKey;
    return acc;
  }, {});

/**
 * 화면 지정 데이터를 React Query로 가져와 zustand store(usePageMappingsStore)에 mirror한다.
 * - DynamicElement는 store만 lookup하므로 부팅 시 한 번 적재가 필요
 * - 동일 query key를 manager 관리 화면에서도 재사용 → 네트워크 호출은 한 번
 * - 백엔드 API가 미구현 상태에서는 mock으로 fallback
 */
export function usePageMappingsLoader() {
  const setMappings = usePageMappingsStore((s) => s.setMappings);
  const setIsLoaded = usePageMappingsStore((s) => s.setIsLoaded);
  const { data, error } = useGetPageMappings();

  useEffect(() => {
    if (error) {
      Log.warn('Failed to load page mappings, falling back to mock:', error);
      import('../../common/mocks/pageMappings.mock').then(({ mockPageMappings }) => {
        setMappings(toMappingsMap(mockPageMappings));
        setIsLoaded(true);
      });
      return;
    }
    if (data) {
      setMappings(toMappingsMap(data));
      setIsLoaded(true);
      Log.debug('Page mappings loaded:', data);
    }
  }, [data, error, setMappings, setIsLoaded]);
}
