import PanelAppSection from './PanelAppSection';
import { PANEL_SIDEBAR_WIDTH } from '../constants/layoutConstants';
import { useMenuPanelStore } from '../hooks/useMenuPanelStore';

interface PanelSidebarProps {
  onNavigate: (path: string) => void;
}

const PanelSidebar = ({ onNavigate }: PanelSidebarProps) => {
  const view = useMenuPanelStore((s) => s.view);

  // favorite view에서는 중간 영역 생략 — PanelDetail이 직접 즐겨찾기 렌더
  if (view === 'favorite') return null;

  return (
    <aside style={{ width: PANEL_SIDEBAR_WIDTH }} className="shrink-0 h-full bg-white text-[#495057] border-r border-[#e9ecef] flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-4">
        <PanelAppSection onNavigate={onNavigate} />
      </div>
    </aside>
  );
};

export default PanelSidebar;
