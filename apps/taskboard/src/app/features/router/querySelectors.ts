import type { QuerySelectorComponent } from '@/shared-store';

/**
 * taskboard remote가 자체 expose하는 도메인 selector aggregator.
 *
 * 새 taskboard 전용 selector 추가 시:
 *  1. ./selectors/Xxx.tsx 작성
 *  2. 아래 _selectors에 lazy import + 키 추가
 *  3. routes.tsx에서 SelectorKeys.Xxx 로 사용
 *
 * MF './QuerySelectors'로 expose되며, host의 useQuerySelectorsLoader가
 * 'taskboard:' prefix를 붙여 통합 registry에 적재한다.
 */
const APP_ID = 'taskboard';

const _selectors = {} satisfies Record<string, QuerySelectorComponent>;

export const querySelectors = _selectors;

export const SelectorKeys = Object.fromEntries(Object.keys(_selectors).map((k) => [k, `${APP_ID}:${k}`])) as {
  [K in keyof typeof _selectors]: `${typeof APP_ID}:${K & string}`;
};
