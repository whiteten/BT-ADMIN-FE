import { Outlet } from 'react-router-dom';
import { App, ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';
import 'dayjs/locale/ko';
import SubHeader, { SUB_HEADER_HEIGHT } from './SubHeader';
import TopHeader, { TOP_HEADER_HEIGHT } from './TopHeader';
import { antdTheme } from './config/antdTheme';
import MenuPanel from './panel/MenuPanel';

const TOTAL_HEADER_HEIGHT = TOP_HEADER_HEIGHT + SUB_HEADER_HEIGHT;

export function Layout() {
  return (
    <ConfigProvider theme={antdTheme} locale={koKR} drawer={{ mask: { blur: false } }} modal={{ mask: { blur: false } }}>
      <div className="flex flex-col h-screen overflow-hidden">
        <TopHeader />
        <SubHeader />
        <App className="flex-1 min-h-0 w-full overflow-hidden">
          <main className="w-full h-full p-4 overflow-y-auto bg-[#f3f3f9]" style={{ scrollbarGutter: 'stable' }}>
            <Outlet />
          </main>
        </App>
      </div>
      <MenuPanel topOffset={TOTAL_HEADER_HEIGHT} />
    </ConfigProvider>
  );
}
