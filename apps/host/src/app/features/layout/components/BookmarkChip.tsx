import { useLocation, useNavigate } from 'react-router-dom';
import { SquareDashed } from 'lucide-react';
import { useMenuStore } from '@/shared-store';
import { isMenuActive } from '../panel/PanelMenuPrimitives';
import { findMenuInfo } from '../utils/findMenuInfo';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Bookmark } from '@/libs/shared-api/src/lib/types/navi.types';
import { cn } from '@/libs/shared-ui/src/lib/utils';

interface BookmarkChipProps {
  bookmark: Bookmark;
  className?: string;
  disableTooltip?: boolean;
}

export default function BookmarkChip({ bookmark, className, disableTooltip }: BookmarkChipProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { menuConfigs } = useMenuStore();
  const { icon: Icon, path, appName, ancestors } = findMenuInfo(menuConfigs, bookmark);
  const isActive = path ? isMenuActive(path, location, bookmark.appId) : false;
  const tooltipText = [appName, ...ancestors].filter(Boolean).join(' › ');

  const handleClick = () => {
    if (!path) return;
    navigate(`/${bookmark.appId}/${path}`);
  };

  const buttonEl = (
    <button
      type="button"
      onClick={handleClick}
      disabled={!path}
      className={cn(
        'shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 text-sm whitespace-nowrap transition-colors cursor-pointer',
        // 하이라이트는 하단 보더로 표현 — 기본은 투명 보더로 두어 상태 전환 시 레이아웃 흔들림 방지
        'border-b-2 border-transparent text-white/85 hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50',
        isActive && 'border-white text-white font-semibold',
        className,
      )}
    >
      {Icon ? <Icon className="size-4 shrink-0" /> : <SquareDashed className="size-4 shrink-0" />}
      {bookmark.label}
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
