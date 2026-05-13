import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMenuStore } from '@/shared-store';
import PanelAppBadgeStrip from './PanelAppBadgeStrip';
import PanelDetail from './PanelDetail';
import PanelMega from './PanelMega';
import { hasActiveDescendant } from './PanelMenuPrimitives';
import PanelSidebar from './PanelSidebar';
import useRemoteSelector from '../../../hooks/useRemoteSelector';
import { useMenuPanelStore } from '../hooks/useMenuPanelStore';
import { cn } from '@/libs/shared-ui/src/lib/utils';

interface MenuPanelProps {
  /** 헤더 높이(2줄 합산) — 패널 top 위치 */
  topOffset: number;
}

const MenuPanel = ({ topOffset }: MenuPanelProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedRemote } = useRemoteSelector();
  const { menuConfigs } = useMenuStore();
  const { open, mode, view, setOpen, setView, setDisplayedAppId, setActiveMenuKey } = useMenuPanelStore();
  const panelRef = useRef<HTMLDivElement>(null);

  // 패널이 닫힐 때 displayedAppId·activeMenuKey·view를 모두 default로 리셋.
  // 배경 클릭 / Esc / MenuButton 토글 / 라우트 이동 등 모든 close 경로가 setOpen(false)로 수렴하므로 이 한 곳에서 잔여 상태 정리.
  useEffect(() => {
    if (open) return;
    setDisplayedAppId(null);
    setActiveMenuKey(null);
    setView('menu');
  }, [open, setDisplayedAppId, setActiveMenuKey, setView]);

  // 라우트 이동 시 패널 자동 close (위 close-reset useEffect가 나머지 상태 정리)
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search, setOpen]);

  // 패널이 열릴 때 displayedAppId를 현재 URL상 selectedRemote로 초기화하고,
  // URL이 속한 1단계 메뉴를 찾아 activeMenuKey도 함께 세팅 → detail이 곧바로 마지막 뎁스 메뉴를 표시
  useEffect(() => {
    if (!open) return;
    const appId = selectedRemote?.appId ?? null;
    setDisplayedAppId(appId);
    if (!appId) return;
    const config = menuConfigs.find((c) => c.appId === appId);
    if (!config) return;
    const matched = config.menus.find((m) => !m.hide && hasActiveDescendant(m, location, appId));
    if (matched) setActiveMenuKey(matched.menuKey);
  }, [open, selectedRemote?.appId, location, menuConfigs, setDisplayedAppId, setActiveMenuKey]);

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
  const isBookmarkView = view === 'bookmark';
  // bookmark view는 sidebar(260px)가 없으므로 panel을 그만큼 줄여 detail 폭을 menu view의 last-depth 영역(500px)과 동일하게 맞춤
  const panelWidth = isMega ? 'w-screen' : isBookmarkView ? 'w-[560px]' : 'w-[820px]';

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
        <PanelAppBadgeStrip />
        <PanelSidebar onNavigate={handleNavigate} />

        {/* Detail / Mega */}
        <div className="flex-1 min-w-0 flex flex-col bg-white">
          <div className="flex-1 min-h-0 overflow-hidden">{isMega ? <PanelMega onNavigate={handleNavigate} /> : <PanelDetail onNavigate={handleNavigate} />}</div>
        </div>
      </div>
    </>
  );
};

export default MenuPanel;
