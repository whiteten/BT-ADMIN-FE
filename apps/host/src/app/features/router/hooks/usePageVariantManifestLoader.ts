import { useCallback } from 'react';
import { LOG } from '@/log';
import { type PageVariantManifestMap, type PageVariantManifestPath, usePageVariantManifestStore } from '@/shared-store';
import type { PageVariantManifestConfig } from '@/components/custom/DynamicElement';

const Log = new LOG('usePageVariantManifestLoader');

type PageVariantManifestModule = { pageVariantManifest: Record<string, PageVariantManifestConfig> };

const VARIANT_LOADERS: Record<string, () => Promise<PageVariantManifestModule>> = {
  // host는 MF host라 './PageVariantManifest'를 expose할 수 없으므로 정적(직접) import한다.
  host: () => import('../pageVariantManifest').catch(() => ({ pageVariantManifest: {} })) as Promise<PageVariantManifestModule>,
  manager: () => import('manager/PageVariantManifest').catch(() => ({ pageVariantManifest: {} })) as Promise<PageVariantManifestModule>,
  fca: () => import('fca/PageVariantManifest').catch(() => ({ pageVariantManifest: {} })) as Promise<PageVariantManifestModule>,
  ipron: () => import('ipron/PageVariantManifest').catch(() => ({ pageVariantManifest: {} })) as Promise<PageVariantManifestModule>,
  aoe: () => import('aoe/PageVariantManifest').catch(() => ({ pageVariantManifest: {} })) as Promise<PageVariantManifestModule>,
  stt: () => import('stt/PageVariantManifest').catch(() => ({ pageVariantManifest: {} })) as Promise<PageVariantManifestModule>,
  ivr: () => import('ivr/PageVariantManifest').catch(() => ({ pageVariantManifest: {} })) as Promise<PageVariantManifestModule>,
  insight: () => import('insight/PageVariantManifest').catch(() => ({ pageVariantManifest: {} })) as Promise<PageVariantManifestModule>,
  taskboard: () => import('taskboard/PageVariantManifest').catch(() => ({ pageVariantManifest: {} })) as Promise<PageVariantManifestModule>,
  vel: () => import('vel/PageVariantManifest').catch(() => ({ pageVariantManifest: {} })) as Promise<PageVariantManifestModule>,
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
      try {
        const mod = await loader();
        const manifest = mod?.pageVariantManifest ?? {};
        return [name, toManifestPaths(manifest)] as const;
      } catch (err) {
        Log.warn(`Failed to load page variant manifest for remote "${name}":`, err);
        return [name, []] as const;
      }
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
