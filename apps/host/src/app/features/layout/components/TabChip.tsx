import { type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { type OpenTab, useMenuStore, useOpenTabsStore } from '@/shared-store';
import TabContextMenuContent from './TabContextMenuContent';
import { resolveBreadcrumbTitles } from '../utils/openTabs';
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TabChipProps {
  tab: OpenTab;
  isActive: boolean;
  /** 드래그 중에는 툴팁을 끈다(잔상 방지). */
  disableTooltip?: boolean;
}

export default function TabChip({ tab, isActive, disableTooltip }: TabChipProps) {
  const navigate = useNavigate();
  const activateTab = useOpenTabsStore((s) => s.activateTab);
  const closeTab = useOpenTabsStore((s) => s.closeTab);
  const snapshot = useOpenTabsStore((s) => s.breadcrumbsById[tab.id]);
  const appName = useMenuStore((s) => s.menuConfigs.find((c) => c.appId === tab.appId)?.appName);

  const handleActivate = () => {
    activateTab(tab.id);
    navigate(tab.url);
  };

  const handleClose = (e: MouseEvent) => {
    e.stopPropagation();
    const { nextPath } = closeTab(tab.id);
    if (nextPath) navigate(nextPath);
  };

  // 즐겨찾기와 동일하게 `appName › 카테고리 › leaf` 경로를 툴팁으로 표시. breadcrumb 스냅샷이 있으면 그 경로,
  // 없으면(아직 미해석) appName › 현재 라벨로 폴백.
  const titles = resolveBreadcrumbTitles(snapshot?.items, snapshot?.params);
  const tooltipText = (titles.length > 0 ? [appName, ...titles] : [appName, tab.label]).filter(Boolean).join(' › ');

  const chip = (
    <div
      className={cn(
        'group shrink-0 inline-flex items-center h-7 pl-2.5 pr-1 text-sm whitespace-nowrap transition-colors',
        // 활성 표시는 하단 보더 — 기본은 투명 보더로 두어 전환 시 레이아웃 흔들림 방지
        'border-b-2 border-transparent',
        isActive ? 'border-white text-white font-semibold' : 'text-white/85 hover:border-white/40 hover:text-white',
      )}
    >
      <button
        type="button"
        onClick={handleActivate}
        className={cn(
          'max-w-[180px] truncate cursor-pointer',
          // 라벨 출처 구분 — isDynamic: 데이터발(상세 이름)은 이탤릭으로 메뉴발 고정 라벨과 구별.
          // pr-0.5: 이탤릭 글리프가 오른쪽으로 기울어 truncate 박스 밖으로 잘리는 것 방지(꼬리 여백).
          tab.isDynamic && 'italic pr-0.5',
        )}
      >
        {tab.label}
      </button>
      <button
        type="button"
        onClick={handleClose}
        aria-label="탭 닫기"
        className="ml-1 inline-flex items-center justify-center size-4 rounded-sm text-white/50 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
      >
        <X className="size-3" />
      </button>
    </div>
  );

  // ContextMenuTrigger·TooltipTrigger를 asChild로 같은 chip DOM에 중첩 적용(둘 다 radix). 드래그 중엔 툴팁 생략.
  const showTooltip = !disableTooltip && !!tooltipText;

  return (
    <ContextMenu>
      {showTooltip ? (
        <Tooltip>
          <ContextMenuTrigger asChild>
            <TooltipTrigger asChild>{chip}</TooltipTrigger>
          </ContextMenuTrigger>
          <TooltipContent side="bottom" sideOffset={2}>
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      ) : (
        <ContextMenuTrigger asChild>{chip}</ContextMenuTrigger>
      )}
      <TabContextMenuContent tabId={tab.id} />
    </ContextMenu>
  );
}
