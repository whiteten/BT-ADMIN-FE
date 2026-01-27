import { create } from 'zustand';
import type { MenuConfig } from '../types/menu.types';

interface MenuStore {
  menuConfigs: MenuConfig[];
  isLoading: boolean;
  setMenuConfigs: (menuConfigs: MenuConfig[]) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export const useMenuStore = create<MenuStore>((set) => ({
  menuConfigs: [],
  isLoading: false,
  setMenuConfigs: (menuConfigs) => set({ menuConfigs }),
  setIsLoading: (isLoading) => set({ isLoading }),
}));
