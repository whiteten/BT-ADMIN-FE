import { useCallback } from 'react';
import { Navigate, Outlet, type RouteObject } from 'react-router-dom';
import { LOG } from '@/log';
import { type QueryParamSpec, type RemoteRouteEntry, type RemoteRoutesMap, useRemoteRoutesStore } from '@/shared-store';

const Log = new LOG('useRemoteRoutesLoader');

type RoutesModule = { routes: RouteObject[] };

const ROUTE_LOADERS: Record<string, () => Promise<RoutesModule>> = {
  manager: () => import('manager/Routes').catch(() => ({ routes: [] })) as Promise<RoutesModule>,
  fca: () => import('fca/Routes').catch(() => ({ routes: [] })) as Promise<RoutesModule>,
  ipron: () => import('ipron/Routes').catch(() => ({ routes: [] })) as Promise<RoutesModule>,
  aoe: () => import('aoe/Routes').catch(() => ({ routes: [] })) as Promise<RoutesModule>,
  stt: () => import('stt/Routes').catch(() => ({ routes: [] })) as Promise<RoutesModule>,
  ivr: () => import('ivr/Routes').catch(() => ({ routes: [] })) as Promise<RoutesModule>,
  insight: () => import('insight/Routes').catch(() => ({ routes: [] })) as Promise<RoutesModule>,
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

const loadRemoteRoutes = async (): Promise<RemoteRoutesMap> => {
  const entries = await Promise.all(
    Object.entries(ROUTE_LOADERS).map(async ([name, loader]) => {
      try {
        const routesModule = await loader();
        const routes = Array.isArray(routesModule?.routes) ? routesModule.routes : [];
        return [name, flattenRoutes(routes)] as const;
      } catch (err) {
        Log.warn(`Failed to load routes for remote "${name}":`, err);
        return [name, []] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
};

export function useRemoteRoutesLoader() {
  const setRoutes = useRemoteRoutesStore((s) => s.setRoutes);
  const load = useCallback(async () => {
    try {
      const routes = await loadRemoteRoutes();
      Log.debug('Remote routes loaded:', routes);
      setRoutes(routes);
    } catch (err) {
      Log.error('Failed to load remote routes:', err);
      setRoutes({});
    }
  }, [setRoutes]);

  return { load };
}
