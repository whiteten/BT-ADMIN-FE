import { useCallback } from 'react';
import { Navigate, Outlet, type RouteObject } from 'react-router-dom';
import { LOG } from '@/log';
import { type RemoteRouteEntry, type RemoteRoutesMap, useRemoteRoutesStore } from '@/shared-store';

const Log = new LOG('useRemoteRoutesLoader');

type RoutesModule = { routes: RouteObject[] };

const ROUTE_LOADERS: Record<string, () => Promise<RoutesModule>> = {
  manager: () => import('manager/Routes').catch(() => ({ routes: [] })) as Promise<RoutesModule>,
  fca: () => import('fca/Routes').catch(() => ({ routes: [] })) as Promise<RoutesModule>,
};

const PARAM_KEY_PATTERN = /:([A-Za-z_][A-Za-z0-9_]*)/g;

const flattenRoutes = (routes: RouteObject[], remote: string, parentPath = ''): RemoteRouteEntry[] => {
  const entries: RemoteRouteEntry[] = [];
  for (const route of routes) {
    if (route.path === '*') continue;

    const segment = route.path?.replace(/^\/+|\/+$/g, '') ?? '';
    const fullSegment = route.index ? parentPath : parentPath ? `${parentPath}/${segment}` : segment;

    const elementType = (route.element as { type?: unknown } | null | undefined)?.type as { __meta?: { name?: string; file?: string } } | undefined;
    const isSkippableElement = elementType === Navigate || elementType === Outlet;
    const children = route.children && route.children.length > 0 ? route.children : null;

    if (route.element && !isSkippableElement && !children) {
      const paramKeys = fullSegment.match(PARAM_KEY_PATTERN)?.map((m) => m.slice(1));
      const meta = elementType?.__meta;
      entries.push({
        path: fullSegment,
        fullPath: `/${remote}/${fullSegment}`,
        ...(meta?.name ? { componentName: meta.name } : {}),
        ...(meta?.file ? { file: meta.file } : {}),
        ...(paramKeys && paramKeys.length > 0 ? { paramKeys } : {}),
      });
    }

    if (children) {
      entries.push(...flattenRoutes(children, remote, fullSegment));
    }
  }
  return entries;
};

const loadRemoteRoutes = async (): Promise<RemoteRoutesMap> => {
  const entries = await Promise.all(
    Object.entries(ROUTE_LOADERS).map(async ([name, loader]) => {
      const routesModule = await loader();
      return [name, flattenRoutes(routesModule.routes, name)] as const;
    }),
  );
  return Object.fromEntries(entries);
};

export function useRemoteRoutesLoader() {
  const setRoutes = useRemoteRoutesStore((s) => s.setRoutes);
  const load = useCallback(async () => {
    const routes = await loadRemoteRoutes();
    Log.debug('Remote routes loaded:', routes);
    setRoutes(routes);
  }, [setRoutes]);

  return { load };
}
