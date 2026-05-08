import { useMemo } from 'react';
import { useMenuStore } from '@/shared-store';
import PanelAppList from './PanelAppList';
import { ChildList, MenuLink } from './PanelMenuPrimitives';
import useRemoteSelector from '../../../hooks/useRemoteSelector';
import { APP_SWITCHER_HOVER_KEY, useMenuPanelStore } from '../hooks/useMenuPanelStore';
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
  const { hoveredMenuKey } = useMenuPanelStore();

  const config = menuConfigs.find((c) => c.appId === selectedRemote?.appId);

  const hovered = useMemo(() => {
    if (!config || !hoveredMenuKey || hoveredMenuKey === APP_SWITCHER_HOVER_KEY) return null;
    return findMenuByKey(config.menus, hoveredMenuKey);
  }, [config, hoveredMenuKey]);

  if (hoveredMenuKey === APP_SWITCHER_HOVER_KEY) {
    return <PanelAppList />;
  }

  if (!config) return null;

  if (!hovered) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#878a99]">
        <p>좌측에서 메뉴 카테고리를 선택해주세요.</p>
      </div>
    );
  }

  const Icon = hovered.icon;

  return (
    <div className="p-6">
      <header className="flex items-center gap-2 mb-4">
        {Icon && (
          <span className="flex items-center justify-center size-7 text-[var(--color-bt-primary)]">
            <Icon className="size-7" />
          </span>
        )}
        <h2 className="text-lg font-bold tracking-tight text-[#212529]">{hovered.label}</h2>
      </header>

      {hovered.path && !hovered.children?.length ? (
        <MenuLink item={hovered} appId={config.appId} onNavigate={onNavigate} />
      ) : (
        hovered.children?.length && <ChildList items={hovered.children} appId={config.appId} onNavigate={onNavigate} />
      )}
    </div>
  );
};

export default PanelDetail;
