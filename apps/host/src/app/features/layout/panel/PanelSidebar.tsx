import PanelAppSection from './PanelAppSection';
import PanelAppSwitcher from './PanelAppSwitcher';
import PanelBookmarksSection from './PanelBookmarksSection';

interface PanelSidebarProps {
  onNavigate: (path: string) => void;
}

const PanelSidebar = ({ onNavigate }: PanelSidebarProps) => {
  return (
    <aside className="w-[260px] shrink-0 h-full bg-[#f8f9fb] text-[#495057] border-r border-[#e9ecef] flex flex-col overflow-hidden">
      <div className="shrink-0 px-3 pt-4">
        <PanelAppSwitcher />
      </div>
      <div className="my-5 mx-3 border-t border-[#e9ecef]" />
      <div className="flex-1 overflow-y-auto pb-4">
        <PanelAppSection onNavigate={onNavigate} />
        <div className="my-5 mx-3 border-t border-[#e9ecef]" />
        <PanelBookmarksSection />
      </div>
    </aside>
  );
};

export default PanelSidebar;
