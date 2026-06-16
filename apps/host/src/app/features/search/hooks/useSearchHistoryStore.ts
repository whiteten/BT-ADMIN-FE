import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import type { DocSearchResult, MenuSearchResult } from '../types/search';

/** 직전 검색 스냅샷 — 검색어 + 그 시점의 메뉴·문서 결과 */
export interface PrevSearch {
  query: string;
  menus: MenuSearchResult[];
  docs: DocSearchResult[];
}

interface SearchHistoryStore {
  /** 직전(마지막으로 본) 검색 결과. 없으면 null */
  prev: PrevSearch | null;
  setPrev: (prev: PrevSearch | null) => void;
  clearPrev: () => void;
}

/**
 * 통합검색 직전 검색어·결과 보관 스토어.
 * - 검색결과(메뉴·문서)까지 sessionStorage에 persist — 새로고침 유지, 탭 닫으면 초기화
 * - 새 검색어 확정 시 직전 스냅샷을 prev로 커밋해 현재 결과와 함께 표기
 */
export const useSearchHistoryStore = create<SearchHistoryStore>()(
  devtools(
    persist(
      (set) => ({
        prev: null,
        setPrev: (prev) => set({ prev }, false, 'setPrev'),
        clearPrev: () => set({ prev: null }, false, 'clearPrev'),
      }),
      {
        name: 'search-history',
        storage: createJSONStorage(() => sessionStorage),
        partialize: (state) => ({ prev: state.prev }),
      },
    ),
    { name: 'SearchHistoryStore' },
  ),
);
