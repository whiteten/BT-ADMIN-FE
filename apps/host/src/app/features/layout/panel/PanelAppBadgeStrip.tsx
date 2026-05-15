import type { ComponentType, SVGProps } from 'react';
import { Bookmark, Settings, SquareDashed } from 'lucide-react';
import useRemoteSelector from '../../../hooks/useRemoteSelector';
import { useMenuPanelStore } from '../hooks/useMenuPanelStore';
import { IconRemoteFca, IconRemoteIpron } from '@/components/custom/Icons';
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

// 앱별 뱃지 아이콘.
const APP_BADGE_ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  manager: Settings,
  fca: IconRemoteFca,
  ipron: IconRemoteIpron,
};

/**
 * 패널 가장 왼쪽 60px 컬럼. 최상단 북마크 버튼 + 구분선 + remote 앱 뱃지로 구성.
 * - manager 앱은 항상 맨 하단에 배치하고, 그 위에 구분선을 둔다.
 *   단 북마크와 manager 사이에 다른 remote가 없으면 구분선은 하나만 노출한다.
 * - 뱃지 hover → 우측으로 늘어나며 앱 이름 노출 (strip 폭 60px는 유지, 뱃지가 사이드바 위로 오버레이)
 * - 뱃지 click → view='menu' 전환 + displayedAppId 갱신 + activeMenuKey 초기화
 * - 북마크 버튼 click → view='bookmark' 전환 (사이드바를 북마크 목록으로 교체)
 * - overflow-y-auto 미사용: 수평 hover 확장이 클리핑되지 않도록. remote 수가 매우 많아지면 portal 기반 label 재검토.
 */
const PanelAppBadgeStrip = () => {
  const { remotes } = useRemoteSelector();
  const view = useMenuPanelStore((s) => s.view);
  const displayedAppId = useMenuPanelStore((s) => s.displayedAppId);
  const setMode = useMenuPanelStore((s) => s.setMode);
  const setView = useMenuPanelStore((s) => s.setView);
  const setDisplayedAppId = useMenuPanelStore((s) => s.setDisplayedAppId);
  const setActiveMenuKey = useMenuPanelStore((s) => s.setActiveMenuKey);

  const handleAppClick = (appId: string) => {
    // 크게보기(mega) 상태였어도 compact로 접으면서 해당 앱 사이드바를 노출 (PanelMenuRow의 폴더 클릭과 동일 패턴)
    setMode('compact');
    setView('menu');
    setDisplayedAppId(appId);
    setActiveMenuKey(null);
  };

  const handleBookmarkClick = () => {
    // 크게보기(mega) 상태였어도 compact로 접으면서 북마크 화면을 노출
    setMode('compact');
    setView('bookmark');
    setActiveMenuKey(null);
  };

  const isBookmarkView = view === 'bookmark';

  // manager는 항상 맨 하단, 나머지 remote는 원래 순서 유지
  const managerRemote = remotes.find((r) => r.appId === 'manager');
  const otherRemotes = remotes.filter((r) => r.appId !== 'manager');

  const renderBadge = (remote: (typeof remotes)[number], index: number) => {
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
            'absolute top-0 left-0 z-20 flex items-center h-10 w-fit max-w-10 hover:max-w-[280px] rounded-lg text-white text-xs font-bold tracking-tight transition-[max-width] duration-200 cursor-pointer overflow-hidden shadow-sm hover:shadow-md',
            isDisplayed && 'ring-2 ring-[var(--color-bt-primary)]/40',
          )}
          style={{ backgroundColor: badgeColor }}
        >
          <span className="flex items-center justify-center size-10 shrink-0">
            <Icon className="size-5" />
          </span>
          <span className="shrink-0 pr-3 text-[13px] font-semibold whitespace-nowrap">{remote.appName}</span>
        </button>
      </div>
    );
  };

  const divider = <div className="w-7 border-t border-[#dee2e6] my-1 shrink-0" />;

  return (
    <aside className="w-[60px] shrink-0 h-full bg-[#f8f9fb] border-r border-[#ced4da] shadow-[1px_0_4px_-2px_rgba(0,0,0,0.06)] flex flex-col items-center gap-2.5 py-4 relative z-10">
      <div className="relative size-10 shrink-0">
        {isBookmarkView && <span className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-1 h-6 rounded-r bg-[var(--color-bt-primary)] z-10" />}
        <button
          type="button"
          onClick={handleBookmarkClick}
          className={cn(
            'absolute top-0 left-0 z-20 flex items-center h-10 w-fit max-w-10 hover:max-w-[280px] rounded-lg text-white text-xs font-bold tracking-tight transition-[max-width] duration-200 cursor-pointer overflow-hidden shadow-sm hover:shadow-md',
            isBookmarkView && 'ring-2 ring-[var(--color-bt-primary)]/40',
          )}
          style={{ backgroundColor: '#F59E0B' }}
        >
          <span className="flex items-center justify-center size-10 shrink-0">
            <Bookmark className="size-5" />
          </span>
          <span className="shrink-0 pr-3 text-[13px] font-semibold whitespace-nowrap">북마크</span>
        </button>
      </div>

      {/* 북마크 아래 구분선 — 아래에 뱃지가 하나라도 있을 때만 */}
      {(otherRemotes.length > 0 || managerRemote) && divider}

      {otherRemotes.map((remote, index) => renderBadge(remote, index))}

      {/* manager — 항상 맨 하단. 위에 다른 remote가 있을 때만 구분선 추가 (없으면 북마크 구분선 하나로 충분) */}
      {managerRemote && (
        <>
          {otherRemotes.length > 0 && divider}
          {renderBadge(managerRemote, otherRemotes.length)}
        </>
      )}
    </aside>
  );
};

export default PanelAppBadgeStrip;
