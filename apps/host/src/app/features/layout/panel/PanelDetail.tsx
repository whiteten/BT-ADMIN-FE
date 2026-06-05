import { useMemo } from 'react';
import { useMenuStore } from '@/shared-store';
import PanelControls from './PanelControls';
import PanelDetailSplit from './PanelDetailSplit';
import PanelFavoritesSection from './PanelFavoritesSection';
import { useMenuPanelStore } from '../hooks/useMenuPanelStore';
import { IconStar } from '@/components/custom/Icons';
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
  const view = useMenuPanelStore((s) => s.view);
  const displayedAppId = useMenuPanelStore((s) => s.displayedAppId);
  const activeMenuKey = useMenuPanelStore((s) => s.activeMenuKey);

  const config = menuConfigs.find((c) => c.appId === displayedAppId);

  const active = useMemo(() => {
    if (!config || !activeMenuKey) return null;
    return findMenuByKey(config.menus, activeMenuKey);
  }, [config, activeMenuKey]);

  if (view === 'favorite') {
    return (
      <div className="flex flex-col h-full">
        <header className="shrink-0 flex items-center justify-between gap-2 px-6 pt-5 pb-4 min-h-[72px]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center justify-center size-7 text-[var(--color-bt-primary)]">
              <IconStar className="size-7" />
            </span>
            <h2 className="text-lg font-bold tracking-tight text-[#212529] truncate">즐겨찾기</h2>
          </div>
          <PanelControls />
        </header>
        <div className="mx-6 border-t border-[#e9ecef]" />
        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6">
          <PanelFavoritesSection />
        </div>
      </div>
    );
  }

  // MenuPanel이 children 보유 폴더가 active일 때만 PanelDetail을 렌더하므로,
  // 여기 도달 시 active는 항상 children을 가진 폴더(혹은 데이터 미로딩 상태). 안전 가드만 유지.
  if (!config || !active?.children?.length) return null;

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

      <PanelDetailSplit menu={active} appId={config.appId} onNavigate={onNavigate} />
    </div>
  );
};

export default PanelDetail;
