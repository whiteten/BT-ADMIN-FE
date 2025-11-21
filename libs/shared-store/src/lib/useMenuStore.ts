import { create } from 'zustand';
import type { MenuConfigWithRootPath } from '../types/menu.types';

interface MenuStore {
  menuConfigs: MenuConfigWithRootPath[];
  isLoading: boolean;
  setMenuConfigs: (menuConfigs: MenuConfigWithRootPath[]) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export const useMenuStore = create<MenuStore>((set) => ({
  menuConfigs: [],
  isLoading: false,
  setMenuConfigs: (menuConfigs) => set({ menuConfigs }),
  setIsLoading: (isLoading) => set({ isLoading }),
}));
