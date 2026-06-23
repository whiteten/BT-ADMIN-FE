import { useLayoutEffect } from 'react';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

interface LayoutStore {
  /** 사용자가 펼치기/접기 버튼으로 토글하는 chrome 접힘 상태(사용자 선호 — persist) */
  chromeCollapsed: boolean;
  setChromeCollapsed: (collapsed: boolean) => void;
  toggleChrome: () => void;
  /** 현재 화면이 chrome(헤더/사이드바/패널) 없이 본문만 렌더되어야 하는지(화면 파생 일시 상태 — persist 안 함) */
  chromeless: boolean;
  setChromeless: (chromeless: boolean) => void;
}

/**
 * 레이아웃 chrome 제어 스토어. host Layout 이 구독해 chrome 을 조건부 렌더한다.
 * chromeless 의 SoT 가 host 에 있으면 remote 페이지가 선언할 수 없어 shared-store 에 둔다(host·remote 양쪽 접근).
 * chromeCollapsed 만 persist(사용자 선호), chromeless 는 persist 제외(화면 mount/unmount 로만 토글).
 */
export const useLayoutStore = create<LayoutStore>()(
  devtools(
    persist(
      (set) => ({
        chromeCollapsed: false,
        setChromeCollapsed: (chromeCollapsed) => set({ chromeCollapsed }, false, 'setChromeCollapsed'),
        toggleChrome: () => set((state) => ({ chromeCollapsed: !state.chromeCollapsed }), false, 'toggleChrome'),
        chromeless: false,
        setChromeless: (chromeless) => set({ chromeless }, false, 'setChromeless'),
      }),
      {
        name: 'layout-store',
        storage: createJSONStorage(() => sessionStorage),
        partialize: (state) => ({ chromeCollapsed: state.chromeCollapsed }),
      },
    ),
    { name: 'layout-store' },
  ),
);

/**
 * chromeless 화면 선언 훅 — chromeless 로 렌더할 페이지 컴포넌트 본문 시작부에서 1회 호출.
 * mount 시 chrome 제거 신호 on, unmount 시 off(다음 일반 화면에 chrome 복귀).
 */
export function useChromeless() {
  const setChromeless = useLayoutStore((s) => s.setChromeless);
  // useLayoutEffect — 페인트 직전 동기 실행. chrome 이 한 프레임 보였다 사라지는 깜빡임 방지.
  useLayoutEffect(() => {
    setChromeless(true);
    return () => setChromeless(false);
  }, [setChromeless]);
}
