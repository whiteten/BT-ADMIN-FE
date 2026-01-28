/**
 * 사용하지 않는 파일이나,
 * Store를 sessionStorage 또는 localStorage에 저장하는 예제로 남겨둠.
 * 추후 삭제 예정.
 */

// import { create } from 'zustand';
// import { createJSONStorage, persist } from 'zustand/middleware';

// interface BookmarkItem {
//   appId: string;
//   menuId: number;
//   label: string;
//   path: string;
// }

// interface BookmarkStore {
//   bookmarks: BookmarkItem[];
//   toggleBookmark: (appId: string, menuId: number, label: string, path: string) => void;
//   isBookmarked: (menuId: number) => boolean;
// }

// export const useBookmarkStore = create<BookmarkStore>()(
//   persist(
//     (set, get) => ({
//       bookmarks: [],
//       toggleBookmark: (appId, menuId, label, path) => {
//         set((state) => {
//           const exists = state.bookmarks.some((item) => item.menuId === menuId);
//           return exists ? { bookmarks: state.bookmarks.filter((item) => item.menuId !== menuId) } : { bookmarks: [...state.bookmarks, { appId, menuId, label, path }] };
//         });
//       },
//       isBookmarked: (menuId) => get().bookmarks.some((item) => item.menuId === menuId),
//     }),
//     { name: 'bookmark-menu-storage', storage: createJSONStorage(() => sessionStorage) },
//   ),
// );
