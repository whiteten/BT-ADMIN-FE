/**
 * 사용하지 않는 파일이나,
 * Store를 sessionStorage 또는 localStorage에 저장하는 예제로 남겨둠.
 * 추후 삭제 예정.
 */

// import { create } from 'zustand';
// import { createJSONStorage, persist } from 'zustand/middleware';

// interface BookmarkItem {
//   appId: string;
//   menuKey: string;
//   label: string;
//   path: string;
// }

// interface BookmarkStore {
//   bookmarks: BookmarkItem[];
//   toggleBookmark: (appId: string, menuKey: string, label: string, path: string) => void;
//   isBookmarked: (menuKey: string) => boolean;
// }

// export const useBookmarkStore = create<BookmarkStore>()(
//   persist(
//     (set, get) => ({
//       bookmarks: [],
//       toggleBookmark: (appId, menuKey, label, path) => {
//         set((state) => {
//           const exists = state.bookmarks.some((item) => item.menuKey === menuKey);
//           return exists ? { bookmarks: state.bookmarks.filter((item) => item.menuKey !== menuKey) } : { bookmarks: [...state.bookmarks, { appId, menuKey, label, path }] };
//         });
//       },
//       isBookmarked: (menuKey) => get().bookmarks.some((item) => item.menuKey === menuKey),
//     }),
//     { name: 'bookmark-menu-storage', storage: createJSONStorage(() => sessionStorage) },
//   ),
// );
