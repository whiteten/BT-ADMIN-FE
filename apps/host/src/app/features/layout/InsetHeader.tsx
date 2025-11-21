import AppSelector from '../../components/AppSelector';
import FavoriteMenuSelector from '../../components/FavoriteMenuSelector';
import Sitemap from '../../components/Sitemap';
import UserMenuSelector from '../../components/UserMenuSelector';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function InsetHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2">
      <div className="flex items-center gap-2 px-4 w-full justify-between">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
          <AppSelector />
          <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
          <FavoriteMenuSelector />
          <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
          <Sitemap />
        </div>
        <div className="flex items-center gap-2">
          <Separator orientation="vertical" className="data-[orientation=vertical]:h-6" />
          <UserMenuSelector />
        </div>
      </div>
    </header>
  );
}
