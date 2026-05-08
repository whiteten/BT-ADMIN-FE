import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * hoveredMenuKey 자리에 들어가는 특수 sentinel 키.
 * MenuRow가 아닌 AppSwitcher row가 활성화됐을 때 PanelDetail이 앱 리스트를 렌더하도록 분기한다.
 */
export const APP_SWITCHER_HOVER_KEY = '__app_switcher__';

export type MenuPanelMode = 'compact' | 'mega';

interface MenuPanelStore {
  open: boolean;
  mode: MenuPanelMode;
  hoveredMenuKey: string | null;
  setOpen: (open: boolean) => void;
  togglePanel: () => void;
  setMode: (mode: MenuPanelMode) => void;
  toggleMode: () => void;
  setHoveredMenuKey: (menuKey: string | null) => void;
  reset: () => void;
}

export const useMenuPanelStore = create<MenuPanelStore>()(
  devtools(
    (set) => ({
      open: false,
      mode: 'compact',
      hoveredMenuKey: null,
      setOpen: (open) => set({ open }, false, 'setOpen'),
      togglePanel: () => set((state) => ({ open: !state.open }), false, 'togglePanel'),
      setMode: (mode) => set({ mode }, false, 'setMode'),
      toggleMode: () => set((state) => ({ mode: state.mode === 'compact' ? 'mega' : 'compact' }), false, 'toggleMode'),
      setHoveredMenuKey: (hoveredMenuKey) => set({ hoveredMenuKey }, false, 'setHoveredMenuKey'),
      reset: () => set({ open: false, mode: 'compact', hoveredMenuKey: null }, false, 'reset'),
    }),
    { name: 'menu-panel-store' },
  ),
);
