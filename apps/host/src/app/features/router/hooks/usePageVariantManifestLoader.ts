import { useCallback } from 'react';
import { LOG } from '@/log';
import { type PageVariantManifestMap, type PageVariantManifestPath, usePageVariantManifestStore } from '@/shared-store';
import type { PageVariantManifestConfig } from '@/components/custom/DynamicElement';

const Log = new LOG('usePageVariantManifestLoader');

type PageVariantManifestModule = { pageVariantManifest: Record<string, PageVariantManifestConfig> };

const VARIANT_LOADERS: Record<string, () => Promise<PageVariantManifestModule>> = {
  manager: () => import('manager/PageVariantManifest').catch(() => ({ pageVariantManifest: {} })) as Promise<PageVariantManifestModule>,
  fca: () => import('fca/PageVariantManifest').catch(() => ({ pageVariantManifest: {} })) as Promise<PageVariantManifestModule>,
  dashboard: () => import('dashboard/PageVariantManifest').catch(() => ({ pageVariantManifest: {} })) as Promise<PageVariantManifestModule>,
};

/**
 * 변형 정의에서 component 함수 참조를 버리고 picker UI용 메타만 추출한다.
 * host는 변형 컴포넌트를 직접 렌더하지 않으므로 함수 참조를 store에 보관할 필요 없음.
 */
const toManifestPaths = (manifest: Record<string, PageVariantManifestConfig>): PageVariantManifestPath[] =>
  Object.values(manifest).map((entry) => ({
    appId: entry.appId,
    path: entry.path,
    defaultKey: entry.defaultKey,
    variants: Object.entries(entry.components).map(([key, value]) => ({
      key,
      label: value.label,
      ...(value.description ? { description: value.description } : {}),
    })),
  }));

const loadManifest = async (): Promise<PageVariantManifestMap> => {
  const entries = await Promise.all(
    Object.entries(VARIANT_LOADERS).map(async ([name, loader]) => {
      const mod = await loader();
      return [name, toManifestPaths(mod.pageVariantManifest)] as const;
    }),
  );
  return Object.fromEntries(entries);
};

export function usePageVariantManifestLoader() {
  const { setVariants, setIsLoaded } = usePageVariantManifestStore();
  const load = useCallback(async () => {
    try {
      const manifest = await loadManifest();
      setVariants(manifest);
      setIsLoaded(true);
      Log.debug('Page variant manifest loaded:', manifest);
    } catch (err) {
      Log.error('Failed to load page variant manifest:', err);
      setVariants({});
      setIsLoaded(true);
    }
  }, [setVariants, setIsLoaded]);

  return { load };
}
