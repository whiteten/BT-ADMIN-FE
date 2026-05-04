/**
 * 메뉴 등록 시 path와 함께 받을 query 파라미터 한 건의 명세.
 * routes.tsx의 RouteObject.handle.queryParams 배열에 박아두면
 * flattenRoutes가 그대로 RemoteRouteEntry로 옮겨주고,
 * 메뉴 폼은 selectorKey로 selector 컴포넌트를 lookup해 동적 렌더한다.
 */
export interface QueryParamSpec {
  key: string;
  label: string;
  selectorKey: string;
  required?: boolean;
  [extra: string]: unknown;
}

export interface RemoteRouteEntry {
  path: string;
  paramKeys?: string[];
  queryParams?: QueryParamSpec[];
}

export type RemoteRoutesMap = Record<string, RemoteRouteEntry[]>;
