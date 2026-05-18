import { useNavigate } from 'react-router-dom';
import { Dropdown, type MenuProps } from 'antd';
import { ChevronDown } from 'lucide-react';
import { useMenuStore } from '@/shared-store';
import { findMenuInfo } from '../utils/findMenuInfo';
import { IconStar } from '@/components/custom/Icons';
import type { Favorite } from '@/libs/shared-api/src/lib/types/navi.types';

interface FavoriteOverflowMenuProps {
  favorites: Favorite[];
}

export default function FavoriteOverflowMenu({ favorites }: FavoriteOverflowMenuProps) {
  const navigate = useNavigate();
  const { menuConfigs } = useMenuStore();

  const items: MenuProps['items'] = favorites.map((favorite) => {
    const { path, appName, ancestors } = findMenuInfo(menuConfigs, favorite);
    const subLabel = [appName, ...ancestors.slice(0, -1)].filter(Boolean).join(' › ');
    return {
      key: favorite.menuKey,
      label: subLabel ? (
        <div className="flex flex-col leading-tight py-0.5">
          <span>{favorite.label}</span>
          <span className="text-xs text-[#adb5bd]">{subLabel}</span>
        </div>
      ) : (
        favorite.label
      ),
      // 모든 항목이 즐겨찾기이므로 메뉴별 아이콘 대신 별 아이콘으로 통일
      icon: <IconStar className="size-4 text-[var(--color-bt-primary)]" />,
      disabled: !path,
      onClick: () => path && navigate(`/${favorite.appId}/${path}`),
    };
  });

  if (favorites.length === 0) return null;

  return (
    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
      <button
        type="button"
        className="shrink-0 inline-flex items-center h-7 px-2 rounded text-xs text-white/85 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
        aria-label="더보기"
      >
        <span className="mr-1">+{favorites.length}</span>
        <ChevronDown className="size-3" />
      </button>
    </Dropdown>
  );
}
