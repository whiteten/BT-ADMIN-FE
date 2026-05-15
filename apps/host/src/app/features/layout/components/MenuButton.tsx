import { Menu, X } from 'lucide-react';
import { useMenuPanelStore } from '../hooks/useMenuPanelStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/libs/shared-ui/src/lib/utils';

export default function MenuButton({ className }: { className?: string }) {
  const { open, togglePanel } = useMenuPanelStore();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      data-menu-panel-trigger
      className={cn('h-7 px-3 gap-2 font-semibold text-sm rounded-md', 'text-white hover:bg-white/10 hover:text-white', open && 'bg-white/10', className)}
      onClick={togglePanel}
      aria-expanded={open}
      aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
    >
      {open ? <X className="size-4" /> : <Menu className="size-4" />}
      <span>Menu</span>
    </Button>
  );
}
