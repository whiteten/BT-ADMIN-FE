/**
 * manager가 기본 제공하는 공통 selector의 selectorKey 상수.
 *
 * 모든 remote의 routes.tsx에서 import하여 사용한다 (오타·휴먼에러 방지).
 * manager의 querySelectors aggregator는 이 키와 일치하는 selector를 등록해야 한다
 * (host loader가 'manager:' prefix를 자동 적용하므로 결과적으로 'manager:EnumSelector' 등으로 store에 적재됨).
 */
export const DefaultSelectorKeys = {
  EnumSelector: 'manager:EnumSelector',
} as const;

export type DefaultSelectorKey = (typeof DefaultSelectorKeys)[keyof typeof DefaultSelectorKeys];
