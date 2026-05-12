import { useMemo } from 'react';
import { useMenuStore } from '@/shared-store';
import PanelControls from './PanelControls';
import { ChildList, MenuLink } from './PanelMenuPrimitives';
import { useMenuPanelStore } from '../hooks/useMenuPanelStore';
import type { MenuItem } from '@/libs/shared-store/src/types/menu.types';

const findMenuByKey = (menus: MenuItem[], key: string): MenuItem | null => {
  for (const m of menus) {
    if (m.menuKey === key) return m;
    if (m.children?.length) {
      const found = findMenuByKey(m.children, key);
      if (found) return found;
    }
  }
  return null;
};

interface PanelDetailProps {
  onNavigate: (path: string) => void;
}

const PanelDetail = ({ onNavigate }: PanelDetailProps) => {
  const { menuConfigs } = useMenuStore();
  const displayedAppId = useMenuPanelStore((s) => s.displayedAppId);
  const activeMenuKey = useMenuPanelStore((s) => s.activeMenuKey);

  const config = menuConfigs.find((c) => c.appId === displayedAppId);

  const active = useMemo(() => {
    if (!config || !activeMenuKey) return null;
    return findMenuByKey(config.menus, activeMenuKey);
  }, [config, activeMenuKey]);

  if (!config) return null;

  if (!active) {
    return (
      <div className="flex flex-col h-full">
        <header className="shrink-0 flex items-center justify-end gap-2 px-6 pt-5 pb-4 min-h-[72px]">
          <PanelControls />
        </header>
        <div className="mx-6 border-t border-[#e9ecef]" />
        <div className="flex-1 flex items-center justify-center text-sm text-[#878a99]">
          <p>좌측에서 메뉴 카테고리를 선택해주세요.</p>
        </div>
      </div>
    );
  }

  const Icon = active.icon;

  return (
    <div className="flex flex-col h-full">
      <header className="shrink-0 flex items-center justify-between gap-2 px-6 pt-5 pb-4 min-h-[72px]">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && (
            <span className="flex items-center justify-center size-7 text-[var(--color-bt-primary)]">
              <Icon className="size-7" />
            </span>
          )}
          <h2 className="text-lg font-bold tracking-tight text-[#212529] truncate">{active.label}</h2>
        </div>
        <PanelControls />
      </header>
      <div className="mx-6 border-t border-[#e9ecef]" />

      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6">
        {active.path && !active.children?.length ? (
          <MenuLink item={active} appId={config.appId} onNavigate={onNavigate} showDesc />
        ) : (
          active.children?.length && <ChildList items={active.children} appId={config.appId} onNavigate={onNavigate} showDesc />
        )}
      </div>
    </div>
  );
};

export default PanelDetail;
