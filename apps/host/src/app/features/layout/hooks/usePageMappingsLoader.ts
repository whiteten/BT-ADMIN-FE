import { useCallback } from 'react';
import { LOG } from '@/log';
import { type PageMapping, sharedApi } from '@/shared-api';
import { type PageMappingsMap, usePageMappingsStore } from '@/shared-store';

const Log = new LOG('usePageMappingsLoader');

const toMappingsMap = (mappings: PageMapping[]): PageMappingsMap =>
  mappings.reduce<PageMappingsMap>((acc, item) => {
    if (!acc[item.appId]) acc[item.appId] = {};
    acc[item.appId][item.path] = item.componentKey;
    return acc;
  }, {});

export function usePageMappingsLoader() {
  const { setMappings, setIsLoaded } = usePageMappingsStore();
  const load = useCallback(async () => {
    try {
      const mappings = await sharedApi.pageMapping.getPageMappings();
      setMappings(toMappingsMap(mappings));
      Log.debug('Page mappings loaded:', mappings);
    } catch (err) {
      Log.warn('Failed to load page mappings, falling back to mock:', err);
      const { mockPageMappings } = await import('../../common/mocks/pageMappings.mock');
      setMappings(toMappingsMap(mockPageMappings));
    } finally {
      setIsLoaded(true);
    }
  }, [setMappings, setIsLoaded]);

  return { load };
}
