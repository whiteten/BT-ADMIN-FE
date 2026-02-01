import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { App, ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';
import 'dayjs/locale/ko';
// import InsetFooter from './InsetFooter';
import { useAuthStore } from '@/shared-store';
import { toast } from '@/shared-util';
import InsetHeader from './InsetHeader';
import LNBBody from './LNBBody';
import LNBFooter from './LNBFooter';
import LNBHeader from './LNBHeader';
import { antdTheme } from './config/antdTheme';
import { useMenuLoader } from './hooks/useMenuLoader';
import { Sidebar, SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export function Layout() {
  const { load } = useMenuLoader();
  const { passwordExpiringWarning, setPasswordExpiringWarning } = useAuthStore();

  useEffect(() => {
    load();
  }, [load]);

  // 비밀번호 만료 경고 토스트 표시 (로그인 후 메인 화면 진입 시)
  useEffect(() => {
    if (passwordExpiringWarning?.show && passwordExpiringWarning.daysUntilExpiration !== null) {
      toast.warning(`비밀번호가 ${passwordExpiringWarning.daysUntilExpiration}일 후 만료됩니다. 비밀번호를 변경해주세요.`);
      // 한 번 표시 후 상태 초기화
      setPasswordExpiringWarning(null);
    }
  }, [passwordExpiringWarning, setPasswordExpiringWarning]);

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
            <div className="w-full h-full p-5 overflow-y-auto bg-[#f3f3f9]" style={{ scrollbarGutter: 'stable' }}>
              <Outlet />
            </div>
          </App>
          {/* <InsetFooter /> */}
        </SidebarInset>
      </SidebarProvider>
    </ConfigProvider>
  );
}
