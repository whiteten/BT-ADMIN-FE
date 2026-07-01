import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useBreadcrumbStore, useLayoutStore, useMenuStore, useOpenTabsStore, useRemoteRoutesStore } from '@/shared-store';
import { deriveTabMeta, findLeafEntry, getAppId, resolveBreadcrumbTail } from '../utils/openTabs';

/** 탭으로 추적하지 않는 경로 prefix(인증/오류 화면). host index('/')는 별도 처리. */
const SKIP_PREFIXES = ['/login', '/forbidden'];

/**
 * 현재 location을 열린 탭과 동기화한다(Layout에서 1회 호출).
 *
 * 탭 생성과 페이지 이동을 분리한 모델:
 *  - "메뉴 클릭"만 새 탭을 연다(useOpenInNewTab 훅이 openTab을 호출 → 같은 url이어도 중복 생성).
 *  - 탭 안에서의 페이지 이동(목록→상세, 폼 제출 후 복귀 등)은 새 탭을 만들지 않고 활성 탭의 url만 갱신한다.
 *  - 따라서 이 훅은 location 변경 시 "활성 탭의 url을 현재 위치로 맞추는" 일만 한다(+ 활성 탭이 없을 때만 부트스트랩 생성).
 *
 * breadcrumb 소유: 페이지는 전역 useBreadcrumbStore에 쓰지만, 렌더 SoT는 탭별 `breadcrumbsById`다
 * (BreadcrumbSlot이 활성 탭 슬롯을 직접 읽음). keep-alive로 얼어 있는 페이지의 늦은 쓰기여도 그 페이지
 * url의 탭(들)에 매핑되도록 breadcrumbUrl 기준으로 미러한다.
 */
export function useTabSync() {
  const { pathname, search } = useLocation();
  const menuConfigs = useMenuStore((s) => s.menuConfigs);
  const chromeless = useLayoutStore((s) => s.chromeless);
  const items = useBreadcrumbStore((s) => s.items);
  const params = useBreadcrumbStore((s) => s.params);
  const breadcrumbUrl = useBreadcrumbStore((s) => s.url);
  const routesMap = useRemoteRoutesStore((s) => s.routes);
  const openTab = useOpenTabsStore((s) => s.openTab);
  const setTabMeta = useOpenTabsStore((s) => s.setTabMeta);
  const activateTab = useOpenTabsStore((s) => s.activateTab);
  const clearActive = useOpenTabsStore((s) => s.clearActive);
  const renameLabel = useOpenTabsStore((s) => s.renameLabel);
  const setTabBreadcrumb = useOpenTabsStore((s) => s.setTabBreadcrumb);

  // 1) location 변경 → 활성 탭 url 동기화(탭 내 이동) 또는 부트스트랩(활성 탭 없을 때).
  //    tabs/activeId는 getState()로 최신값을 읽는다 — 셀렉터 클로저로 받으면 StrictMode 이중 실행 시
  //    낡은 activeId로 부트스트랩이 두 번 발사돼 탭이 중복 생성될 수 있다(메뉴 로드 후 라벨 보정을 위해 menuConfigs 의존).
  useEffect(() => {
    if (chromeless) return;
    const id = pathname + search;
    // host index('/')는 탭으로 추적하지 않는 위치 → 어느 탭에도 머물지 않으므로 활성 표기를 해제한다.
    // (안 그러면 직전 탭이 계속 활성처럼 보임 — 화면은 홈인데 탭 하이라이트만 남는 현상)
    if (pathname === '/') {
      clearActive();
      return;
    }
    if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return;

    const appId = getAppId(pathname);
    if (!appId) return;

    const relPath = pathname.replace(new RegExp(`^/${appId}/?`), '').replace(/\/+$/, '');
    // redirect 전용 그룹 path(예: /fca/dashboard → index <Navigate replace> → /fca/dashboard/call-bot)에는
    // 탭을 건드리지 않는다(중간 그룹 url로 잠깐 갱신되는 깜빡임 방지). leaf 라우트 레지스트리에 없으면 = 머물지 않는 url.
    // 레지스트리 미로드(빈 배열)면 판정 불가 → 기존 동작으로 폴백(아래 동기화/부트스트랩 진행).
    const entries = routesMap[appId];
    const registryLoaded = !!entries && entries.length > 0;
    if (registryLoaded && !findLeafEntry(entries, relPath)) return;

    const { tabs, activeId } = useOpenTabsStore.getState();
    const active = activeId ? tabs.find((t) => t.id === activeId) : undefined;
    const meta = deriveTabMeta(menuConfigs, routesMap, pathname, search);

    if (active) {
      // 탭 내 페이지 이동 — 활성 탭의 url(+라벨/isDynamic)을 현재 위치로 갱신. 메뉴 클릭으로 새 탭이 열린
      // 경우엔 openTab이 이미 url을 맞춰 둬서 여기선 no-op이 된다(중복 갱신 없음).
      if (active.url !== id && meta) setTabMeta(active.id, meta);
    } else {
      // 활성 탭 없음(딥링크/새로고침/홈 복귀 후 진입) — 같은 url 탭이 있으면 그걸 활성화(중복 생성 방지),
      // 없으면 부트스트랩으로 새 탭 생성. (메뉴 클릭 경로는 openTab이 먼저 active를 세팅하므로 여기 안 옴.)
      const matched = tabs.find((t) => t.url === id);
      if (matched) activateTab(matched.id);
      else if (meta) openTab(meta);
    }
  }, [pathname, search, chromeless, menuConfigs, routesMap, openTab, setTabMeta, activateTab, clearActive]);

  // 2) breadcrumb 변경 → 그 breadcrumb을 소유한 url의 탭(들)에 미러 + 라벨 정밀화.
  //    - breadcrumbUrl은 "breadcrumb leaf 항목의 self-path"(없으면 현재 location). keep-alive로 얼어 있는
  //      페이지의 늦은(async) 쓰기여도 자기 url로 매핑돼, 다른 탭을 덮는 오염을 막는다. 같은 url 탭이
  //      여럿(중복)이면 모두 같은 breadcrumb/라벨이 되도록 함께 갱신한다.
  //    - 빈 items(페이지 unmount 시 clearBreadcrumb)는 무시 — clear가 탭 슬롯을 비우는 오염 방지
  //      (탭 슬롯은 closeTab에서만 purge).
  useEffect(() => {
    if (!items || items.length === 0 || !breadcrumbUrl) return;
    const targets = useOpenTabsStore.getState().tabs.filter((t) => t.url === breadcrumbUrl);
    if (targets.length === 0) return;
    const label = resolveBreadcrumbTail(items, params);
    for (const t of targets) {
      setTabBreadcrumb(t.id, { items, params });
      if (label) renameLabel(t.id, label);
    }
  }, [items, params, breadcrumbUrl, renameLabel, setTabBreadcrumb]);
}
