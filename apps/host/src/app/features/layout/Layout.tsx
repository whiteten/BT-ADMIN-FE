import { Outlet } from 'react-router-dom';
import { App, ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';
import 'dayjs/locale/ko';
// import InsetFooter from './InsetFooter';
import InsetHeader from './InsetHeader';
import LNBBody from './LNBBody';
import LNBFooter from './LNBFooter';
import LNBHeader from './LNBHeader';
import { antdTheme } from './config/antdTheme';
import { Sidebar, SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export function Layout() {
  return (
    <ConfigProvider theme={antdTheme} locale={koKR} drawer={{ mask: { blur: false } }} modal={{ mask: { blur: false } }}>
      <SidebarProvider
        style={
          {
            '--sidebar-width': '14rem',
            '--sidebar-width-mobile': '14rem',
          } as React.CSSProperties
        }
      >
        <Sidebar variant="sidebar">
          <LNBHeader />
          <LNBBody />
          <LNBFooter />
        </Sidebar>
        <SidebarInset className="h-[100vh] overflow-hidden">
          <InsetHeader />
          <App className="w-full h-full overflow-hidden">
            <div className="w-full h-full p-4 overflow-y-auto bg-[#f3f3f9]" style={{ scrollbarGutter: 'stable' }}>
              <Outlet />
            </div>
          </App>
          {/* <InsetFooter /> */}
        </SidebarInset>
      </SidebarProvider>
    </ConfigProvider>
  );
}
