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
          borderRadius: 4,
          colorBorder: '#CED4DA',
        },
        components: {
          Button: {
            colorPrimary: '#405189',
            colorPrimaryActive: '#263854',
            colorPrimaryHover: '#5566a3',
            colorPrimaryBg: '#eef0f8',
            colorPrimaryBgHover: '#d9dfe9',
            colorPrimaryBorder: '#8897c4',
            defaultShadow: 'none',
            primaryShadow: 'none',
            dangerShadow: 'none',
          },
          Tag: {
            defaultBg: '#F7F7F8',
            defaultColor: '#495057',
          },
        },
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
          <div className="w-full h-full p-5 overflow-y-auto bg-[#f3f3f9]" style={{ scrollbarGutter: 'stable' }}>
            <Outlet />
          </div>
          {/* <InsetFooter /> */}
        </SidebarInset>
      </SidebarProvider>
    </ConfigProvider>
  );
}
