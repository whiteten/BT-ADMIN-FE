import { type ComponentType, type SVGProps, useEffect, useRef } from 'react';
import { Pin, PinOff, SquareDashed } from 'lucide-react';
import { useMenuStore, useRemoteAvailabilityStore } from '@/shared-store';
import useCurrentRemote from '../../../hooks/useCurrentRemote';
import { APP_BADGE_STRIP_WIDTH } from '../constants/layoutConstants';
import { useMenuPanelStore } from '../hooks/useMenuPanelStore';
import {
  IconRemoteAoe,
  IconRemoteFca,
  IconRemoteInsight,
  IconRemoteIpron,
  IconRemoteIvr,
  IconRemoteManager,
  IconRemoteStt,
  IconRemoteTaskboard,
  IconRemoteVel,
  IconStar,
} from '@/components/custom/Icons';
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

// 앱별 뱃지 아이콘. 미등록 앱은 SquareDashed placeholder로 fallback.
const APP_BADGE_ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  manager: IconRemoteManager,
  fca: IconRemoteFca,
  ipron: IconRemoteIpron,
  stt: IconRemoteStt,
  aoe: IconRemoteAoe,
  vel: IconRemoteVel,
  insight: IconRemoteInsight,
  ivr: IconRemoteIvr,
  taskboard: IconRemoteTaskboard,
};

/**
 * 앱 뱃지 아이콘 리졸버 — 맵 + fallback을 한곳에서 관리.
 * strip 뱃지·사이드바 헤더 등 앱 아이콘이 필요한 모든 곳에서 이 함수를 사용한다.
 */
export const getAppBadgeIcon = (appId: string): ComponentType<SVGProps<SVGSVGElement>> => APP_BADGE_ICONS[appId] ?? SquareDashed;

/**
 * 패널 가장 왼쪽 컬럼(폭은 APP_BADGE_STRIP_WIDTH). 최상단 즐겨찾기 버튼 + 구분선 + remote 앱 뱃지 + 최하단 핀 토글로 구성.
 * - manager 앱은 항상 맨 하단(핀 위)에 배치하고, 그 위에 구분선을 둔다.
 *   단 즐겨찾기와 manager 사이에 다른 remote가 없으면 구분선은 하나만 노출한다.
 * - 앱 이름은 뱃지 하단에 상시 라벨로 노출(2줄 클램프, 잘림 없음). 툴팁 미사용 — 떠다니는 요소가 없어 메뉴 패널을 가리지 않는다.
 * - 뱃지 click → view='menu' 전환 + displayedAppId 갱신 + activeMenuKey 초기화 + 패널 open.
 * - 즐겨찾기 버튼 click → view='favorite' 전환 (사이드바를 즐겨찾기 목록으로 교체).
 * - 핀 토글 click → 패널이 닫혀도 strip이 메인 레이아웃 좌측에 상주(Layout이 pinned 구독).
 * - 스크롤: remote 뱃지 영역만 overflow-y-auto. 즐겨찾기는 상단 고정, 핀 토글은 하단 고정으로 스크롤 영역에서 제외.
 */
