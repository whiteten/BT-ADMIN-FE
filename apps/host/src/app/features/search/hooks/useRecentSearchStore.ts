import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { RECENT_SEARCH_MAX } from '../constants/searchConstants';

/**
 * 최근 검색어 보관 스토어.
 * - 검색어(텍스트)만 저장 — 검색 결과는 저장하지 않음
 * - localStorage 영속(새로고침·탭 종료 후에도 유지)
 * - 최대 RECENT_SEARCH_MAX개, 중복 검색 시 맨 앞으로 이동
 */
interface RecentSearchStore {
  /** 최근 검색어 — 앞일수록 최신, 최대 RECENT_SEARCH_MAX개 */
  recents: string[];
  /** 검색어 추가 — 중복 제거 후 맨 앞에 넣고 상한 초과분 절단 */
  addRecent: (term: string) => void;
  /** 검색어 1건 삭제 (hover X) */
  removeRecent: (term: string) => void;
  /** 전체 삭제 */
  clearRecents: () => void;
}

export const useRecentSearchStore = create<RecentSearchStore>()(
  devtools(
    persist(
      (set) => ({
        recents: [],
        addRecent: (term) =>
          set(
            (state) => {
              const t = term.trim();
              if (!t) return state;
              const deduped = state.recents.filter((r) => r !== t);
              return { recents: [t, ...deduped].slice(0, RECENT_SEARCH_MAX) };
            },
            false,
            'addRecent',
          ),
        removeRecent: (term) => set((state) => ({ recents: state.recents.filter((r) => r !== term) }), false, 'removeRecent'),
        clearRecents: () => set({ recents: [] }, false, 'clearRecents'),
      }),
      {
        name: 'search-recent',
        storage: createJSONStorage(() => localStorage),
      },
    ),
    { name: 'RecentSearchStore' },
  ),
);
