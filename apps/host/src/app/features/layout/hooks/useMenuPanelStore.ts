import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * activeMenuKey 자리에 들어가는 특수 sentinel 키.
 * MenuRow가 아닌 AppSwitcher row가 활성화됐을 때 PanelDetail이 앱 리스트를 렌더하도록 분기한다.
 */
export const APP_SWITCHER_ACTIVE_KEY = '__app_switcher__';

export type MenuPanelMode = 'compact' | 'mega';

interface MenuPanelStore {
  open: boolean;
  mode: MenuPanelMode;
  activeMenuKey: string | null;
  setOpen: (open: boolean) => void;
  togglePanel: () => void;
  setMode: (mode: MenuPanelMode) => void;
  toggleMode: () => void;
  setActiveMenuKey: (menuKey: string | null) => void;
  reset: () => void;
}

export const useMenuPanelStore = create<MenuPanelStore>()(
  devtools(
    (set) => ({
      open: false,
      mode: 'compact',
      activeMenuKey: null,
      setOpen: (open) => set({ open }, false, 'setOpen'),
      togglePanel: () => set((state) => ({ open: !state.open }), false, 'togglePanel'),
      setMode: (mode) => set({ mode }, false, 'setMode'),
      toggleMode: () => set((state) => ({ mode: state.mode === 'compact' ? 'mega' : 'compact' }), false, 'toggleMode'),
      setActiveMenuKey: (activeMenuKey) => set({ activeMenuKey }, false, 'setActiveMenuKey'),
      reset: () => set({ open: false, mode: 'compact', activeMenuKey: null }, false, 'reset'),
    }),
    { name: 'menu-panel-store' },
  ),
);
