import { Suspense, lazy } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { App, ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';
import 'dayjs/locale/ko';
import { KeepAlive, useKeepAliveRef } from 'keepalive-for-react';
import { Minimize2 } from 'lucide-react';
import { useAgentChatStore, useLayoutStore, useOpenTabsStore } from '@/shared-store';
import SubHeader, { SUB_HEADER_HEIGHT } from './SubHeader';
import TopHeader, { TOP_HEADER_HEIGHT } from './TopHeader';
import { antdTheme } from './config/antdTheme';
import { useCanUseAgentChat } from './hooks/useCanUseAgentChat';
import { useMenuPanelStore } from './hooks/useMenuPanelStore';
import { useTabSync } from './hooks/useTabSync';
import MenuPanel from './panel/MenuPanel';
import PanelAppBadgeStrip from './panel/PanelAppBadgeStrip';
import { getAppId } from './utils/pathUtils';
import { usePruneCacheNodes } from '@/libs/shared-ui/src/hooks/usePruneCacheNodes';

const TOTAL_HEADER_HEIGHT = TOP_HEADER_HEIGHT + SUB_HEADER_HEIGHT;

// aoe remote 의 에이전트 채팅 패널 — chrome(헤더) 바깥 오버레이로 렌더해 헤더 접힘·remote 전환과
// 무관하게 마운트를 유지(대화 보존). 트리거 버튼·open 상태는 TopHeader/useAgentChatStore 가 소유.
// 로드 실패 시 화면에 영향 없도록 null fallback.
const AgentChatPanel = lazy(() => import('aoe/AgentChatPanel').catch(() => ({ default: () => null })));

export function Layout() {
  const { chromeCollapsed, toggleChrome, chromeless } = useLayoutStore();
  const pinned = useMenuPanelStore((s) => s.pinned);
  const topOffset = chromeCollapsed ? 0 : TOTAL_HEADER_HEIGHT;

  const canUseAgentChat = useCanUseAgentChat();
  const chatOpen = useAgentChatStore((s) => s.open);
  const chatMounted = useAgentChatStore((s) => s.mounted);
  const setChatOpen = useAgentChatStore((s) => s.setOpen);

  // 현재 location을 SubHeader 탭 스트립과 동기화(헤더 접힘 상태에서도 추적되도록 항상 마운트되는 Layout에서 호출).
  useTabSync();

  // host 레벨 keep-alive — 방문한 remote "모듈"을 appId 단위로 캐시한다.
  // 캐시 수명은 인위적 상한 없이 "열린 탭 유무"로만 제어한다(아래 폐기 effect) — 탭이 있는 동안 유지, 마지막 탭을 닫으면 폐기.
  // 단일 공유 Layout(app.tsx) 덕에 remote 전환에도 Layout이 안 죽어 이 캐시가 유지되고,
  // 각 remote 내부의 KeepAliveBoundary(페이지 단위 캐시)와 합쳐져 cross-remote 페이지 상태가 보존된다.
  // 페이지별 보존은 host가 아니라 remote의 useRoutes 결과 위(KeepAliveBoundary)에서 처리한다.
  const hostAliveRef = useKeepAliveRef();
  const location = useLocation();
  const outlet = useOutlet();
  const remoteKey = getAppId(location.pathname) || 'root';
  const tabs = useOpenTabsStore((s) => s.tabs);

  // 열린 탭이 하나도 없는 remote의 host 캐시(모듈)를 폐기 — 마지막 탭을 닫으면 그 remote는 꺼진다(메모리 회수).
  // 현재 활성 remote는 보존.
  const openAppIds = new Set(tabs.map((t) => t.appId));
  usePruneCacheNodes(hostAliveRef, remoteKey, openAppIds);

  // chromeless 화면(녹취 재생 팝업·워크플로우 편집기 등) — 헤더/사이드바/패널/펼치기 버튼을 제거하고
  // 본문만 full-bleed 로 렌더. antd 컨텍스트(useModal·toast)는 ConfigProvider+App 래핑으로 유지.
  //
  // ⚠️ chromeless 를 별도 return(다른 트리)으로 분기하면 Outlet 의 부모 사슬이 바뀌어, chromeless
  // 토글 시 페이지가 언마운트+재마운트된다(예: localStorage 1회 소비 페이지가 빈 값으로 재초기화).
  // 따라서 단일 트리를 유지하고 chrome 조각만 조건부 렌더한다(`{cond && ...}` 는 falsy placeholder 라
  // 형제 위치가 보존돼 Outlet 이 재마운트되지 않는다).
  return (
    <ConfigProvider theme={antdTheme} locale={koKR} drawer={{ mask: { blur: false } }} modal={{ mask: { blur: false } }}>
      {/* App 컨텍스트(useModal·message)는 헤더까지 포함해야 한다 — 본문만 감싸면 TopHeader 의 TenantChip 등에서
          App.useApp() 이 컨텍스트를 못 잡아 modal.confirm 이 아무 동작도 하지 않는다.
          component={false} 라 DOM 노드를 만들지 않으므로 레이아웃에는 영향이 없다. */}
      <App component={false}>
        <div className="flex flex-col h-screen overflow-hidden">
          {!chromeCollapsed && !chromeless && (
            <>
              <TopHeader />
              <SubHeader />
            </>
          )}
          <div className="flex-1 min-h-0 w-full overflow-hidden">
            <div className="flex w-full h-full">
              {/* pinned=true면 strip을 메인 레이아웃에 합쳐 main 콘텐츠 폭이 자동으로 strip 폭(APP_BADGE_STRIP_WIDTH)만큼 줄어든다(오버레이 아님).
                  패널이 열리면 panel 안의 strip이 동일 위치 fixed로 올라와 layout strip을 자연스럽게 덮는다. */}
              {!chromeless && pinned && <PanelAppBadgeStrip />}
              <main
                className={chromeless ? 'flex-1 min-w-0 h-full overflow-hidden' : 'flex-1 min-w-0 h-full p-4 overflow-y-auto bg-[#f3f3f9]'}
                style={chromeless ? undefined : { scrollbarGutter: 'stable' }}
              >
                {/* remote 모듈을 appId 단위로 keep-alive. 컨테이너/노드 w-full h-full로 높이 체인 유지. */}
                <KeepAlive aliveRef={hostAliveRef} activeCacheKey={remoteKey} max={100} containerClassName="w-full h-full" cacheNodeClassName="w-full h-full">
                  {outlet}
                </KeepAlive>
              </main>
            </div>
          </div>
        </div>
        {!chromeless && <MenuPanel topOffset={topOffset} />}
        {/* AI 채팅 패널 — chrome 바깥 오버레이(position fixed). 헤더 접힘 상태에서도 그대로 표시 유지.
          mounted=첫 열림 후 계속 마운트(대화 보존), open=표시 토글. 닫아도 unmount 하지 않는다. */}
        {!chromeless && canUseAgentChat && chatMounted && (
          <Suspense fallback={null}>
            <AgentChatPanel open={chatOpen} placement="top-right" onClose={() => setChatOpen(false)} />
          </Suspense>
        )}
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
      </App>
    </ConfigProvider>
  );
}
