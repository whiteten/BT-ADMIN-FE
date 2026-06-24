import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { MenuConfig } from '../types/menu.types';

interface MenuStore {
  menuConfigs: MenuConfig[];
  isLoading: boolean;
  setMenuConfigs: (menuConfigs: MenuConfig[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  reset: () => void;
}

const initialState = {
  menuConfigs: [] as MenuConfig[],
  isLoading: false,
};

export const useMenuStore = create<MenuStore>()(
  devtools(
    (set) => ({
      ...initialState,
      setMenuConfigs: (menuConfigs) => set({ menuConfigs }, false, 'setMenuConfigs'),
      setIsLoading: (isLoading) => set({ isLoading }, false, 'setIsLoading'),
      reset: () => set(initialState, false, 'reset'),
    }),
    { name: 'MenuStore' },
  ),
);
