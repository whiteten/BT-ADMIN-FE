import { useEffect } from 'react';
import { LOG } from '@/log';
import type { PageVariant } from '@/shared-api';
import { type PageVariantsMap, usePageVariantsStore } from '@/shared-store';
import { useGetPageVariants } from '../../common/hooks/usePageVariantQueries';

const Log = new LOG('usePageVariantsLoader');

const toVariantsMap = (variants: PageVariant[]): PageVariantsMap =>
  variants.reduce<PageVariantsMap>((acc, item) => {
    if (!acc[item.appId]) acc[item.appId] = {};
    acc[item.appId][item.path] = item.componentKey;
    return acc;
  }, {});

/**
 * 화면 지정 데이터를 React Query로 가져와 zustand store(usePageVariantsStore)에 mirror한다.
 * - DynamicElement는 store만 lookup하므로 부팅 시 한 번 적재가 필요
 * - 동일 query key를 manager 관리 화면에서도 재사용 → 네트워크 호출은 한 번
 */
export function usePageVariantsLoader() {
  const setVariants = usePageVariantsStore((s) => s.setVariants);
  const setIsLoaded = usePageVariantsStore((s) => s.setIsLoaded);
  const { data, error } = useGetPageVariants();

  useEffect(() => {
    if (error) {
      Log.warn('Failed to load page variants:', error);
      setIsLoaded(true);
      return;
    }
    if (data) {
      setVariants(toVariantsMap(data));
      setIsLoaded(true);
      Log.debug('Page variants loaded:', data);
    }
  }, [data, error, setVariants, setIsLoaded]);
}
