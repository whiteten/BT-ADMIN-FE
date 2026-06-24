import { useLocation, useNavigate } from 'react-router-dom';
import { useMenuStore, useRemoteAvailabilityStore } from '@/shared-store';
import { isMenuActive } from '../panel/PanelMenuPrimitives';
import { findMenuInfo } from '../utils/findMenuInfo';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Favorite } from '@/libs/shared-api/src/lib/types/navi.types';
import { cn } from '@/libs/shared-ui/src/lib/utils';

interface FavoriteChipProps {
  favorite: Favorite;
  className?: string;
  disableTooltip?: boolean;
}

export default function FavoriteChip({ favorite, className, disableTooltip }: FavoriteChipProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { menuConfigs } = useMenuStore();
  const isAvailable = useRemoteAvailabilityStore((s) => s.availableRemotes[favorite.appId] === true);
  const { path, appName, ancestors } = findMenuInfo(menuConfigs, favorite);
  // 클릭 가능 = 경로 있음 + remote 기동. 미기동이면 disabled로 비활성.
  const isDisabled = !path || !isAvailable;
  const isActive = !isDisabled && path ? isMenuActive(path, location, favorite.appId) : false;
  const tooltipText = [appName, ...ancestors].filter(Boolean).join(' › ');

  const handleClick = () => {
    if (isDisabled) return;
    navigate(`/${favorite.appId}/${path}`);
  };

  const buttonEl = (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={cn(
        'shrink-0 inline-flex items-center h-7 px-2.5 text-sm whitespace-nowrap transition-colors cursor-pointer',
        // 하이라이트는 하단 보더로 표현 — 기본은 투명 보더로 두어 상태 전환 시 레이아웃 흔들림 방지
        'border-b-2 border-transparent text-white/85 hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50',
        isActive && 'border-white text-white font-semibold',
        className,
      )}
    >
      {favorite.label}
    </button>
  );

  if (disableTooltip || !tooltipText) return buttonEl;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{buttonEl}</TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={2}>
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
}
