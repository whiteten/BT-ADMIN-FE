import PanelAppSection from './PanelAppSection';
import { useMenuPanelStore } from '../hooks/useMenuPanelStore';

interface PanelSidebarProps {
  onNavigate: (path: string) => void;
}

const PanelSidebar = ({ onNavigate }: PanelSidebarProps) => {
  const view = useMenuPanelStore((s) => s.view);

  // bookmark view에서는 중간 영역 생략 — PanelDetail이 직접 북마크 렌더
  if (view === 'bookmark') return null;

  return (
    <aside className="w-[260px] shrink-0 h-full bg-[#f8f9fb] text-[#495057] border-r border-[#e9ecef] flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto pt-4 pb-4">
        <PanelAppSection onNavigate={onNavigate} />
      </div>
    </aside>
  );
};

export default PanelSidebar;
