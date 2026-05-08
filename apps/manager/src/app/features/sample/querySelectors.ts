import type { QuerySelectorComponent } from '@/shared-store';

/**
 * 자동 생성된 querySelectors.ts aggregator 템플릿.
 *
 * 이 remote 전용 도메인 selector가 필요해지면 ./selectors/ 아래에 컴포넌트를 추가하고
 * 아래 _selectors에 lazy import + 키를 등록한다.
 *
 * MF './QuerySelectors'로 host에 노출되며, host의 useQuerySelectorsLoader가
 * 'APP_ID:' prefix를 붙여 통합 registry에 적재한다.
 *
 * routes.tsx에서는 SelectorKeys 상수를 import해서 selectorKey로 사용한다 (오타·휴먼에러 방지).
 * 공통 selector(EnumSelector 등)는 manager가 기본 제공하므로 DefaultSelectorKeys(@/shared-store)를 사용한다.
 */
const APP_ID = 'manager';

const _selectors = {} satisfies Record<string, QuerySelectorComponent>;

export const querySelectors = _selectors;

export const SelectorKeys = Object.fromEntries(Object.keys(_selectors).map((k) => [k, `${APP_ID}:${k}`])) as {
  [K in keyof typeof _selectors]: `${typeof APP_ID}:${K & string}`;
};
