import { useNavigate } from 'react-router-dom';
import { Dropdown, type MenuProps } from 'antd';
import { ChevronDown, SquareDashed } from 'lucide-react';
import { useMenuStore } from '@/shared-store';
import { findMenuInfo } from '../utils/findMenuInfo';
import type { Bookmark } from '@/libs/shared-api/src/lib/types/navi.types';

interface BookmarkOverflowMenuProps {
  bookmarks: Bookmark[];
}

export default function BookmarkOverflowMenu({ bookmarks }: BookmarkOverflowMenuProps) {
  const navigate = useNavigate();
  const { menuConfigs } = useMenuStore();

  const items: MenuProps['items'] = bookmarks.map((bookmark) => {
    const { icon: Icon, path, appName, ancestors } = findMenuInfo(menuConfigs, bookmark);
    const subLabel = [appName, ...ancestors.slice(0, -1)].filter(Boolean).join(' › ');
    return {
      key: bookmark.menuKey,
      label: subLabel ? (
        <div className="flex flex-col leading-tight py-0.5">
          <span>{bookmark.label}</span>
          <span className="text-xs text-[#adb5bd]">{subLabel}</span>
        </div>
      ) : (
        bookmark.label
      ),
      icon: Icon ? <Icon className="size-4" /> : <SquareDashed className="size-4" />,
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
