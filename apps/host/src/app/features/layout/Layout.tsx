import { Outlet } from 'react-router-dom';
import { App, ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';
import 'dayjs/locale/ko';
import { Minimize2 } from 'lucide-react';
import SubHeader, { SUB_HEADER_HEIGHT } from './SubHeader';
import TopHeader, { TOP_HEADER_HEIGHT } from './TopHeader';
import { antdTheme } from './config/antdTheme';
import { useLayoutStore } from './hooks/useLayoutStore';
import MenuPanel from './panel/MenuPanel';

const TOTAL_HEADER_HEIGHT = TOP_HEADER_HEIGHT + SUB_HEADER_HEIGHT;

export function Layout() {
  const { chromeCollapsed, toggleChrome } = useLayoutStore();
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
          <main className="w-full h-full p-4 overflow-y-auto bg-[#f3f3f9]" style={{ scrollbarGutter: 'stable' }}>
            <Outlet />
          </main>
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
