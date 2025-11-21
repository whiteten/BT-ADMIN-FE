import _ from 'lodash';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface FavoriteMenuItem {
  rootPath: string;
  id: string;
  label: string;
  path: string;
}

interface FavoriteMenuStore {
  favorites: FavoriteMenuItem[];
  toggleFavorite: (rootPath: string, id: string, label: string, path: string) => void;
  isFavorite: (id: string) => boolean;
}

export const useFavoriteMenuStore = create<FavoriteMenuStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      toggleFavorite: (rootPath, id, label, path) => {
        set((state) => {
          const exists = state.favorites.some((item) => item.id === id);
          return exists ? { favorites: state.favorites.filter((item) => item.id !== id) } : { favorites: [...state.favorites, { rootPath, id, label, path }] };
        });
      },
      isFavorite: (id) => get().favorites.some((item) => item.id === id),
    }),
    { name: 'favorite-menu-storage', storage: createJSONStorage(() => sessionStorage) },
  ),
);
