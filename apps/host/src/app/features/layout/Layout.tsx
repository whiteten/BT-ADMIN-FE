import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { ConfigProvider } from 'antd';
// import InsetFooter from './InsetFooter';
import InsetHeader from './InsetHeader';
import LNBBody from './LNBBody';
import LNBFooter from './LNBFooter';
import LNBHeader from './LNBHeader';
import { useMenuLoader } from './hooks/useMenuLoader';
import { Sidebar, SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import '@ant-design/v5-patch-for-react-19';

export function Layout() {
  const { load } = useMenuLoader();
  useEffect(() => {
    load();
  }, [load]);
  return (
    <ConfigProvider
      theme={{
        token: {
          controlHeight: 36,
          borderRadius: 8.4,
          colorBorder: 'oklch(0.92 0.004 286.32)',
        },
        components: {},
      }}
    >
      <SidebarProvider
        style={
          {
            '--sidebar-width': '14rem',
            '--sidebar-width-mobile': '14rem',
          } as React.CSSProperties
        }
      >
        <Sidebar variant="sidebar" className="">
          <LNBHeader />
          <LNBBody />
          <LNBFooter />
        </Sidebar>
        <SidebarInset className="h-[100vh]">
          <InsetHeader />
          <div className="w-full h-full p-4 overflow-y-auto bg-[#f3f3f9]" style={{ scrollbarGutter: 'stable' }}>
            <Outlet />
          </div>
          {/* <InsetFooter /> */}
        </SidebarInset>
      </SidebarProvider>
    </ConfigProvider>
  );
}
