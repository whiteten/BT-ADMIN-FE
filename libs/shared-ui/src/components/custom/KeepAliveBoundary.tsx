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
 * cacheKey 규칙:
 *  - 이 remote가 화면에 보일 때(onOwnRemote): 활성 own 탭 id → 같은 url 중복 탭도 탭마다 별개 캐시 노드.
 *  - 다른 remote가 보일 때(백그라운드): 현재 location → 이 remote의 탭 노드들은 자연히 freeze되어 보존되고,
 *    foreign 매칭 결과는 location 키의 임시 노드로 격리됐다가 복귀 시 destroy된다.
 *  - 탭을 X로 닫거나 LRU로 밀려나면(=열린 탭 id 목록에서 사라지면) 그 노드를 destroy해 상태를 폐기한다.
 *
 * ⚠️ "지금 화면에 보이는 remote"는 activeId가 아니라 location으로 판정해야 한다(onOwnRemote).
 * useOpenInNewTab은 navigate보다 먼저 openTab으로 activeId를 새(foreign) 탭으로 flip한다. 그래서 activeId로
 * own/foreign을 판정하면, location이 아직 이 remote(/fca) 안인 전환 찰나에 foreign으로 오판해 cacheKey가
 * "활성 탭 id"에서 "현재 location(= 아직 이 remote의 url)"로 튄다. 그러면 원본 탭 노드(tab-N)와 같은 url의
 * 중복 노드가 새로 분열되고(keepalive는 활성 노드에만 children을 덮어써 원본 페이지가 언마운트됨), 이후
 * destroy effect가 그 노드를 폐기하며 cross-remote 복귀 시 화면이 리셋된다(입력·스크롤·그리드 유실).
 * location 기준으로 판정하면 전환 찰나에도 cacheKey가 활성 탭 id에 머물러 노드 분열이 없다(브라우저 실측 확인).
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

  // "지금 화면에 보이는 remote"는 activeId가 아니라 location으로 판정한다.
  // useOpenInNewTab이 navigate보다 먼저 activeId를 새(foreign) 탭으로 flip하므로, activeId로 판정하면
  // location이 아직 이 remote(/fca) 안인 전환 찰나에 foreign으로 오판→cacheKey가 탭 id에서 own url로 튀어
  // 원본 탭 노드와 같은 url의 중복 노드가 분열되고, 이후 destroy effect가 그 노드를 폐기하며 페이지가 파괴된다.
  const onOwnRemote = (location.pathname.split('/').filter(Boolean)[0] ?? null) === ownAppId;
  const activeTab = activeId ? tabs.find((t) => t.id === activeId) : undefined;
  // 이 remote가 화면에 보이는 동안의 "활성 own 탭 id"를 기억한다(중복 탭 구분용). 전환 찰나(activeId가 이미
  // foreign이지만 location은 아직 own)엔 직전 own 탭 id를 유지해 키가 흔들리지 않게 한다.
  const lastOwnActiveIdRef = useRef<string | null>(null);
  if (activeTab && activeTab.appId === ownAppId) lastOwnActiveIdRef.current = activeTab.id;
  const cacheKey = onOwnRemote ? (lastOwnActiveIdRef.current ?? location.pathname + location.search) : location.pathname + location.search;

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
