import { useNavigate } from 'react-router-dom';
import { Dropdown, type MenuProps } from 'antd';
import { ChevronDown } from 'lucide-react';
import { useMenuStore } from '@/shared-store';
import { ReactComponent as IconBookmark } from '../../../../assets/images/icon/icon-bookmark.svg';
import { findMenuInfo } from '../utils/findMenuInfo';
import type { Bookmark } from '@/libs/shared-api/src/lib/types/navi.types';

interface BookmarkOverflowMenuProps {
  bookmarks: Bookmark[];
}

export default function BookmarkOverflowMenu({ bookmarks }: BookmarkOverflowMenuProps) {
  const navigate = useNavigate();
  const { menuConfigs } = useMenuStore();

  const items: MenuProps['items'] = bookmarks.map((bookmark) => {
    const { path, appName, ancestors } = findMenuInfo(menuConfigs, bookmark);
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
      // 모든 항목이 북마크이므로 메뉴별 아이콘 대신 북마크 아이콘으로 통일
      icon: <IconBookmark className="size-4 text-[var(--color-bt-primary)]" />,
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
