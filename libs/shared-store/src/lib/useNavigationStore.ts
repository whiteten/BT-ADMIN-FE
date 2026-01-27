import { create } from 'zustand';
import type { NaviApp, NavigationData } from '@/shared-api';

interface NavigationStore {
  apps: NaviApp[];
  permissions: string[];
  favorites: string[];
  setNavigation: (data: NavigationData) => void;
  reset: () => void;
}

const initialState = {
  apps: [] as NaviApp[],
  permissions: [] as string[],
  favorites: [] as string[],
};

export const useNavigationStore = create<NavigationStore>((set) => ({
  ...initialState,
  setNavigation: (data) =>
    set({
      apps: data.apps,
      permissions: data.permissions,
      favorites: data.favorites,
    }),
  reset: () => set(initialState),
}));
