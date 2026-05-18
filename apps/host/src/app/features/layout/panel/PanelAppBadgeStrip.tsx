import type { ComponentType, SVGProps } from 'react';
import { Tooltip } from 'antd';
import { Pin, PinOff, Settings, SquareDashed } from 'lucide-react';
import { useMenuStore } from '@/shared-store';
import useCurrentRemote from '../../../hooks/useCurrentRemote';
import { useMenuPanelStore } from '../hooks/useMenuPanelStore';
import { IconRemoteFca, IconRemoteIpron, IconStar } from '@/components/custom/Icons';
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
 * 패널 가장 왼쪽 60px 컬럼. 최상단 즐겨찾기 버튼 + 구분선 + remote 앱 뱃지 + 최하단 핀 토글로 구성.
 * - manager 앱은 항상 맨 하단(핀 위)에 배치하고, 그 위에 구분선을 둔다.
 *   단 즐겨찾기와 manager 사이에 다른 remote가 없으면 구분선은 하나만 노출한다.
 * - 뱃지 hover → antd Tooltip(placement=right)으로 앱 이름 노출. Tooltip은 portal 렌더라 strip 스크롤 박스 바깥에 그려진다.
 * - 뱃지 click → view='menu' 전환 + displayedAppId 갱신 + activeMenuKey 초기화 + 패널 open.
 * - 즐겨찾기 버튼 click → view='favorite' 전환 (사이드바를 즐겨찾기 목록으로 교체).
 * - 핀 토글 click → 패널이 닫혀도 strip이 메인 레이아웃 좌측에 상주(Layout이 pinned 구독).
 * - 스크롤: remote 뱃지 영역만 overflow-y-auto. 즐겨찾기는 상단 고정, 핀 토글은 하단 고정으로 스크롤 영역에서 제외.
 */
const PanelAppBadgeStrip = () => {
  const remotes = useMenuStore((s) => s.menuConfigs);
  const selectedRemote = useCurrentRemote();
  const pinned = useMenuPanelStore((s) => s.pinned);
  const setOpen = useMenuPanelStore((s) => s.setOpen);
  const setMode = useMenuPanelStore((s) => s.setMode);
  const setView = useMenuPanelStore((s) => s.setView);
  const setDisplayedAppId = useMenuPanelStore((s) => s.setDisplayedAppId);
  const setActiveMenuKey = useMenuPanelStore((s) => s.setActiveMenuKey);
  const togglePinned = useMenuPanelStore((s) => s.togglePinned);

  const handleAppClick = (appId: string) => {
    // 크게보기(mega) 상태였어도 compact로 접으면서 해당 앱 사이드바를 노출 (PanelMenuRow의 폴더 클릭과 동일 패턴)
    // pinned로 layout에 노출된 strip에서 클릭한 경우엔 패널이 닫혀있을 수 있으므로 함께 open.
    setOpen(true);
    setMode('compact');
    setView('menu');
    setDisplayedAppId(appId);
    setActiveMenuKey(null);
  };

  const handleFavoriteClick = () => {
    // 크게보기(mega) 상태였어도 compact로 접으면서 즐겨찾기 화면을 노출
    // pinned로 layout에 노출된 strip에서 클릭한 경우엔 패널이 닫혀있을 수 있으므로 함께 open.
    setOpen(true);
    setMode('compact');
    setView('favorite');
    setActiveMenuKey(null);
  };

  // manager는 항상 맨 하단, 나머지 remote는 원래 순서 유지
  const managerRemote = remotes.find((r) => r.appId === 'manager');
  const otherRemotes = remotes.filter((r) => r.appId !== 'manager');

  const renderBadge = (remote: (typeof remotes)[number], index: number) => {
    // 빨간 점 인디케이터 — 현재 보고 있는 화면(URL)의 앱과 일치할 때 노출
    const isCurrentApp = remote.appId === selectedRemote?.appId;
    const badgeColor = APP_BADGE_COLORS[index % APP_BADGE_COLORS.length];
    const Icon = APP_BADGE_ICONS[remote.appId] ?? SquareDashed;

    return (
      <Tooltip key={remote.appId} title={remote.appName} placement="right">
        <button
          type="button"
          onClick={() => handleAppClick(remote.appId)}
          aria-label={remote.appName}
          className="relative flex items-center justify-center size-10 shrink-0 rounded-lg text-white cursor-pointer shadow-sm hover:shadow-md transition-shadow"
          style={{ backgroundColor: badgeColor }}
        >
          <Icon className="size-5" />
          {isCurrentApp && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-red-500 ring-2 ring-[#f8f9fb]" />}
        </button>
      </Tooltip>
    );
  };

  const divider = <div className="w-7 border-t border-[#dee2e6] my-1 shrink-0" />;

  return (
    <aside className="w-[60px] shrink-0 h-full bg-[#f8f9fb] border-r border-[#ced4da] shadow-[1px_0_4px_-2px_rgba(0,0,0,0.06)] flex flex-col items-center py-4 relative z-10">
      {/* 즐겨찾기 — 스크롤 영역과 분리해 상단 고정 */}
      <div className="shrink-0">
        <Tooltip title="즐겨찾기" placement="right">
          <button
            type="button"
            onClick={handleFavoriteClick}
            aria-label="즐겨찾기"
            className="relative flex items-center justify-center size-10 shrink-0 rounded-lg text-white cursor-pointer shadow-sm hover:shadow-md transition-shadow"
            style={{ backgroundColor: '#F59E0B' }}
          >
            <IconStar className="size-5" />
          </button>
        </Tooltip>
      </div>

      {/* 즐겨찾기와 스크롤 영역 사이 구분선 — 스크롤 영역 안에 두면 함께 스크롤되므로 형제로 분리 */}
      {(otherRemotes.length > 0 || managerRemote) && divider}

      {/* 스크롤 영역 — remote 뱃지들만. 즐겨찾기·핀 토글은 스크롤에서 제외. py-1.5는 뱃지 우상단 빨간 점(노치)이 스크롤 박스 모서리에 잘리지 않도록 한 여유. */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto flex flex-col items-center gap-2.5 py-1.5 [scrollbar-width:thin]">
        {otherRemotes.map((remote, index) => renderBadge(remote, index))}

        {/* manager — 맨 하단(핀 위). 위에 다른 remote가 있을 때만 구분선 추가 (없으면 즐겨찾기 구분선 하나로 충분) */}
        {managerRemote && (
          <>
            {otherRemotes.length > 0 && divider}
            {renderBadge(managerRemote, otherRemotes.length)}
          </>
        )}
      </div>

      {/* 핀 토글 — 스크롤 영역과 분리해 하단 고정. 켜면 패널이 닫혀도 strip이 메인 레이아웃에 남는다. */}
      <div className="shrink-0 pt-2.5">
        <Tooltip title={pinned ? '메뉴 고정 해제' : '메뉴 고정'} placement="right">
          <button
            type="button"
            onClick={togglePinned}
            aria-pressed={pinned}
            aria-label={pinned ? '메뉴 고정 해제' : '메뉴 고정'}
            className={cn(
              'flex items-center justify-center size-10 shrink-0 rounded-lg text-white cursor-pointer shadow-sm hover:shadow-md transition-shadow',
              pinned ? 'bg-[#475569] ring-2 ring-[var(--color-bt-primary)]/40' : 'bg-[#adb5bd]',
            )}
          >
            {pinned ? <PinOff className="size-5" /> : <Pin className="size-5" />}
          </button>
        </Tooltip>
      </div>
    </aside>
  );
};

export default PanelAppBadgeStrip;
