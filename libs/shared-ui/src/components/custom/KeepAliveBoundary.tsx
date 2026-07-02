import { type ReactNode, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { KeepAlive, useKeepAliveRef } from 'keepalive-for-react';
import { MAX_TABS, useOpenTabsStore } from '@/shared-store';
import { usePruneCacheNodes } from '../../hooks/usePruneCacheNodes';

interface KeepAliveBoundaryProps {
  /** remote app의 `useRoutes(routes)` 결과(현재 매칭 페이지 element). */
  children: ReactNode;
}

/**
 * remote 내부 라우팅 결과를 keep-alive로 감싸 탭 전환 시 페이지 상태(입력·스크롤·그리드)를 보존한다.
 *
 * 왜 host Layout이 아니라 remote의 useRoutes 결과 위인가:
 *  - host `<Outlet/>`은 Module Federation에서 "remote 모듈 전체"를 반환하므로 같은 remote의 모든 경로에서
 *    동일한 `<RemoteModule/>` element가 되어 keepalive가 탭별 캐시를 구분하지 못한다.
 *  - remote의 `useRoutes(location)` 결과는 경로별로 다른 매칭 element라 키별 캐시가 동작한다.
 *
 * 역할 분담(2계층 keep-alive): 이 경계는 한 remote 안에서의 "탭별" 캐시를 담당한다. host Layout은 "remote
 * 모듈"을 appId 단위로 keep-alive 한다(단일 공유 Layout 덕에 remote 전환에도 Layout이 안 죽음). 이 둘이
 * 합쳐져 cross-remote 페이지 상태가 보존되는데, host 모듈 캐시만으론 부족하다 — 다른 remote로 갈 때 이
 * 경계가 자기 remote의 활성 탭 노드를 freeze로 지켜야(아래 cacheKey 규칙) 그 탭이 안 깨진다. 실제로 host
 * Layout이 바이트 동일해도 이 경계의 cacheKey 판정이 틀리면 cross-remote 페이지 상태가 유실된 적이 있다.
 *
 * cacheKey 규칙 — 핵심: cacheKey는 keepalive의 children(= useRoutes(location))과 정합해야 한다.
 *  - 활성 own 탭의 url이 현재 location과 일치: 그 탭 id → 같은 url 중복 탭도 탭마다 별개 캐시 노드.
 *  - 어긋나는 전환 lag 프레임(activeId·location 비동기): location과 일치하는 own 탭(탭 전환 시 '이전 탭')
 *    또는 활성 own 탭(탭 내 이동 lag)에 머물러, 남의 화면을 엉뚱한 노드에 덮어쓰지 않는다.
 *  - 다른 remote가 보일 때(백그라운드): 현재 location 키 → 이 remote 탭 노드들은 freeze되어 보존되고,
 *    foreign 매칭 결과는 location 키 임시 노드로 격리됐다가 복귀 시 destroy된다.
 *  - 탭을 X로 닫거나 LRU로 밀려나면(=열린 탭 id 목록에서 사라지면) 그 노드를 destroy해 상태를 폐기한다.
 *
 * ⚠️ TabChip은 activateTab(activeId flip) → navigate(location 변경) 순서라 두 상태가 한 프레임 어긋난다.
 * 이 lag 프레임에 activeId만 보고 cacheKey를 목적 탭으로 옮기면, 그 탭 노드에 아직 이전 location이 그리는
 * 화면이 덮여 들어간다. 그래서 같은 remote 탭 전환(봇→모델)에서 모델탭 노드에 봇목록이 그려지며 모델탭
 * 보존상태가 파괴되고 봇목록 API가 다시 나가고(=keepAlive 실패), cross-remote에선 노드가 분열된다.
 * 해결: "활성 탭 id"는 그 탭 url이 현재 location과 일치할 때만 채택하고, 어긋나는 lag엔 location이 그리는
 * 화면에 맞는 노드에 머문다. 자기 appId는 첫 마운트 location에서 1회 캡처한다 — remote 모듈은 자기 remote가
 * 활성일 때만 처음 마운트되므로 첫 location은 항상 자기 remote다.
 *
 * 캐시 컨테이너/노드에 w-full h-full을 줘 페이지의 h-full 레이아웃이 무너지지 않게 한다.
 */
export default function KeepAliveBoundary({ children }: KeepAliveBoundaryProps) {
  const location = useLocation();
  const activeId = useOpenTabsStore((s) => s.activeId);
  const tabs = useOpenTabsStore((s) => s.tabs);
  const aliveRef = useKeepAliveRef();

  // 현재 location의 첫 세그먼트(appId). 아래 두 용도로 공용 — ① 자기 remote appId 첫 마운트 캡처, ② onOwnRemote 판정.
  const hereAppId = location.pathname.split('/').filter(Boolean)[0] ?? null;

  // 자기 remote의 appId를 첫 마운트 시점 location에서 1회 캡처(이후 백그라운드로 얼어 host location이 다른
  // remote로 바뀌어도 캡처값을 쓴다 — useLocation은 그 변화를 반영하므로 라이브로 읽으면 오판한다).
  const ownAppIdRef = useRef<string | null>(null);
  ownAppIdRef.current ??= hereAppId;
  const ownAppId = ownAppIdRef.current;

  // cacheKey(활성 캐시 노드)는 keepalive의 children(= useRoutes(location))과 반드시 정합해야 한다. 어긋나면
  // keepalive가 "활성 노드"에 지금 location이 그리는 화면을 덮어써, 엉뚱한 탭 노드에 남의 화면이 들어가며
  // 보존 상태가 파괴되고 스퍼리어스 API가 나간다.
  //
  // TabChip은 activateTab(activeId flip) → navigate(location 변경) 순이라 두 상태가 한 프레임 어긋난다(lag).
  // 이 lag 프레임에 activeId만 보고 cacheKey를 목적 탭으로 옮기면 그 탭 노드에 아직 이전 location의 화면이
  // 그려진다(같은 remote 탭 전환 시 목적 탭 보존상태 파괴 + 이전 페이지 API 재발사, cross-remote 시 노드 분열).
  // 그래서 "활성 탭 id"는 그 탭 url이 현재 location과 일치할 때만 채택하고, 어긋나는 lag엔 location이 그리는
  // 화면에 맞는 노드에 머문다.
  const currentUrl = location.pathname + location.search;
  const onOwnRemote = hereAppId === ownAppId;
  const activeTab = activeId ? tabs.find((t) => t.id === activeId) : undefined;
  const activeOwn = activeTab && activeTab.appId === ownAppId ? activeTab : undefined;
  let cacheKey: string;
  if (activeOwn && activeOwn.url === currentUrl) {
    // 정상 상태 + 같은 url 중복 탭: 활성 own 탭이 지금 location을 그림 → 탭 id로(중복도 독립 노드).
    cacheKey = activeOwn.id;
  } else {
    // lag 프레임 또는 activeTab이 foreign/none. location과 일치하는 own 탭이 있으면(탭 전환 lag의 '이전 탭')
    // 그 탭에 머문다. 없고 location이 아직 own이며 활성 탭도 own이면(탭 내 이동 lag: 목적 url이 아직 어느
    // 탭에도 미반영) 활성 own 탭에 머문다. 그도 아니면(foreign 화면/부트스트랩) location 키 임시 노드로 격리.
    const ownHere = tabs.find((t) => t.appId === ownAppId && t.url === currentUrl);
    if (ownHere) cacheKey = ownHere.id;
    else if (onOwnRemote && activeOwn) cacheKey = activeOwn.id;
    else cacheKey = currentUrl;
  }

  // 이 remote 소속 열린 탭 id만 보존 대상. 닫히거나 LRU로 밀려난(=목록에 없는) 노드, foreign 키 노드는 폐기.
  const openIds = new Set(tabs.filter((t) => t.appId === ownAppId).map((t) => t.id));
  usePruneCacheNodes(aliveRef, cacheKey, openIds);

  return (
    <KeepAlive aliveRef={aliveRef} activeCacheKey={cacheKey} max={MAX_TABS} containerClassName="w-full h-full" cacheNodeClassName="w-full h-full">
      {children}
    </KeepAlive>
  );
}

KeepAliveBoundary.displayName = 'KeepAliveBoundary';
