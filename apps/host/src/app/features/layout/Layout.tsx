import { Outlet } from 'react-router-dom';
import { App, ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';
import 'dayjs/locale/ko';
import { Minimize2 } from 'lucide-react';
import { useLayoutStore } from '@/shared-store';
import SubHeader, { SUB_HEADER_HEIGHT } from './SubHeader';
import TopHeader, { TOP_HEADER_HEIGHT } from './TopHeader';
import { antdTheme } from './config/antdTheme';
import { useMenuPanelStore } from './hooks/useMenuPanelStore';
import MenuPanel from './panel/MenuPanel';
import PanelAppBadgeStrip from './panel/PanelAppBadgeStrip';

const TOTAL_HEADER_HEIGHT = TOP_HEADER_HEIGHT + SUB_HEADER_HEIGHT;

export function Layout() {
  const { chromeCollapsed, toggleChrome, chromeless } = useLayoutStore();
  const pinned = useMenuPanelStore((s) => s.pinned);
  const topOffset = chromeCollapsed ? 0 : TOTAL_HEADER_HEIGHT;

  // chromeless 화면(녹취 재생 팝업·워크플로우 편집기 등) — 헤더/사이드바/패널/펼치기 버튼을 제거하고
  // 본문만 full-bleed 로 렌더. antd 컨텍스트(useModal·toast)는 ConfigProvider+App 래핑으로 유지.
  //
  // ⚠️ chromeless 를 별도 return(다른 트리)으로 분기하면 Outlet 의 부모 사슬이 바뀌어, chromeless
  // 토글 시 페이지가 언마운트+재마운트된다(예: localStorage 1회 소비 페이지가 빈 값으로 재초기화).
  // 따라서 단일 트리를 유지하고 chrome 조각만 조건부 렌더한다(`{cond && ...}` 는 falsy placeholder 라
  // 형제 위치가 보존돼 Outlet 이 재마운트되지 않는다).
  return (
    <ConfigProvider theme={antdTheme} locale={koKR} drawer={{ mask: { blur: false } }} modal={{ mask: { blur: false } }}>
      <div className="flex flex-col h-screen overflow-hidden">
        {!chromeCollapsed && !chromeless && (
          <>
            <TopHeader />
            <SubHeader />
          </>
        )}
        <App className="flex-1 min-h-0 w-full overflow-hidden">
          <div className="flex w-full h-full">
            {/* pinned=true면 strip을 메인 레이아웃에 합쳐 main 콘텐츠 폭이 자동으로 strip 폭(APP_BADGE_STRIP_WIDTH)만큼 줄어든다(오버레이 아님).
                패널이 열리면 panel 안의 strip이 동일 위치 fixed로 올라와 layout strip을 자연스럽게 덮는다. */}
            {!chromeless && pinned && <PanelAppBadgeStrip />}
            <main
              className={chromeless ? 'flex-1 min-w-0 h-full overflow-hidden' : 'flex-1 min-w-0 h-full p-4 overflow-y-auto bg-[#f3f3f9]'}
              style={chromeless ? undefined : { scrollbarGutter: 'stable' }}
            >
              <Outlet />
            </main>
          </div>
        </App>
      </div>
      {!chromeless && <MenuPanel topOffset={topOffset} />}
      {chromeCollapsed && !chromeless && (
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
