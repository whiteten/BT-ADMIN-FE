import { Bookmark, Bot, ClipboardList, Gauge, Headphones, LayoutDashboard, type LucideIcon, Mic, PhoneCall, Settings, Sparkles, SquareDashed } from 'lucide-react';
import useRemoteSelector from '../../../hooks/useRemoteSelector';
import { useMenuPanelStore } from '../hooks/useMenuPanelStore';
import { cn } from '@/libs/shared-ui/src/lib/utils';

const APP_BADGE_COLORS = [
  '#DC2626', // red
  '#7C3AED', // violet
  '#0891B2', // cyan
  '#CA8A04', // yellow
  '#16A34A', // green
  '#EA580C', // orange
  '#2563EB', // blue
  '#475569', // slate
  '#DB2777', // pink
  '#B45309', // brown
];

// 앱별 뱃지 아이콘. 임시 매핑이며 추후 메뉴 API 확장 또는 별도 설정으로 이동 예정.
const APP_BADGE_ICONS: Record<string, LucideIcon> = {
  taskboard: ClipboardList,
  sd: LayoutDashboard,
  stt: Mic,
  manager: Settings,
  ivr: Headphones,
  fca: Bot,
  ipron: PhoneCall,
  dashboard: Gauge,
  aoe: Sparkles,
};

/**
 * 패널 가장 왼쪽 60px 컬럼. 최상단 북마크 버튼 + 구분선 + 모든 remote 앱 뱃지로 구성.
 * - 뱃지 hover → 우측으로 늘어나며 앱 이름 노출 (strip 폭 60px는 유지, 뱃지가 사이드바 위로 오버레이)
 * - 뱃지 click → view='menu' 전환 + displayedAppId 갱신 + activeMenuKey 초기화
 * - 북마크 버튼 click → view='bookmark' 전환 (사이드바를 북마크 목록으로 교체)
 * - overflow-y-auto 미사용: 수평 hover 확장이 클리핑되지 않도록. remote 수가 매우 많아지면 portal 기반 label 재검토.
 */
const PanelAppBadgeStrip = () => {
  const { remotes } = useRemoteSelector();
  const view = useMenuPanelStore((s) => s.view);
  const displayedAppId = useMenuPanelStore((s) => s.displayedAppId);
  const setView = useMenuPanelStore((s) => s.setView);
  const setDisplayedAppId = useMenuPanelStore((s) => s.setDisplayedAppId);
  const setActiveMenuKey = useMenuPanelStore((s) => s.setActiveMenuKey);

  const handleAppClick = (appId: string) => {
    setView('menu');
    setDisplayedAppId(appId);
    setActiveMenuKey(null);
  };

  const handleBookmarkClick = () => {
    setView('bookmark');
    setActiveMenuKey(null);
  };

  const isBookmarkView = view === 'bookmark';

  return (
    <aside className="w-[60px] shrink-0 h-full bg-[#f8f9fb] border-r border-[#ced4da] shadow-[1px_0_4px_-2px_rgba(0,0,0,0.06)] flex flex-col items-center gap-2 py-4 relative z-10">
      <div className="relative size-9 shrink-0">
        {isBookmarkView && <span className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-1 h-6 rounded-r bg-[var(--color-bt-primary)] z-10" />}
        <button
          type="button"
          onClick={handleBookmarkClick}
          className={cn(
            'absolute top-0 left-0 z-20 flex items-center h-9 w-fit max-w-9 hover:max-w-[280px] rounded-lg text-white text-xs font-bold tracking-tight transition-[max-width] duration-200 cursor-pointer overflow-hidden shadow-sm hover:shadow-md',
            isBookmarkView && 'ring-2 ring-[var(--color-bt-primary)]/40',
          )}
          style={{ backgroundColor: '#F59E0B' }}
        >
          <span className="flex items-center justify-center size-9 shrink-0">
            <Bookmark className="size-[18px]" />
          </span>
          <span className="shrink-0 pr-3 text-[13px] font-semibold whitespace-nowrap">북마크</span>
        </button>
      </div>

      <div className="w-7 border-t border-[#dee2e6] my-1 shrink-0" />

      {remotes.map((remote, index) => {
        const isDisplayed = !isBookmarkView && remote.appId === displayedAppId;
        const badgeColor = APP_BADGE_COLORS[index % APP_BADGE_COLORS.length];
        const Icon = APP_BADGE_ICONS[remote.appId] ?? SquareDashed;

        return (
          <div key={remote.appId} className="relative size-9 shrink-0">
            {isDisplayed && <span className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-1 h-6 rounded-r bg-[var(--color-bt-primary)] z-10" />}
            <button
              type="button"
              onClick={() => handleAppClick(remote.appId)}
              className={cn(
                'absolute top-0 left-0 z-20 flex items-center h-9 w-fit max-w-9 hover:max-w-[280px] rounded-lg text-white text-xs font-bold tracking-tight transition-[max-width] duration-200 cursor-pointer overflow-hidden shadow-sm hover:shadow-md',
                isDisplayed && 'ring-2 ring-[var(--color-bt-primary)]/40',
              )}
              style={{ backgroundColor: badgeColor }}
            >
              <span className="flex items-center justify-center size-9 shrink-0">
                <Icon className="size-[18px]" />
              </span>
              <span className="shrink-0 pr-3 text-[13px] font-semibold whitespace-nowrap">{remote.appName}</span>
            </button>
          </div>
        );
      })}
    </aside>
  );
};

export default PanelAppBadgeStrip;
