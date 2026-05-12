import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PanelAppBadgeStrip from './PanelAppBadgeStrip';
import PanelDetail from './PanelDetail';
import PanelMega from './PanelMega';
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
  const { open, mode, setOpen, setDisplayedAppId, setActiveMenuKey } = useMenuPanelStore();

  // 라우트 이동 시 패널 자동 close
  useEffect(() => {
    setOpen(false);
    setActiveMenuKey(null);
  }, [location.pathname, location.search, setOpen, setActiveMenuKey]);

  // 패널이 열릴 때 displayedAppId를 현재 URL상 selectedRemote로 초기화
  useEffect(() => {
    if (!open) return;
    setDisplayedAppId(selectedRemote?.appId ?? null);
  }, [open, selectedRemote?.appId, setDisplayedAppId]);

  // Esc 키 close
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, setOpen]);

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
      // useEffect[location]가 close하지만, 같은 path로 재이동 시에도 닫히게 명시 호출
      setOpen(false);
    },
    [navigate, setOpen],
  );

  const handleClose = () => setOpen(false);

  const isMega = mode === 'mega';
  const panelWidth = isMega ? 'w-screen' : 'w-[820px]';

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn('fixed inset-x-0 bottom-0 z-40 bg-black/30 transition-opacity duration-200', open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')}
        style={{ top: topOffset }}
        onClick={handleClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className={cn('fixed left-0 z-40 bg-white shadow-2xl flex transition-transform duration-200', panelWidth, open ? 'translate-x-0' : '-translate-x-full')}
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
