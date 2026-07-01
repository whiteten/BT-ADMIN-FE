import { type ReactNode, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { KeepAlive, useKeepAliveRef } from 'keepalive-for-react';
import { MAX_TABS, useOpenTabsStore } from '@/shared-store';

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
 * 역할 분담(2계층 keep-alive): 이 경계는 한 remote 안에서의 "탭별" 캐시를 담당한다.
 * cross-remote(다른 remote로 이동) 보존은 host Layout이 "remote 모듈"을 appId 단위로 keep-alive 해서
 * 처리한다(단일 공유 Layout 덕에 remote 전환에도 Layout이 안 죽음). 즉 remote 모듈 캐시(host) +
 * 그 안의 탭 캐시(이 경계)가 합쳐져 cross-remote 페이지 상태까지 보존된다.
 *
 * cacheKey = 활성 탭 id 로 useOpenTabsStore의 탭 정체성과 일치시킨다(url 아님!) →
 *  - 같은 url의 탭이 여러 개(중복)여도 탭마다 별개 캐시 노드를 갖는다.
 *  - 탭을 X로 닫거나 LRU로 밀려나면(=열린 탭 id 목록에서 사라지면) 그 노드를 destroy해 상태를 폐기한다.
 *
 * ⚠️ 단, useOpenTabsStore는 전역 싱글톤이고 host가 백그라운드 remote를 keepalive로 "마운트 유지(freeze)"
 * 하므로, 다른 remote로 전환해 activeId가 바뀌면 백그라운드 remote의 이 경계도 구독 때문에 단독 재렌더된다.
 * 이때도 cross-remote 페이지 보존이 깨지지 않도록:
 *  - 활성 탭이 "이 remote(appId) 소속"이면 그 탭 id를 키로 쓴다(같은 url 중복 탭을 구분).
 *  - 활성 탭이 다른 remote 소속(=현재 location이 이 remote 밖)이면 현재 location을 키로 쓴다. 그러면 이
 *    remote의 탭 노드들은 자연히 freeze되어 상태가 보존되고(url-키 시절과 동일), 안 맞는 foreign 매칭 결과는
 *    location 키의 임시 노드로 격리됐다가 복귀 시 destroy된다. (own 탭 id로 키를 고정하면 location이 밖일 때
 *    빈 매칭 결과가 그 탭 노드를 덮어써 상태가 날아간다.)
 * 자기 appId는 첫 마운트 location에서 1회 캡처한다 — remote 모듈은 자기 remote가 활성일 때만 처음
 * 마운트되므로 첫 location은 항상 자기 remote다.
 *
 * 캐시 컨테이너/노드에 w-full h-full을 줘 페이지의 h-full 레이아웃이 무너지지 않게 한다.
 */
export default function KeepAliveBoundary({ children }: KeepAliveBoundaryProps) {
  const location = useLocation();
  const activeId = useOpenTabsStore((s) => s.activeId);
  const tabs = useOpenTabsStore((s) => s.tabs);
  const aliveRef = useKeepAliveRef();

  // 자기 remote의 appId를 첫 마운트 시점 location에서 1회 캡처(이후 백그라운드로 얼어 host location이 다른
  // remote로 바뀌어도 캡처값을 쓴다 — useLocation은 그 변화를 반영하므로 라이브로 읽으면 오판한다).
  const ownAppIdRef = useRef<string | null>(null);
  ownAppIdRef.current ??= location.pathname.split('/').filter(Boolean)[0] ?? null;
  const ownAppId = ownAppIdRef.current;

  // 활성 탭이 이 remote 소속이면 탭 id(중복 탭 구분), 아니면 현재 location(이 remote 노드들을 freeze해 보존).
  const activeTab = activeId ? tabs.find((t) => t.id === activeId) : undefined;
  const cacheKey = activeTab && activeTab.appId === ownAppId ? activeTab.id : location.pathname + location.search;

  // 이 remote 소속 열린 탭 id만 보존 대상. 닫히거나 LRU로 밀려난(=목록에 없는) 노드, foreign 키 노드는 폐기.
  useEffect(() => {
    const api = aliveRef.current;
    if (!api?.getCacheNodes) return;
    const openIds = new Set(tabs.filter((t) => t.appId === ownAppId).map((t) => t.id));
    for (const node of api.getCacheNodes()) {
      if (node.cacheKey !== cacheKey && !openIds.has(node.cacheKey)) {
        void api.destroy(node.cacheKey);
      }
    }
  }, [tabs, cacheKey, aliveRef, ownAppId]);

  return (
    <KeepAlive aliveRef={aliveRef} activeCacheKey={cacheKey} max={MAX_TABS} containerClassName="w-full h-full" cacheNodeClassName="w-full h-full">
      {children}
    </KeepAlive>
  );
}

KeepAliveBoundary.displayName = 'KeepAliveBoundary';
