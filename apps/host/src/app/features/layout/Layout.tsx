import { Outlet } from 'react-router-dom';
import { App, ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';
import 'dayjs/locale/ko';
import { Minimize2 } from 'lucide-react';
import SubHeader, { SUB_HEADER_HEIGHT } from './SubHeader';
import TopHeader, { TOP_HEADER_HEIGHT } from './TopHeader';
import { antdTheme } from './config/antdTheme';
import { useLayoutStore } from './hooks/useLayoutStore';
import { useMenuPanelStore } from './hooks/useMenuPanelStore';
import MenuPanel from './panel/MenuPanel';
import PanelAppBadgeStrip from './panel/PanelAppBadgeStrip';

const TOTAL_HEADER_HEIGHT = TOP_HEADER_HEIGHT + SUB_HEADER_HEIGHT;

export function Layout() {
  const { chromeCollapsed, toggleChrome } = useLayoutStore();
  const pinned = useMenuPanelStore((s) => s.pinned);
  const topOffset = chromeCollapsed ? 0 : TOTAL_HEADER_HEIGHT;

  return (
    <ConfigProvider theme={antdTheme} locale={koKR} drawer={{ mask: { blur: false } }} modal={{ mask: { blur: false } }}>
      <div className="flex flex-col h-screen overflow-hidden">
        {!chromeCollapsed && (
          <>
            <TopHeader />
            <SubHeader />
          </>
        )}
        <App className="flex-1 min-h-0 w-full overflow-hidden">
          <div className="flex w-full h-full">
            {/* pinned=true면 strip을 메인 레이아웃에 합쳐 main 콘텐츠 폭이 자동으로 60px 줄어든다(오버레이 아님).
                패널이 열리면 panel 안의 strip이 동일 위치 fixed로 올라와 layout strip을 자연스럽게 덮는다. */}
            {pinned && <PanelAppBadgeStrip />}
            <main className="flex-1 min-w-0 h-full p-4 overflow-y-auto bg-[#f3f3f9]" style={{ scrollbarGutter: 'stable' }}>
              <Outlet />
            </main>
          </div>
        </App>
      </div>
      <MenuPanel topOffset={topOffset} />
      {chromeCollapsed && (
        <button
          type="button"
          onClick={toggleChrome}
          className="fixed top-2 right-3 z-50 inline-flex items-center justify-center size-8 rounded-md bg-white border border-[#e9ecef] text-[#495057] shadow-md hover:bg-[#f8f9fb] cursor-pointer transition-colors"
          aria-label="헤더 펼치기"
          title="헤더 펼치기"
        >
          <Minimize2 className="size-4" />
        </button>
      )}
    </ConfigProvider>
  );
}
