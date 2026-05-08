import { useLocation, useNavigate } from 'react-router-dom';
import { useMenuStore } from '@/shared-store';
import { isMenuActive } from '../panel/PanelMenuPrimitives';
import type { Bookmark } from '@/libs/shared-api/src/lib/types/navi.types';
import type { MenuConfig, MenuItem } from '@/libs/shared-store/src/types/menu.types';
import { cn } from '@/libs/shared-ui/src/lib/utils';

const findMenuItemRecursive = (item: MenuItem, menuKey: string): { path?: string } | null => {
  if (item.menuKey === menuKey) return { path: item.path };
  if (item.children) {
    for (const child of item.children) {
      const result = findMenuItemRecursive(child, menuKey);
      if (result) return result;
    }
  }
  return null;
};

const findBookmarkPath = (menuConfigs: MenuConfig[], bookmark: Bookmark): string | undefined => {
  for (const config of menuConfigs) {
    if (config.appId !== bookmark.appId) continue;
    for (const menu of config.menus) {
      const result = findMenuItemRecursive(menu, bookmark.menuKey);
      if (result) return result.path;
    }
  }
  return undefined;
};

interface BookmarkChipProps {
  bookmark: Bookmark;
  className?: string;
}

export default function BookmarkChip({ bookmark, className }: BookmarkChipProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { menuConfigs } = useMenuStore();
  const path = findBookmarkPath(menuConfigs, bookmark);
  const isActive = path ? isMenuActive(path, location, bookmark.appId) : false;

  const handleClick = () => {
    if (!path) return;
    navigate(`/${bookmark.appId}/${path}`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!path}
      className={cn(
        'shrink-0 inline-flex items-center h-7 px-2.5 rounded text-xs whitespace-nowrap transition-colors cursor-pointer',
        'text-white/85 hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50',
        isActive && 'bg-white/20 text-white font-semibold',
        className,
      )}
      title={bookmark.label}
    >
      {bookmark.label}
    </button>
  );
}
