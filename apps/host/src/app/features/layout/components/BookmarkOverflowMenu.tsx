import { useNavigate } from 'react-router-dom';
import { Dropdown, type MenuProps } from 'antd';
import { ChevronDown } from 'lucide-react';
import { useMenuStore } from '@/shared-store';
import type { Bookmark } from '@/libs/shared-api/src/lib/types/navi.types';
import type { MenuConfig, MenuItem } from '@/libs/shared-store/src/types/menu.types';

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

interface BookmarkOverflowMenuProps {
  bookmarks: Bookmark[];
}

export default function BookmarkOverflowMenu({ bookmarks }: BookmarkOverflowMenuProps) {
  const navigate = useNavigate();
  const { menuConfigs } = useMenuStore();

  const items: MenuProps['items'] = bookmarks.map((bookmark) => {
    const path = findBookmarkPath(menuConfigs, bookmark);
    return {
      key: bookmark.menuKey,
      label: bookmark.label,
      disabled: !path,
      onClick: () => path && navigate(`/${bookmark.appId}/${path}`),
    };
  });

  if (bookmarks.length === 0) return null;

  return (
    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
      <button
        type="button"
        className="shrink-0 inline-flex items-center h-7 px-2 rounded text-xs text-white/85 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
        aria-label="더보기"
      >
        <span className="mr-1">+{bookmarks.length}</span>
        <ChevronDown className="size-3" />
      </button>
    </Dropdown>
  );
}
