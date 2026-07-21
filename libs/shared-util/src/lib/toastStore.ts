import type { ReactNode } from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createUUID } from './util';

export type ToastType = 'info' | 'success' | 'warning' | 'error' | 'default';

/** 자동 닫힘 기본값(ms) */
export const DEFAULT_AUTO_CLOSE = 5000;

export interface ToastOptions {
  /** 자동 닫힘까지 ms. false면 자동으로 닫지 않음(직접 ✕로 닫아야 함) */
  autoClose?: number | false;
  /** 지정 시 항목 id로 사용. 같은 id가 이미 떠 있으면 push를 무시한다(중복 방지 — react-toastify와 동일). */
  toastId?: string;
  /**
   * @deprecated 위치는 ToastProvider가 한 곳(좌하단 스택)으로 통일한다. react-toastify 마이그레이션
   * 호환을 위해 타입만 받고 무시한다.
   */
  position?: string;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  content: ReactNode;
  createdAt: number;
  /** 총 지속시간(ms). false면 타이머 없음 */
  autoClose: number | false;
  /** 만료 예정 시각. 일시정지 중이면 null */
  expiresAt: number | null;
  /** 남은 ms. 일시정지 중 유효 */
  remaining: number;
}

interface ToastStore {
  /** 최신이 index 0 (앞으로 쌓임) */
  items: ToastItem[];
  /** 현재 보여주는 항목 index */
  activeIndex: number;
  /** 펼치기 — true면 쌓인 알림을 세로 목록으로 한번에 표시 */
  expanded: boolean;
  push: (type: ToastType, content: ReactNode, options?: ToastOptions) => string;
  dismiss: (id: string) => void;
  clear: () => void;
  /** 더 오래된 쪽으로 이동 (index+1) */
  older: () => void;
  /** 더 최신 쪽으로 이동 (index-1) */
  newer: () => void;
  setActiveIndex: (index: number) => void;
  setExpanded: (expanded: boolean) => void;
  /** 전체 타이머 일시정지 (hover 진입) */
  pauseAll: () => void;
  /** 전체 타이머 재개 (hover 이탈) */
  resumeAll: () => void;
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/** 항목별 setTimeout 핸들. 렌더와 무관한 부수효과라 스토어 밖에서 관리한다. */
const timers = new Map<string, ReturnType<typeof setTimeout>>();

const clearTimer = (id: string) => {
  const handle = timers.get(id);
  if (handle !== undefined) {
    clearTimeout(handle);
    timers.delete(id);
  }
};

const scheduleTimer = (id: string, delay: number) => {
  clearTimer(id);
  timers.set(
    id,
    setTimeout(() => {
      timers.delete(id);
      useToastStore.getState().dismiss(id);
    }, delay),
  );
};

export const useToastStore = create<ToastStore>()(
  devtools(
    (set) => ({
      items: [],
      activeIndex: 0,
      expanded: false,
      push: (type, content, options) => {
        const id = options?.toastId ?? createUUID();
        // 같은 toastId가 이미 떠 있으면 무시(기존 유지) — 타이머 스케줄 전에 검사해야 부수효과가 없다.
        if (options?.toastId !== undefined && useToastStore.getState().items.some((it) => it.id === id)) {
          return id;
        }
        const autoClose = options?.autoClose ?? DEFAULT_AUTO_CLOSE;
        const now = Date.now();
        const item: ToastItem = {
          id,
          type,
          content,
          createdAt: now,
          autoClose,
          expiresAt: autoClose === false ? null : now + autoClose,
          remaining: autoClose === false ? 0 : autoClose,
        };
        if (autoClose !== false) scheduleTimer(id, autoClose);
        // 새 항목을 앞에 넣고 그 항목을 활성으로.
        set((state) => ({ items: [item, ...state.items], activeIndex: 0 }), false, 'push');
        return id;
      },
      dismiss: (id) => {
        clearTimer(id);
        set(
          (state) => {
            const removedIndex = state.items.findIndex((it) => it.id === id);
            if (removedIndex === -1) return state;
            const items = state.items.filter((it) => it.id !== id);
            // 지운 항목이 활성 index보다 앞이면 index 보정. 마지막 항목이면 범위 안으로.
            let activeIndex = state.activeIndex;
            if (removedIndex < activeIndex) activeIndex -= 1;
            activeIndex = clamp(activeIndex, 0, Math.max(0, items.length - 1));
            return { items, activeIndex };
          },
          false,
          'dismiss',
        );
      },
      clear: () => {
        timers.forEach((handle) => clearTimeout(handle));
        timers.clear();
        set({ items: [], activeIndex: 0, expanded: false }, false, 'clear');
      },
      older: () => set((state) => ({ activeIndex: clamp(state.activeIndex + 1, 0, state.items.length - 1) }), false, 'older'),
      newer: () => set((state) => ({ activeIndex: clamp(state.activeIndex - 1, 0, state.items.length - 1) }), false, 'newer'),
      setActiveIndex: (index) => set((state) => ({ activeIndex: clamp(index, 0, Math.max(0, state.items.length - 1)) }), false, 'setActiveIndex'),
      setExpanded: (expanded) => set({ expanded }, false, 'setExpanded'),
      pauseAll: () => {
        const now = Date.now();
        set(
          (state) => ({
            items: state.items.map((item) => {
              if (item.autoClose === false || item.expiresAt === null) return item;
              clearTimer(item.id);
              return { ...item, remaining: Math.max(0, item.expiresAt - now), expiresAt: null };
            }),
          }),
          false,
          'pauseAll',
        );
      },
      resumeAll: () => {
        const now = Date.now();
        set(
          (state) => ({
            items: state.items.map((item) => {
              if (item.autoClose === false || item.expiresAt !== null) return item;
              scheduleTimer(item.id, item.remaining);
              return { ...item, expiresAt: now + item.remaining };
            }),
          }),
          false,
          'resumeAll',
        );
      },
    }),
    { name: 'toast-store' },
  ),
);
