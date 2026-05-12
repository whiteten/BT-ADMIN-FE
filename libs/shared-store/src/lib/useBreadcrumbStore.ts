import type { BreadcrumbProps } from 'antd';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type BreadcrumbItems = BreadcrumbProps['items'];
type BreadcrumbParams = BreadcrumbProps['params'];

interface BreadcrumbStore {
  items: BreadcrumbItems;
  params: BreadcrumbParams | undefined;
  setBreadcrumb: (items: BreadcrumbItems, params?: BreadcrumbParams) => void;
  clearBreadcrumb: () => void;
}

const initialState = {
  items: [] as BreadcrumbItems,
  params: undefined as BreadcrumbParams | undefined,
};

export const useBreadcrumbStore = create<BreadcrumbStore>()(
  devtools(
    (set) => ({
      ...initialState,
      setBreadcrumb: (items, params) => set({ items, params }, false, 'setBreadcrumb'),
      clearBreadcrumb: () => set(initialState, false, 'clearBreadcrumb'),
    }),
    { name: 'BreadcrumbStore' },
  ),
);
