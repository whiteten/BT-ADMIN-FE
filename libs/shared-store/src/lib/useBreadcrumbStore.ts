import type { BreadcrumbProps } from 'antd';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type BreadcrumbItems = BreadcrumbProps['items'];
type BreadcrumbParams = BreadcrumbProps['params'];

interface BreadcrumbStore {
  items: BreadcrumbItems;
  params: BreadcrumbParams | undefined;
  /**
   * 이 breadcrumb을 소유한 페이지의 url(= 탭 미러 키). 우선 breadcrumb leaf 항목(마지막)의 path를 쓴다 —
   * 페이지가 자기 id를 박아 만든 self-url(예: `/fca/bot-config/bot/331`)이라, keep-alive로 얼어 있는
   * 페이지의 늦은(async) 쓰기여도 자기 url을 정확히 가리킨다. leaf path가 없으면(목록 등 pathless leaf)
   * window.location으로 폴백한다(동기 활성 쓰기엔 정확). 이로써 "331 로딩 중 341로 이동" 같은 케이스에서
   * 331의 늦은 breadcrumb이 341 탭을 덮는 오염을 막는다.
   */
  url: string | undefined;
  setBreadcrumb: (items: BreadcrumbItems, params?: BreadcrumbParams) => void;
  clearBreadcrumb: () => void;
}

const initialState = {
  items: [] as BreadcrumbItems,
  params: undefined as BreadcrumbParams | undefined,
  url: undefined as string | undefined,
};

/** breadcrumb leaf(마지막 항목)의 self-path를 owner url로. 없거나 미해석(`:`)이면 현재 location 폴백. */
function ownerUrl(items: BreadcrumbItems): string {
  const last = items && items.length > 0 ? items[items.length - 1] : undefined;
  const leafPath = typeof last?.path === 'string' ? last.path : '';
  if (leafPath && !leafPath.includes(':')) return leafPath;
  return window.location.pathname + window.location.search;
}

export const useBreadcrumbStore = create<BreadcrumbStore>()(
  devtools(
    (set) => ({
      ...initialState,
      setBreadcrumb: (items, params) => set({ items, params, url: ownerUrl(items) }, false, 'setBreadcrumb'),
      clearBreadcrumb: () => set(initialState, false, 'clearBreadcrumb'),
    }),
    { name: 'BreadcrumbStore' },
  ),
);
