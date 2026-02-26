import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { MenuConfig } from '../types/menu.types';

interface MenuStore {
  menuConfigs: MenuConfig[];
  isLoading: boolean;
  setMenuConfigs: (menuConfigs: MenuConfig[]) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export const useMenuStore = create<MenuStore>()(
  devtools(
    (set) => ({
      menuConfigs: [],
      isLoading: false,
      setMenuConfigs: (menuConfigs) => set({ menuConfigs }, false, 'setMenuConfigs'),
      setIsLoading: (isLoading) => set({ isLoading }, false, 'setIsLoading'),
    }),
    { name: 'MenuStore' },
  ),
);
