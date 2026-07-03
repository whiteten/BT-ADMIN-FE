import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useBreadcrumbStore, useLayoutStore, useMenuStore, useOpenTabsStore, useRemoteRoutesStore } from '@/shared-store';
import { resolveBreadcrumbTail, resolveTabTarget } from '../utils/openTabs';

/** 탭으로 추적하지 않는 경로 prefix(인증/오류 화면). host index('/')는 별도 처리. */
const SKIP_PREFIXES = ['/login', '/forbidden'];

/**
 * 히스토리 칸(location.key) → 탭 id 장부의 sessionStorage 키·상한.
 * 상한은 브라우저 히스토리 깊이(구현마다 다름, 대략 수십~수백)를 넉넉히 덮는 값. 브라우저가 버려 도달
 * 불가능해진 옛 key 엔트리는 조회되지 않는 죽은 값이라, 상한으로 오래된 것부터 밀어내 누적을 막는다.
 */
const KEY_LEDGER_STORAGE = 'tab-history-key-ledger';
const KEY_LEDGER_CAP = 300;

/** sessionStorage에서 장부 복원(없거나 파싱 실패 시 빈 Map). */
function loadKeyLedger(): Map<string, string> {
  try {
    const raw = sessionStorage.getItem(KEY_LEDGER_STORAGE);
    if (!raw) return new Map();
    return new Map(JSON.parse(raw) as [string, string][]);
  } catch {
    return new Map();
  }
}

