import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type MenuPanelMode = 'compact' | 'mega';

interface MenuPanelStore {
  open: boolean;
  mode: MenuPanelMode;
  /** 패널이 현재 보여주는 앱 id. URL상 selectedRemote와 독립적으로 뱃지 hover에 따라 갱신된다. */
  displayedAppId: string | null;
  activeMenuKey: string | null;
  setOpen: (open: boolean) => void;
  togglePanel: () => void;
  setMode: (mode: MenuPanelMode) => void;
  toggleMode: () => void;
  setDisplayedAppId: (appId: string | null) => void;
  setActiveMenuKey: (menuKey: string | null) => void;
  reset: () => void;
}

export const useMenuPanelStore = create<MenuPanelStore>()(
  devtools(
    (set) => ({
      open: false,
      mode: 'compact',
      displayedAppId: null,
      activeMenuKey: null,
      setOpen: (open) => set({ open }, false, 'setOpen'),
      togglePanel: () => set((state) => ({ open: !state.open }), false, 'togglePanel'),
      setMode: (mode) => set({ mode }, false, 'setMode'),
      toggleMode: () => set((state) => ({ mode: state.mode === 'compact' ? 'mega' : 'compact' }), false, 'toggleMode'),
      setDisplayedAppId: (displayedAppId) => set({ displayedAppId }, false, 'setDisplayedAppId'),
      setActiveMenuKey: (activeMenuKey) => set({ activeMenuKey }, false, 'setActiveMenuKey'),
      reset: () => set({ open: false, mode: 'compact', displayedAppId: null, activeMenuKey: null }, false, 'reset'),
    }),
    { name: 'menu-panel-store' },
  ),
);
