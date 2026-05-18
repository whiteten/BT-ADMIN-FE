import { useMenuStore } from '@/shared-store';
import { PanelMenuRow } from './PanelMenuPrimitives';
import { MenuSpinner } from '../components/MenuSpinner';
import { useMenuPanelStore } from '../hooks/useMenuPanelStore';

interface PanelAppSectionProps {
  onNavigate: (path: string) => void;
}

const PanelAppSection = ({ onNavigate }: PanelAppSectionProps) => {
  const { menuConfigs, isLoading } = useMenuStore();
  const displayedAppId = useMenuPanelStore((s) => s.displayedAppId);

  if (isLoading) {
    return (
      <div className="h-40">
        <MenuSpinner className="text-[var(--color-bt-primary)]" />
      </div>
    );
  }

  const config = menuConfigs.find((c) => c.appId === displayedAppId);

  if (!config) {
    return (
      <div className="h-full flex items-center justify-center px-3">
        <p className="text-sm text-[#adb5bd]">메뉴를 선택해 주세요.</p>
      </div>
    );
  }

  const visibleMenus = config.menus.filter((m) => !m.hide);

  return (
    <section className="flex flex-col">
      <header className="px-3 mb-2">
        <h3 className="text-sm font-semibold tracking-wider uppercase text-[#868e96]">{config.appName}</h3>
      </header>
      {visibleMenus.length === 0 ? (
        <p className="text-xs text-[#adb5bd] px-3 py-4">메뉴 정보를 찾을 수 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-px">
          {visibleMenus.map((item) => (
            <PanelMenuRow key={item.menuKey} item={item} appId={config.appId} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </section>
  );
};

export default PanelAppSection;
