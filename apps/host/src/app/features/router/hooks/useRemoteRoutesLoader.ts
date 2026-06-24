import { useCallback } from 'react';
import { Navigate, Outlet, type RouteObject } from 'react-router-dom';
import { LOG } from '@/log';
import { type QueryParamSpec, type RemoteRouteEntry, type RemoteRoutesMap, useRemoteAvailabilityStore, useRemoteRoutesStore } from '@/shared-store';

const Log = new LOG('useRemoteRoutesLoader');

type RoutesModule = { routes: RouteObject[] };

// catch 를 두지 않음 — import 실패(remote 미기동/Routes expose 실패)를 reject 로 흘려
// loadRemoteRoutes 에서 remote 별 가용성(성공/실패)을 판정하기 위함.
const ROUTE_LOADERS: Record<string, () => Promise<RoutesModule>> = {
  manager: () => import('manager/Routes') as unknown as Promise<RoutesModule>,
  fca: () => import('fca/Routes') as unknown as Promise<RoutesModule>,
  ipron: () => import('ipron/Routes') as unknown as Promise<RoutesModule>,
  aoe: () => import('aoe/Routes') as unknown as Promise<RoutesModule>,
  stt: () => import('stt/Routes') as unknown as Promise<RoutesModule>,
  ivr: () => import('ivr/Routes') as unknown as Promise<RoutesModule>,
  insight: () => import('insight/Routes') as unknown as Promise<RoutesModule>,
  taskboard: () => import('taskboard/Routes') as unknown as Promise<RoutesModule>,
  campaign: () => import('campaign/Routes').catch(() => ({ routes: [] })) as Promise<RoutesModule>,
  vel: () => import('vel/Routes') as unknown as Promise<RoutesModule>,
};

const PARAM_KEY_PATTERN = /:([A-Za-z_][A-Za-z0-9_]*)/g;

const flattenRoutes = (routes: RouteObject[], parentPath = ''): RemoteRouteEntry[] => {
  const entries: RemoteRouteEntry[] = [];
  for (const route of routes) {
    if (route.path === '*') continue;

    const segment = route.path?.replace(/^\/+|\/+$/g, '') ?? '';
    const fullSegment = route.index ? parentPath : parentPath ? `${parentPath}/${segment}` : segment;

    const elementType = (route.element as { type?: unknown } | null | undefined)?.type;
    const isSkippableElement = elementType === Navigate || elementType === Outlet;
    const children = route.children && route.children.length > 0 ? route.children : null;

    if (route.element && !isSkippableElement && !children) {
      const paramKeys = fullSegment.match(PARAM_KEY_PATTERN)?.map((m) => m.slice(1));
      const handle = route.handle as { queryParams?: QueryParamSpec[] } | undefined;
      entries.push({
        path: fullSegment,
        ...(paramKeys && paramKeys.length > 0 ? { paramKeys } : {}),
        ...(handle?.queryParams && handle.queryParams.length > 0 ? { queryParams: handle.queryParams } : {}),
      });
    }

    if (children) {
      entries.push(...flattenRoutes(children, fullSegment));
    }
  }
  return entries;
};

// 각 remote 의 Routes import 결과를 모아 라우트 맵 + 가용성 맵을 함께 반환.
// 가용성은 import 성공 여부가 아니라 "실제 라우트 보유 여부"로 판정한다.
// MF runtime 은 첫 import 실패(미기동) 후에도 remote 를 빈 컨테이너로 등록해 두기 때문에,
// 로그아웃→재로그인(페이지 reload 없는 재마운트)으로 loadRemoteRoutes 가 재실행되면
// 미기동 remote 의 import 가 reject 가 아니라 "빈 모듈"로 resolve 된다. 이때 import 성공만으로
// ok 를 판정하면 미기동 remote 도 true 로 잡힌다(remote_entry 재요청 없이 캐시 resolve).
// 미기동 remote 는 routes 가 빈 배열로 들어오므로, routes.length 로 판정하면 1차/2차 모두 정상.
const loadRemoteRoutes = async (): Promise<{ routes: RemoteRoutesMap; availability: Record<string, boolean> }> => {
  const results = await Promise.all(
    Object.entries(ROUTE_LOADERS).map(async ([name, loader]) => {
      try {
        const routesModule = await loader();
        const routes = Array.isArray(routesModule?.routes) ? routesModule.routes : [];
        return { name, ok: routes.length > 0, entries: flattenRoutes(routes) };
      } catch (err) {
        return { name, ok: false, entries: [] as RemoteRouteEntry[] };
      }
    }),
  );
  const routes = Object.fromEntries(results.map((r) => [r.name, r.entries])) as RemoteRoutesMap;
  const availability = Object.fromEntries(results.map((r) => [r.name, r.ok]));
  return { routes, availability };
};

export function useRemoteRoutesLoader() {
  const setRoutes = useRemoteRoutesStore((s) => s.setRoutes);
  const setAvailableRemotes = useRemoteAvailabilityStore((s) => s.setAvailableRemotes);
  const load = useCallback(async () => {
    try {
      const { routes, availability } = await loadRemoteRoutes();
      Log.debug('Remote routes loaded:', routes);
      Log.debug('Remote availability:', availability);
      setRoutes(routes);
      setAvailableRemotes(availability);
    } catch (err) {
      Log.error('Failed to load remote routes:', err);
      setRoutes({});
    }
  }, [setRoutes, setAvailableRemotes]);

  return { load };
}
