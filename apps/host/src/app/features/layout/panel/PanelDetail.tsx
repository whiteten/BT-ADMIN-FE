import { useMemo } from 'react';
import { useMenuStore } from '@/shared-store';
import PanelAppList from './PanelAppList';
import PanelControls from './PanelControls';
import { ChildList, MenuLink } from './PanelMenuPrimitives';
import useRemoteSelector from '../../../hooks/useRemoteSelector';
import { APP_SWITCHER_ACTIVE_KEY, useMenuPanelStore } from '../hooks/useMenuPanelStore';
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
  const { selectedRemote } = useRemoteSelector();
  const { activeMenuKey } = useMenuPanelStore();

  const config = menuConfigs.find((c) => c.appId === selectedRemote?.appId);

  const active = useMemo(() => {
    if (!config || !activeMenuKey || activeMenuKey === APP_SWITCHER_ACTIVE_KEY) return null;
    return findMenuByKey(config.menus, activeMenuKey);
  }, [config, activeMenuKey]);

  if (activeMenuKey === APP_SWITCHER_ACTIVE_KEY) {
    return <PanelAppList />;
  }

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
          <MenuLink item={active} appId={config.appId} onNavigate={onNavigate} />
        ) : (
          active.children?.length && <ChildList items={active.children} appId={config.appId} onNavigate={onNavigate} />
        )}
      </div>
    </div>
  );
};

export default PanelDetail;
