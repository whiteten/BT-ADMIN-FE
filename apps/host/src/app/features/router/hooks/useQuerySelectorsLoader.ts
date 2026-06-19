import { useCallback } from 'react';
import { LOG } from '@/log';
import { type QuerySelectorComponent, type QuerySelectorRegistry, useQuerySelectorsStore } from '@/shared-store';

const Log = new LOG('useQuerySelectorsLoader');

type SelectorsModule = { querySelectors: Record<string, QuerySelectorComponent> };

/**
 * 각 remote가 './QuerySelectors'로 expose한 selector aggregator를 dynamic import한다.
 * 등록되지 않은 remote는 빈 객체로 fallback (운영 안전).
 */
const SELECTOR_LOADERS: Record<string, () => Promise<SelectorsModule>> = {
  manager: () => import('manager/QuerySelectors').catch(() => ({ querySelectors: {} })) as Promise<SelectorsModule>,
  fca: () => import('fca/QuerySelectors').catch(() => ({ querySelectors: {} })) as Promise<SelectorsModule>,
  ipron: () => import('ipron/QuerySelectors').catch(() => ({ querySelectors: {} })) as Promise<SelectorsModule>,
  aoe: () => import('aoe/QuerySelectors').catch(() => ({ querySelectors: {} })) as Promise<SelectorsModule>,
  stt: () => import('stt/QuerySelectors').catch(() => ({ querySelectors: {} })) as Promise<SelectorsModule>,
  ivr: () => import('ivr/QuerySelectors').catch(() => ({ querySelectors: {} })) as Promise<SelectorsModule>,
  insight: () => import('insight/QuerySelectors').catch(() => ({ querySelectors: {} })) as Promise<SelectorsModule>,
  taskboard: () => import('taskboard/QuerySelectors').catch(() => ({ querySelectors: {} })) as Promise<SelectorsModule>,
  campaign: () => import('campaign/QuerySelectors').catch(() => ({ querySelectors: {} })) as Promise<SelectorsModule>,
  vel: () => import('vel/QuerySelectors').catch(() => ({ querySelectors: {} })) as Promise<SelectorsModule>,
};

/**
 * 모든 remote의 querySelectors를 모아 appId prefix를 적용한 통합 registry로 변환한다.
 *  - 'EnumSelector' (manager가 등록) → 'manager:EnumSelector'
 *  - 'BotStatusSelector' (fca가 등록) → 'fca:BotStatusSelector'
 *
 * 같은 appId 안에서의 키 중복은 TypeScript object literal이 막아주고,
 * 다른 appId 사이의 동명 selector는 prefix로 자연스럽게 분리된다.
 */
const loadAllSelectors = async (): Promise<QuerySelectorRegistry> => {
  const entries = await Promise.all(
    Object.entries(SELECTOR_LOADERS).map(async ([appId, loader]) => {
      try {
        const mod = await loader();
        const selectors = mod?.querySelectors ?? {};
        return Object.entries(selectors).map(([key, component]) => [`${appId}:${key}`, component] as const);
      } catch (err) {
        Log.warn(`Failed to load query selectors for remote "${appId}":`, err);
        return [] as ReadonlyArray<readonly [string, QuerySelectorComponent]>;
      }
    }),
  );
  return Object.fromEntries(entries.flat());
};

export function useQuerySelectorsLoader() {
  const setRegistry = useQuerySelectorsStore((s) => s.setRegistry);
  const load = useCallback(async () => {
    try {
      const registry = await loadAllSelectors();
      Log.debug('Query selectors loaded:', Object.keys(registry));
      setRegistry(registry);
    } catch (err) {
      Log.error('Failed to load query selectors:', err);
      setRegistry({});
    }
  }, [setRegistry]);

  return { load };
}
