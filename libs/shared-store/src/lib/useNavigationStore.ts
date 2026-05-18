import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Favorite, NaviApp, NavigationData } from '@/shared-api';

interface NavigationStore {
  apps: NaviApp[];
  permissions: string[];
  favorites: Favorite[];
  setNavigation: (data: NavigationData) => void;
  reset: () => void;
}

const initialState = {
  apps: [] as NaviApp[],
  permissions: [] as string[],
  favorites: [] as Favorite[],
};

export const useNavigationStore = create<NavigationStore>()(
  devtools(
    (set) => ({
      ...initialState,
      setNavigation: (data) =>
        set(
          {
            apps: data.apps,
            permissions: data.permissions,
            favorites: data.favorites,
          },
          false,
          'setNavigation',
        ),
      reset: () => set(initialState, false, 'reset'),
    }),
    { name: 'NavigationStore' },
  ),
);
