import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface BookmarkItem {
  rootPath: string;
  id: string;
  label: string;
  path: string;
}

interface BookmarkStore {
  bookmarks: BookmarkItem[];
  toggleBookmark: (rootPath: string, id: string, label: string, path: string) => void;
  isBookmarked: (id: string) => boolean;
}

export const useBookmarkStore = create<BookmarkStore>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      toggleBookmark: (rootPath, id, label, path) => {
        set((state) => {
          const exists = state.bookmarks.some((item) => item.id === id);
          return exists ? { bookmarks: state.bookmarks.filter((item) => item.id !== id) } : { bookmarks: [...state.bookmarks, { rootPath, id, label, path }] };
        });
      },
      isBookmarked: (id) => get().bookmarks.some((item) => item.id === id),
    }),
    { name: 'bookmark-menu-storage', storage: createJSONStorage(() => sessionStorage) },
  ),
);
