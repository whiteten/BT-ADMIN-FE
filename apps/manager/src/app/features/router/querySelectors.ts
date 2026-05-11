import { lazy } from 'react';
import type { QuerySelectorComponent } from '@/shared-store';

/**
 * manager가 모든 remote에 기본 제공하는 공통 selector aggregator.
 *
 * 새 공통 selector 추가 시:
 *  1. ./selectors/Xxx.tsx 작성
 *  2. 아래 _selectors에 lazy import + 키 추가
 *  3. libs/shared-store/src/lib/defaultSelectorKeys.ts 의 DefaultSelectorKeys에 'manager:Xxx' 항목 추가
 *
 * MF './QuerySelectors'로 expose되며, host의 useQuerySelectorsLoader가
 * 'manager:' prefix를 붙여 통합 registry에 적재한다.
 */
const APP_ID = 'manager';

const _selectors = {
  EnumSelector: lazy(() => import('./selectors/EnumSelector')),
} satisfies Record<string, QuerySelectorComponent>;

export const querySelectors = _selectors;

/**
 * manager 자체 routes.tsx에서 사용할 수 있는 selectorKey 상수.
 * 다른 remote는 DefaultSelectorKeys(@/shared-store)를 import해서 사용한다.
 */
export const SelectorKeys = Object.fromEntries(Object.keys(_selectors).map((k) => [k, `${APP_ID}:${k}`])) as {
  [K in keyof typeof _selectors]: `${typeof APP_ID}:${K & string}`;
};
