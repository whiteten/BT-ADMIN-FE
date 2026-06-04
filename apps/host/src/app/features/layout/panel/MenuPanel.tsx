import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMenuStore } from '@/shared-store';
import PanelAppBadgeStrip from './PanelAppBadgeStrip';
import PanelDetail from './PanelDetail';
import PanelMega from './PanelMega';
import { hasActiveDescendant } from './PanelMenuPrimitives';
import PanelSidebar from './PanelSidebar';
import useCurrentRemote from '../../../hooks/useCurrentRemote';
import { useMenuPanelStore } from '../hooks/useMenuPanelStore';
import { cn } from '@/libs/shared-ui/src/lib/utils';

interface MenuPanelProps {
  /** 헤더 높이(2줄 합산) — 패널 top 위치 */
  topOffset: number;
}

const MenuPanel = ({ topOffset }: MenuPanelProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedRemote = useCurrentRemote();
  const { menuConfigs } = useMenuStore();
  const { open, mode, view, displayedAppId, activeMenuKey, setOpen, setMode, setView, setDisplayedAppId, setActiveMenuKey } = useMenuPanelStore();
  const panelRef = useRef<HTMLDivElement>(null);

  // 패널이 닫힐 때 mode·displayedAppId·activeMenuKey·view를 모두 default로 리셋.
  // 배경 클릭 / Esc / MenuButton 토글 / 라우트 이동 등 모든 close 경로가 setOpen(false)로 수렴하므로 이 한 곳에서 잔여 상태 정리.
  // mode를 'compact'로 되돌려 크게보기 후 닫았다 다시 열어도 항상 작게보기로 시작하게 한다.
  useEffect(() => {
    if (open) return;
    setMode('compact');
    setDisplayedAppId(null);
    setActiveMenuKey(null);
    setView('menu');
  }, [open, setMode, setDisplayedAppId, setActiveMenuKey, setView]);

  // 라우트 이동 시 패널 자동 close (위 close-reset useEffect가 나머지 상태 정리)
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search, setOpen]);

  // 패널이 열릴 때 displayedAppId를 현재 URL상 selectedRemote로 초기화하고,
  // URL이 속한 1단계 메뉴를 찾아 activeMenuKey도 함께 세팅 → detail이 곧바로 마지막 뎁스 메뉴를 표시.
  // pinned strip에서 다른 앱 뱃지를 클릭한 경우(handleAppClick)에는 setOpen(true)와 setDisplayedAppId(clicked)
  // 가 같은 사이클에 batch되므로, displayedAppId가 이미 설정돼 있으면 그 값을 우선 유지한다 — 안 그러면
  // selectedRemote로 덮어써져 첫 클릭 시 현재 URL의 앱 메뉴가 표시되는 문제가 발생한다.
  useEffect(() => {
    if (!open) return;
    const stored = useMenuPanelStore.getState().displayedAppId;
    const appId = stored ?? selectedRemote?.appId ?? null;
    if (appId !== stored) setDisplayedAppId(appId);
    const config = appId ? menuConfigs.find((c) => c.appId === appId) : undefined;
    // 표시할 앱 메뉴가 없으면(host 영역 등) 즐겨찾기 뷰로 자동 전환
    if (!appId || !config) {
      setView('favorite');
      return;
    }
    const matched = config.menus.find((m) => !m.hide && hasActiveDescendant(m, location, appId));
    if (matched) setActiveMenuKey(matched.menuKey);
  }, [open, selectedRemote?.appId, location, menuConfigs, setDisplayedAppId, setActiveMenuKey, setView]);

  // Esc 키 close
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, setOpen]);

  // document 레벨 outside-click — 패널 영역(panelRef) 밖이면 어디든 닫힘.
  // MenuButton은 자체 토글로 닫기를 처리하므로 outside 대상에서 제외 (그러지 않으면 listener가 먼저 닫고 MenuButton.onClick이 다시 열어버림).
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (target.closest('[data-menu-panel-trigger]')) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, setOpen]);

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
      // useEffect[location]가 close하지만, 같은 path로 재이동 시에도 닫히게 명시 호출
      setOpen(false);
    },
    [navigate, setOpen],
  );

  const isMega = mode === 'mega';
  const isFavoriteView = view === 'favorite';

  // 현재 activeMenuKey가 가리키는 1단계 메뉴(폴더라면 children 보유)
  const activeMenu = useMemo(() => {
    if (!activeMenuKey || !displayedAppId) return null;
    const config = menuConfigs.find((c) => c.appId === displayedAppId);
    return config?.menus.find((m) => m.menuKey === activeMenuKey) ?? null;
  }, [activeMenuKey, displayedAppId, menuConfigs]);

  // detail 영역 노출 여부 — 폴더가 활성일 때만, favorite view·mega는 항상 노출
  const hasFolderDetail = !!activeMenu?.children?.length;
  const showDetailArea = isMega || isFavoriteView || hasFolderDetail;

  // panel 폭: mega→viewport / favorite→560(strip+500) / 폴더 detail→820(strip+sidebar+500) / 그 외→320(strip+sidebar)
  const panelWidth = isMega ? 'w-screen' : isFavoriteView ? 'w-[560px]' : hasFolderDetail ? 'w-[820px]' : 'w-[320px]';

  return (
    <>
      {/* Backdrop — 시각 dim 전용. 클릭은 document-level outside-click 리스너에서 처리 */}
      <div
        className={cn('fixed inset-x-0 bottom-0 z-40 bg-black/30 transition-opacity duration-200', open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')}
        style={{ top: topOffset }}
        aria-hidden
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn('fixed left-0 z-40 bg-white shadow-2xl flex transition-[transform,width] duration-200', panelWidth, open ? 'translate-x-0' : '-translate-x-full')}
        style={{ top: topOffset, height: `calc(100vh - ${topOffset}px)` }}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        {!isMega && <PanelAppBadgeStrip />}
        {!isMega && <PanelSidebar onNavigate={handleNavigate} />}

        {/* Detail / Mega — 보일 게 있을 때만 렌더 (그 외엔 strip + sidebar만 표시) */}
        {showDetailArea && (
          <div className="flex-1 min-w-0 flex flex-col bg-white">
            <div className="flex-1 min-h-0 overflow-hidden">{isMega ? <PanelMega onNavigate={handleNavigate} /> : <PanelDetail onNavigate={handleNavigate} />}</div>
          </div>
        )}
      </div>
    </>
  );
};

export default MenuPanel;
