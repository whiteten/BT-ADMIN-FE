import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

interface LayoutStore {
  chromeCollapsed: boolean;
  setChromeCollapsed: (collapsed: boolean) => void;
  toggleChrome: () => void;
}

export const useLayoutStore = create<LayoutStore>()(
  devtools(
    persist(
      (set) => ({
        chromeCollapsed: false,
        setChromeCollapsed: (chromeCollapsed) => set({ chromeCollapsed }, false, 'setChromeCollapsed'),
        toggleChrome: () => set((state) => ({ chromeCollapsed: !state.chromeCollapsed }), false, 'toggleChrome'),
      }),
      {
        name: 'layout-store',
        storage: createJSONStorage(() => sessionStorage),
      },
    ),
    { name: 'layout-store' },
  ),
);
