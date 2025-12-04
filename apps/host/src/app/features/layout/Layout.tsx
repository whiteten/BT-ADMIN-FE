import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { ConfigProvider } from 'antd';
// import InsetFooter from './InsetFooter';
import InsetHeader from './InsetHeader';
import LNBBody from './LNBBody';
import LNBFooter from './LNBFooter';
import LNBHeader from './LNBHeader';
import { antdTheme } from './config/antdTheme';
import { useMenuLoader } from './hooks/useMenuLoader';
import { Sidebar, SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export function Layout() {
  const { load } = useMenuLoader();
  useEffect(() => {
    load();
  }, [load]);
  return (
    <ConfigProvider theme={antdTheme}>
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
          <div className="w-full h-full p-5 overflow-y-auto bg-[#f3f3f9]" style={{ scrollbarGutter: 'stable' }}>
            <Outlet />
          </div>
          {/* <InsetFooter /> */}
        </SidebarInset>
      </SidebarProvider>
    </ConfigProvider>
  );
}
