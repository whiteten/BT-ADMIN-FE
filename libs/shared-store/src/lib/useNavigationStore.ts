import { create } from 'zustand';
import type { Bookmark, NaviApp, NavigationData } from '@/shared-api';

interface NavigationStore {
  apps: NaviApp[];
  permissions: string[];
  favorites: Bookmark[];
  setNavigation: (data: NavigationData) => void;
  reset: () => void;
}

const initialState = {
  apps: [] as NaviApp[],
  permissions: [] as string[],
  favorites: [] as Bookmark[],
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
