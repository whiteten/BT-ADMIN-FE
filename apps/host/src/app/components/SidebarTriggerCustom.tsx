import { ReactComponent as IconSidebarLeft } from '../../assets/images/icon/icon-collapse-left.svg';
import { ReactComponent as IconSidebarRight } from '../../assets/images/icon/icon-collapse-right.svg';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/libs/shared-ui/src/lib/utils';

export default function SidebarTriggerCustom({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar, open } = useSidebar();

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn('size-7', className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      {open ? <IconSidebarLeft className="size-6" /> : <IconSidebarRight className="size-6" />}
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}
