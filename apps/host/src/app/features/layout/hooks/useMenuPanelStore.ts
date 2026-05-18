import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type MenuPanelMode = 'compact' | 'mega';
export type MenuPanelView = 'menu' | 'favorite';

interface MenuPanelStore {
  open: boolean;
  mode: MenuPanelMode;
  /** 패널이 현재 보여주는 컨텐츠 종류. strip 상단 즐겨찾기 버튼 토글로 'favorite' 진입. */
  view: MenuPanelView;
  /** 패널이 현재 보여주는 앱 id. URL상 selectedRemote와 독립적으로 뱃지 hover에 따라 갱신된다. */
  displayedAppId: string | null;
  activeMenuKey: string | null;
  /** 패널 좌측 60px 앱 뱃지 strip을 메인 레이아웃에 항상 노출(핀 고정). 패널 close/reset에 영향받지 않는다. */
  pinned: boolean;
  setOpen: (open: boolean) => void;
  togglePanel: () => void;
  setMode: (mode: MenuPanelMode) => void;
  toggleMode: () => void;
  setView: (view: MenuPanelView) => void;
  setDisplayedAppId: (appId: string | null) => void;
  setActiveMenuKey: (menuKey: string | null) => void;
  setPinned: (pinned: boolean) => void;
  togglePinned: () => void;
  reset: () => void;
}

export const useMenuPanelStore = create<MenuPanelStore>()(
  devtools(
    (set) => ({
      open: false,
      mode: 'compact',
      view: 'menu',
      displayedAppId: null,
      activeMenuKey: null,
      pinned: false,
      setOpen: (open) => set({ open }, false, 'setOpen'),
      togglePanel: () => set((state) => ({ open: !state.open }), false, 'togglePanel'),
      setMode: (mode) => set({ mode }, false, 'setMode'),
      toggleMode: () => set((state) => ({ mode: state.mode === 'compact' ? 'mega' : 'compact' }), false, 'toggleMode'),
      setView: (view) => set({ view }, false, 'setView'),
      setDisplayedAppId: (displayedAppId) => set({ displayedAppId }, false, 'setDisplayedAppId'),
      setActiveMenuKey: (activeMenuKey) => set({ activeMenuKey }, false, 'setActiveMenuKey'),
      setPinned: (pinned) => set({ pinned }, false, 'setPinned'),
      togglePinned: () => set((state) => ({ pinned: !state.pinned }), false, 'togglePinned'),
      reset: () => set((state) => ({ open: false, mode: 'compact', view: 'menu', displayedAppId: null, activeMenuKey: null, pinned: state.pinned }), false, 'reset'),
    }),
    { name: 'menu-panel-store' },
  ),
);
