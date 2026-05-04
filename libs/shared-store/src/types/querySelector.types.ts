import type { ComponentType } from 'react';
import type { QueryParamSpec } from './remoteRoute.types';

/**
 * QuerySelector 컴포넌트가 받는 props.
 * - spec: routes.tsx의 handle.queryParams 한 건. selector별 추가 옵션은 spec.* 로 들어옴
 * - value/onChange: 메뉴 폼 state와 양방향 바인딩
 */
export interface QuerySelectorProps {
  spec: QueryParamSpec;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export type QuerySelectorComponent = ComponentType<QuerySelectorProps>;

/** appId-prefix가 적용된 selectorKey → 컴포넌트 lookup 맵. */
export type QuerySelectorRegistry = Record<string, QuerySelectorComponent>;
