import type { QuerySelectorComponent } from '@/shared-store';

const APP_ID = 'insight';

const _selectors = {} satisfies Record<string, QuerySelectorComponent>;

export const querySelectors = _selectors;

export const SelectorKeys = Object.fromEntries(Object.keys(_selectors).map((k) => [k, `${APP_ID}:${k}`])) as {
  [K in keyof typeof _selectors]: `${typeof APP_ID}:${K & string}`;
};
