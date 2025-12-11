import AppSelector from '../../components/AppSelector';
import SidebarTriggerCustom from '../../components/SidebarTriggerCustom';
import Sitemap from '../../components/Sitemap';
import UserMenuSelector from '../../components/UserMenuSelector';
import { Separator } from '@/components/ui/separator';

export default function InsetHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2">
      <div className="flex items-center gap-2 px-4 w-full justify-between">
        <div className="flex items-center gap-2">
          <SidebarTriggerCustom className="-ml-1" />
        </div>
        <div className="flex items-center gap-2">
          <AppSelector />
          <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
          <Sitemap />
          <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
          <UserMenuSelector />
        </div>
      </div>
    </header>
  );
}
