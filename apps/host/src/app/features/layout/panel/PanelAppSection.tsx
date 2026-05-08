import { useMenuStore } from '@/shared-store';
import { PanelMenuRow } from './PanelMenuPrimitives';
import useRemoteSelector from '../../../hooks/useRemoteSelector';
import { MenuSpinner } from '../components/MenuSpinner';
import NoData from '@/components/custom/NoData';

interface PanelAppSectionProps {
  onNavigate: (path: string) => void;
}

const PanelAppSection = ({ onNavigate }: PanelAppSectionProps) => {
  const { menuConfigs, isLoading } = useMenuStore();
  const { selectedRemote } = useRemoteSelector();

  if (isLoading) {
    return (
      <div className="h-40">
        <MenuSpinner className="text-white" />
      </div>
    );
  }

  const config = menuConfigs.find((c) => c.appId === selectedRemote?.appId);

  if (!config) {
    return <NoData message={`선택한 앱의\n메뉴 정보를\n찾을 수 없습니다.`} color="!text-white/70" />;
  }

  const visibleMenus = config.menus.filter((m) => !m.hide);

  return (
    <section className="flex flex-col">
      <header className="px-3 mb-2">
        <h3 className="text-xs font-semibold tracking-wider uppercase text-white/60">{config.appName}</h3>
      </header>
      {visibleMenus.length === 0 ? (
        <p className="text-xs text-white/40 px-3 py-4">메뉴 정보를 찾을 수 없습니다.</p>
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
