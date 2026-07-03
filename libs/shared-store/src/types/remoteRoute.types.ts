/**
 * 메뉴 등록 시 path와 함께 받을 query 파라미터 한 건의 명세.
 * routes.tsx의 RouteObject.handle.queryParams 배열에 박아두면
 * flattenRoutes가 그대로 RemoteRouteEntry로 옮겨주고,
 * 메뉴 폼은 selectorKey로 selector 컴포넌트를 lookup해 동적 렌더한다.
 *
 * handle.queryParams에 선언된 모든 query는 메뉴 등록 폼에서 무조건 필수로 검증된다
 * (선택적 query 키 케이스는 의도적으로 지원하지 않는다).
 */
export interface QueryParamSpec {
  key: string;
  label: string;
  selectorKey: string;
  [extra: string]: unknown;
}

/**
 * remote routes.tsx의 RouteObject.handle 표준 형태.
 * - queryParams: 메뉴 등록 폼의 query 입력 명세
 * - public: true면 세션 인증 없이 접근 가능한 공개 라우트 (leaf에만 유효 — host RouteShell이 판정에 사용)
 */
export interface RouteHandle {
  queryParams?: QueryParamSpec[];
  public?: boolean;
}

export interface RemoteRouteEntry {
  path: string;
  paramKeys?: string[];
  queryParams?: QueryParamSpec[];
  /** 공개 라우트 여부 — handle.public === true인 leaf만 true로 세팅 */
  public?: true;
}

export type RemoteRoutesMap = Record<string, RemoteRouteEntry[]>;