const PanelAppBadgeStrip = () => {
  const menuConfigs = useMenuStore((s) => s.menuConfigs);
  const availableRemotes = useRemoteAvailabilityStore((s) => s.availableRemotes);
  const selectedRemote = useCurrentRemote();
  const pinned = useMenuPanelStore((s) => s.pinned);
  const view = useMenuPanelStore((s) => s.view);
  const displayedAppId = useMenuPanelStore((s) => s.displayedAppId);
  const setOpen = useMenuPanelStore((s) => s.setOpen);
  const setMode = useMenuPanelStore((s) => s.setMode);
  const setView = useMenuPanelStore((s) => s.setView);
  const setDisplayedAppId = useMenuPanelStore((s) => s.setDisplayedAppId);
  const setActiveMenuKey = useMenuPanelStore((s) => s.setActiveMenuKey);
  const togglePinned = useMenuPanelStore((s) => s.togglePinned);

  // 활성(펼쳐진/현재) 앱 뱃지를 strip 스크롤 영역 안에서 보이도록 끌어온다.
  // view='menu'면 펼쳐진 앱(displayedAppId), 그 외(favorite 등)엔 현재 보고 있는 앱(URL) 기준.
  const scrollTargetAppId = view === 'menu' ? displayedAppId : (selectedRemote?.appId ?? null);
  const scrollTargetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollTargetRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [scrollTargetAppId]);

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

  // 뱃지 노출 조건 — 둘 다 충족해야 함:
  // 1) 메뉴(menuConfigs)에 등록됨 — 운영자가 메뉴로 노출을 끄면 숨김.
  // 2) 실제 기동(availableRemotes) — 미기동/Routes 로드 실패 시 숨겨 죽은 뱃지 방지.
  const remotes = menuConfigs.filter((m) => availableRemotes[m.appId] === true);

  // manager는 항상 맨 하단, 나머지 remote는 원래 순서 유지
  const managerRemote = remotes.find((r) => r.appId === 'manager');
  const otherRemotes = remotes.filter((r) => r.appId !== 'manager');

  const renderBadge = (remote: (typeof remotes)[number], index: number) => {
    // 빨간 점 인디케이터 — 현재 보고 있는 화면(URL)의 앱과 일치할 때 노출
    const isCurrentApp = remote.appId === selectedRemote?.appId;
    // 링(테두리) 강조 — 현재 메뉴 패널에 펼쳐진 앱(클릭한 뱃지)과 일치할 때 노출.
    // view='favorite'일 땐 어떤 앱도 펼쳐진 게 아니므로 표기하지 않는다. isCurrentApp(빨간 점)과는 의미가 별개.
    const isDisplayedApp = view === 'menu' && remote.appId === displayedAppId;
    const badgeColor = APP_BADGE_COLORS[index % APP_BADGE_COLORS.length];
    const Icon = getAppBadgeIcon(remote.appId);

    return (
      <div key={remote.appId} ref={remote.appId === scrollTargetAppId ? scrollTargetRef : undefined} className="group flex flex-col items-center gap-1 w-full px-0.5 shrink-0">
        <button
          type="button"
          onClick={() => handleAppClick(remote.appId)}
          aria-label={remote.appName}
          aria-current={isDisplayedApp ? 'true' : undefined}
          className={cn(
            'relative flex items-center justify-center size-9 shrink-0 rounded-lg text-white cursor-pointer shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5 transition-all',
            isDisplayedApp && 'ring-2 ring-[var(--color-bt-primary)] ring-offset-2 ring-offset-[#f8f9fb]',
          )}
          style={{ backgroundColor: badgeColor }}
        >
          <Icon className="size-6" />
          {isCurrentApp && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-red-500 ring-2 ring-[#f8f9fb]" />}
        </button>
        {/* 앱 이름 라벨 — 상시 노출, 2줄 클램프(잘림 없이 줄바꿈). 뱃지와 동일하게 클릭 시 메뉴 전환. */}
        <button
          type="button"
          onClick={() => handleAppClick(remote.appId)}
          aria-label={remote.appName}
          className={cn(
            'w-full text-center text-[10px] leading-[1.3] break-words [overflow-wrap:anywhere] [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden cursor-pointer transition-colors group-hover:text-[var(--color-bt-primary)]',
            isDisplayedApp ? 'text-[var(--color-bt-primary)] font-semibold' : 'text-[#495057]',
          )}
        >
          {remote.appName}
        </button>
      </div>
    );
  };

  const divider = <div className="w-7 border-t border-[#dee2e6] my-1 shrink-0" />;

  return (
    <aside
      style={{ width: APP_BADGE_STRIP_WIDTH }}
      className="shrink-0 h-full bg-[#f8f9fb] border-r border-[#ced4da] shadow-[1px_0_4px_-2px_rgba(0,0,0,0.06)] flex flex-col items-center py-4 relative z-10"
    >
      {/* 즐겨찾기 — 스크롤 영역과 분리해 상단 고정 */}
      <div className="group shrink-0 pb-2 flex flex-col items-center gap-1 w-full px-0.5">
        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-label="즐겨찾기"
          className="relative flex items-center justify-center size-9 shrink-0 rounded-lg text-white cursor-pointer shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5 transition-all"
          style={{ backgroundColor: '#F59E0B' }}
        >
          <IconStar className="size-6" />
        </button>
        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-label="즐겨찾기"
          className="w-full text-center text-[10px] leading-[1.3] text-[#868e96] cursor-pointer transition-colors group-hover:text-[var(--color-bt-primary)]"
        >
          즐겨찾기
        </button>
      </div>

      {/* 즐겨찾기와 스크롤 영역 사이 구분선 — 스크롤 영역 안에 두면 함께 스크롤되므로 형제로 분리 */}
      {(otherRemotes.length > 0 || managerRemote) && divider}

      {/* 스크롤 영역 — remote 뱃지들만. 즐겨찾기·핀 토글은 스크롤에서 제외. scrollbar-gutter:stable both-edges로 스크롤바 등장 시 아이콘 좌우 쏠림(레이아웃 shift) 방지. */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto flex flex-col items-center gap-2 py-2 [scrollbar-width:thin] [scrollbar-gutter:stable_both-edges]">
        {otherRemotes.map((remote, index) => renderBadge(remote, index))}

        {/* manager — 맨 하단(핀 위). 위에 다른 remote가 있을 때만 구분선 추가 (없으면 즐겨찾기 구분선 하나로 충분) */}
        {managerRemote && (
          <>
            {otherRemotes.length > 0 && divider}
            {renderBadge(managerRemote, otherRemotes.length)}
          </>
        )}
      </div>

      {/* 핀 토글 — strip footer. 앱 뱃지(컬러 사각형)와 혼동되지 않도록 ghost 아이콘 버튼 + 전체 폭 상단 구분선으로 "도구" 영역임을 표현. */}
      <div className="shrink-0 w-full pt-2.5 mt-2 border-t border-[#dee2e6] flex justify-center">
        <button
          type="button"
          onClick={togglePinned}
          aria-pressed={pinned}
          aria-label={pinned ? '메뉴 고정 해제' : '메뉴 고정'}
          className={cn(
            'flex items-center justify-center size-9 shrink-0 rounded-md cursor-pointer transition-colors',
            pinned
              ? 'text-[var(--color-bt-primary)] bg-[var(--color-bt-primary)]/10 hover:bg-[var(--color-bt-primary)]/15'
              : 'text-[#868e96] hover:text-[#495057] hover:bg-[#e9ecef]',
          )}
        >
          {pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
        </button>
      </div>
    </aside>
  );
};

export default PanelAppBadgeStrip;
