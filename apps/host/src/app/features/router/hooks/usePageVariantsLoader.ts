import { useCallback } from 'react';
import { LOG } from '@/log';
import { type PageVariantManifestPath, type PageVariantsManifestMap, usePageVariantsStore } from '@/shared-store';
import type { PageVariantConfig } from '@/components/custom/DynamicElement';

const Log = new LOG('usePageVariantsLoader');

type PageVariantsModule = { pageVariants: Record<string, PageVariantConfig> };

const VARIANT_LOADERS: Record<string, () => Promise<PageVariantsModule>> = {
  manager: () => import('manager/PageVariants').catch(() => ({ pageVariants: {} })) as Promise<PageVariantsModule>,
  fca: () => import('fca/PageVariants').catch(() => ({ pageVariants: {} })) as Promise<PageVariantsModule>,
};

/**
 * 변형 정의에서 component 함수 참조를 버리고 picker UI용 메타만 추출한다.
 * host는 변형 컴포넌트를 직접 렌더하지 않으므로 함수 참조를 store에 보관할 필요 없음.
 */
const toManifestPaths = (pageVariants: Record<string, PageVariantConfig>): PageVariantManifestPath[] =>
  Object.values(pageVariants).map((entry) => ({
    appId: entry.appId,
    path: entry.path,
    defaultKey: entry.defaultKey,
    variants: Object.entries(entry.components).map(([key, value]) => ({
      key,
      label: value.label,
      ...(value.description ? { description: value.description } : {}),
    })),
  }));

const loadPageVariants = async (): Promise<PageVariantsManifestMap> => {
  const entries = await Promise.all(
    Object.entries(VARIANT_LOADERS).map(async ([name, loader]) => {
      const mod = await loader();
      return [name, toManifestPaths(mod.pageVariants)] as const;
    }),
  );
  return Object.fromEntries(entries);
};

export function usePageVariantsLoader() {
  const { setVariants, setIsLoaded } = usePageVariantsStore();
  const load = useCallback(async () => {
    try {
      const variants = await loadPageVariants();
      setVariants(variants);
      setIsLoaded(true);
      Log.debug('Page variants loaded:', variants);
    } catch (err) {
      Log.error('Failed to load page variants:', err);
      setVariants({});
      setIsLoaded(true);
    }
  }, [setVariants, setIsLoaded]);

  return { load };
}