/** 장부를 sessionStorage에 직렬화 저장(접근 불가 시 무시 — 유실돼도 미매핑 폴백으로 동작). */
function saveKeyLedger(ledger: Map<string, string>): void {
  try {
    sessionStorage.setItem(KEY_LEDGER_STORAGE, JSON.stringify([...ledger]));
  } catch {
    // 용량 초과·프라이빗 모드 등 sessionStorage 접근 실패 — 장부 없이도 폴백으로 안전하므로 삼킨다.
  }
}

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
  const { pathname, search, key } = useLocation();
  const navType = useNavigationType();
  const menuConfigs = useMenuStore((s) => s.menuConfigs);
  const chromeless = useLayoutStore((s) => s.chromeless);
  const items = useBreadcrumbStore((s) => s.items);
  const params = useBreadcrumbStore((s) => s.params);
  const breadcrumbUrl = useBreadcrumbStore((s) => s.url);
  const routesMap = useRemoteRoutesStore((s) => s.routes);
  const tabs = useOpenTabsStore((s) => s.tabs);
  const openTab = useOpenTabsStore((s) => s.openTab);
  const setTabMeta = useOpenTabsStore((s) => s.setTabMeta);
  const activateTab = useOpenTabsStore((s) => s.activateTab);
  const clearActive = useOpenTabsStore((s) => s.clearActive);
  const renameLabel = useOpenTabsStore((s) => s.renameLabel);
  const setTabBreadcrumb = useOpenTabsStore((s) => s.setTabBreadcrumb);

  // 히스토리 칸(location.key) → 그 칸을 점유한 탭 id 장부. 브라우저 뒤로/앞으로(POP)로 도착한 url이 원래
  // 어느 탭 소속인지 되찾는 데 쓴다. url은 중복 탭 때문에 소속 판별에 못 쓰지만(같은 url 탭 여럿), key는
  // 히스토리 칸마다 유일해 정확하다. react-router가 이동마다 key를 자동 발급하고 POP 시 history.state로
  // 복원해 주므로(useLocation().key), 우리는 이동 시 기록하고 POP 시 조회만 한다.
  //
  // sessionStorage에 영속(상한 KEY_LEDGER_CAP). useOpenTabsStore도 sessionStorage persist라 새로고침 후
  // 탭 id(tab-N)가 동일하게 복원되고, 브라우저도 history.state로 key를 복원하므로, 새로고침 직후 뒤로/앞으로도
  // 폴백 없이 소속 탭을 되찾는다. 닫힌 탭 key는 조회 시 tabs 존재 체크로 걸러진다.
  // lazy init: useRef는 초기화 함수를 못 받으므로 최초 렌더에서 1회 sessionStorage에서 복원한다.
  const keyLedgerRef = useRef<Map<string, string> | null>(null);
  if (keyLedgerRef.current === null) keyLedgerRef.current = loadKeyLedger();

  // 1) location 변경 → 활성 탭 url 동기화(탭 내 이동) 또는 부트스트랩(활성 탭 없을 때).
  //    tabs/activeId는 getState()로 최신값을 읽는다 — 셀렉터 클로저로 받으면 StrictMode 이중 실행 시
  //    낡은 activeId로 부트스트랩이 두 번 발사돼 탭이 중복 생성될 수 있다(메뉴 로드 후 라벨 보정을 위해 menuConfigs 의존).
  //
  //    브라우저 뒤로/앞으로(navType==='POP'): 단일 공유 히스토리라 딴 탭이 만든 url이 스택에 섞여 있다.
  //    이때 그 url을 활성 탭에 덮어쓰면 "2번 탭 화면이 1번 탭으로 넘어오는" 오염이 생긴다. 그래서 POP은
  //    먼저 장부로 도착 key의 소속 탭을 찾아 그 탭으로 활성 전환하고(활성 탭은 안 건드림), 그 탭 url을
  //    도착 위치로 맞춘다. 소속 탭이 닫혔거나(장부에 없거나) 미매핑이면 아래 일반 동기화로 폴백한다.
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

    // appId·relPath·leaf 판정·meta를 1회에 도출. appId 없으면(비-remote url) 종료.
    const target = resolveTabTarget(menuConfigs, routesMap, pathname, search);
    if (!target) return;

    // redirect 전용 그룹 path(예: /fca/dashboard → index <Navigate replace> → /fca/dashboard/call-bot)에는
    // 탭을 건드리지 않는다(중간 그룹 url로 잠깐 갱신되는 깜빡임 방지). leaf 라우트 레지스트리에 없으면 = 머물지 않는 url.
    // 레지스트리 미로드면 판정 불가 → 기존 동작으로 폴백(아래 동기화/부트스트랩 진행).
    if (target.registryLoaded && !target.entry) return;

    const { tabs, activeId } = useOpenTabsStore.getState();
    const meta = target.meta;

    // POP(뒤로/앞으로): 도착 key의 소속 탭이 살아 있고 활성이 아니면 그 탭으로 전환 + url 동기화 후 종료.
    // (소속 탭이 이미 활성이면 그 탭 내부 뒤로가기이므로 아래 일반 동기화가 처리한다.)
    if (navType === 'POP') {
      const ownerId = keyLedgerRef.current?.get(key);
      const owner = ownerId ? tabs.find((t) => t.id === ownerId) : undefined;
      if (owner && owner.id !== activeId) {
        activateTab(owner.id);
        if (owner.url !== id) setTabMeta(owner.id, meta);
        return;
      }
    }

    const active = activeId ? tabs.find((t) => t.id === activeId) : undefined;

    if (active) {
      // 탭 내 페이지 이동 — 활성 탭의 url(+라벨/isDynamic)을 현재 위치로 갱신. 메뉴 클릭으로 새 탭이 열린
      // 경우엔 openTab이 이미 url을 맞춰 둬서 여기선 no-op이 된다(중복 갱신 없음).
      if (active.url !== id) setTabMeta(active.id, meta);
    } else {
      // 활성 탭 없음(딥링크/새로고침/홈 복귀 후 진입) — 같은 url 탭이 있으면 그걸 활성화(중복 생성 방지),
      // 없으면 부트스트랩으로 새 탭 생성. (메뉴 클릭 경로는 openTab이 먼저 active를 세팅하므로 여기 안 옴.)
      const matched = tabs.find((t) => t.url === id);
      if (matched) activateTab(matched.id);
      else openTab(meta);
    }

    // 이 히스토리 칸을 최종 활성 탭에 연결(다음 POP이 소속을 되찾을 수 있게). 위 동기화/부트스트랩으로
    // activeId가 바뀌었을 수 있어 getState로 최종값을 읽는다. 상한 초과 시 삽입순(=옛 히스토리 칸)부터 밀어낸다.
    const finalActiveId = useOpenTabsStore.getState().activeId;
    const ledger = keyLedgerRef.current;
    if (finalActiveId && ledger) {
      ledger.set(key, finalActiveId);
      while (ledger.size > KEY_LEDGER_CAP) {
        const oldest = ledger.keys().next().value;
        if (oldest === undefined) break;
        ledger.delete(oldest);
      }
      saveKeyLedger(ledger);
    }
  }, [pathname, search, key, navType, chromeless, menuConfigs, routesMap, openTab, setTabMeta, activateTab, clearActive]);

  // 2) breadcrumb 변경 또는 탭 추가 → 그 breadcrumb을 소유한 url의 탭(들)에 미러 + 라벨 정밀화.
  //    - breadcrumbUrl은 "breadcrumb leaf 항목의 self-path"(없으면 현재 location). keep-alive로 얼어 있는
  //      페이지의 늦은(async) 쓰기여도 자기 url로 매핑돼, 다른 탭을 덮는 오염을 막는다. 같은 url 탭이
  //      여럿(중복)이면 모두 같은 breadcrumb/라벨이 되도록 함께 갱신한다.
  //    - tabs를 dep으로 둔다(getState 아님): 라벨 정밀화는 breadcrumb 변화뿐 아니라 "소비자(탭) 집합" 변화에도
  //      반응해야 한다. 같은 메뉴를 연속 클릭해 중복 탭이 열리면 breadcrumb store 값은 그대로라(모듈 const items
  //      ref 동일) breadcrumb 변화 dep만으론 미발화 → 새 탭이 메뉴발 라벨에 고정된다. tabs 변화로 재발화해
  //      store에 남은 breadcrumb으로 새 탭까지 정밀화한다. url 필터 덕에 매칭 탭에만 쓰고, rename/setTabBreadcrumb는
  //      동일값 early-return이라 여분 실행은 무해(idempotent).
  //    - 빈 items(페이지 unmount 시 clearBreadcrumb)는 무시 — clear가 탭 슬롯을 비우는 오염 방지
  //      (탭 슬롯은 closeTab에서만 purge).
  useEffect(() => {
    if (!items || items.length === 0 || !breadcrumbUrl) return;
    const targets = tabs.filter((t) => t.url === breadcrumbUrl);
    if (targets.length === 0) return;
    const label = resolveBreadcrumbTail(items, params);
    for (const t of targets) {
      setTabBreadcrumb(t.id, { items, params });
      if (label) renameLabel(t.id, label);
    }
  }, [items, params, breadcrumbUrl, tabs, renameLabel, setTabBreadcrumb]);
}
