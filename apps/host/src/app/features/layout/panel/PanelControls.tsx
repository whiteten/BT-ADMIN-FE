import { Maximize2, Minimize2, X } from 'lucide-react';
import { useMenuPanelStore } from '../hooks/useMenuPanelStore';
import { Button } from '@/components/ui/button';

const PanelControls = () => {
  const { mode, toggleMode, setOpen } = useMenuPanelStore();
  const isMega = mode === 'mega';

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-3 text-xs text-[#495057] bg-white border border-[#dee2e6] hover:bg-[#f1f3f5] hover:text-[#212529] hover:border-[#ced4da] cursor-pointer"
        onClick={toggleMode}
        aria-label={isMega ? '작게보기' : '크게보기'}
      >
        {isMega ? <Minimize2 className="size-4 mr-1" /> : <Maximize2 className="size-4 mr-1" />}
        {isMega ? '작게보기' : '크게보기'}
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="size-8 text-[#495057] bg-white border border-[#dee2e6] hover:bg-[#f1f3f5] hover:text-[#212529] hover:border-[#ced4da] cursor-pointer"
        onClick={() => setOpen(false)}
        aria-label="패널 닫기"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
};

export default PanelControls;
