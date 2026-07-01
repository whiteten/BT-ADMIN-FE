import type { BreadcrumbProps } from 'antd';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

/** 동시에 유지하는 최대 탭 수. 초과 시 비활성 탭 중 가장 오래 안 쓴 것을 LRU로 제거. */
export const MAX_TABS = 10;

export interface OpenTab {
  /**
   * 탭 식별자 — 메뉴 클릭마다 새로 발급되는 고유 id(url과 무관). 같은 url의 탭이 여러 개 공존할 수 있어
   * url이 아니라 이 id가 탭의 정체성이다. remote KeepAliveBoundary의 cacheKey이자 활성 추적 키.
   */
  id: string;
  /** 탭이 현재 가리키는 url의 첫 세그먼트(remote appId). 탭 내 페이지 이동 시 url과 함께 갱신. */
  appId: string;
  /** 탭이 현재 가리키는 url(pathname + search). 탭 내 페이지 이동마다 갱신되는 네비게이션 대상. */
  url: string;
  /** 탭에 표시할 라벨. 메뉴 라벨 → breadcrumb로 정밀화. */
  label: string;
  /** 라벨 출처 구분 — true면 파라미터 상세(데이터발 이름, breadcrumb로 정밀화), false면 메뉴/세그먼트발 고정 라벨. 탭 스타일 분기에 사용. */
  isDynamic: boolean;
  /** LRU 평가 기준 — 마지막 활성화 시각(ms). */
  lastActiveAt: number;
}

/** 탭 생성·갱신에 쓰는 메타(id·lastActiveAt 제외) — useTabSync/메뉴 핸들러가 url에서 도출해 전달. */
export type TabMeta = Pick<OpenTab, 'appId' | 'url' | 'label' | 'isDynamic'>;

interface BreadcrumbSnapshot {
  items: BreadcrumbProps['items'];
  params: BreadcrumbProps['params'];
}

interface OpenTabsStore {
  tabs: OpenTab[];
  activeId: string | null;
  /** 탭 id 발급용 단조 증가 시퀀스(persist 포함 — 새로고침 후에도 id 충돌 방지). */
  nextSeq: number;
  /**
   * 탭별 breadcrumb 스냅샷(영속 제외). keep-alive로 페이지가 재마운트되지 않으면 페이지의 breadcrumb
   * effect가 재실행되지 않아 host breadcrumb이 이전 페이지로 남는다 → 탭 활성화 시 이 스냅샷을 복원한다.
   */
  breadcrumbsById: Record<string, BreadcrumbSnapshot>;
  /** 새 탭을 항상 새로 만들어 활성화(메뉴 클릭마다 호출, 같은 url이어도 중복 생성). MAX_TABS 초과면 비활성 LRU 1개 제거. 생성된 id 반환. */
  openTab: (meta: TabMeta) => string;
  /** 활성 탭(또는 지정 탭)의 url·appId·라벨을 갱신(탭 내 페이지 이동). 새 탭을 만들지 않는다. */
  setTabMeta: (id: string, meta: TabMeta) => void;
  /** 탭 닫기. 활성 탭을 닫았으면 이동할 url을 반환(없으면 '/'), 비활성 탭이면 null. */
  closeTab: (id: string) => { nextPath: string | null };
  /** id 탭만 남기고 나머지 닫기. id를 활성화하며, 활성이 바뀌면 이동할 url 반환. */
  closeOthers: (id: string) => { nextPath: string | null };
  /** id 탭 오른쪽 탭 전부 닫기. 활성 탭이 잘려나가면 id를 활성화하고 그 url 반환. */
  closeToRight: (id: string) => { nextPath: string | null };
  /** 모든 탭 닫기. 항상 '/'로 이동. */
  closeAll: () => { nextPath: string };
  /** 탭 활성화(클릭). lastActiveAt 갱신. */
  activateTab: (id: string) => void;
  /** 활성 탭 표기 해제(어느 탭에도 매칭 안 되는 위치 = host index '/'). 탭 목록은 유지. */
  clearActive: () => void;
  /** 라벨 갱신(breadcrumb 해석 완료 시 등). 빈 값/동일값이면 무시. */
  renameLabel: (id: string, label: string) => void;
  /** 드래그 재정렬 — fromId 탭을 toId 위치로 이동. 순서는 persist된다(LRU evict와 무관). */
  reorderTab: (fromId: string, toId: string) => void;
  /** 탭의 breadcrumb 스냅샷 저장(활성 페이지가 breadcrumb을 세팅할 때 캡처). */
  setTabBreadcrumb: (id: string, snapshot: BreadcrumbSnapshot) => void;
  reset: () => void;
}

const initialState = {
  tabs: [] as OpenTab[],
  activeId: null as string | null,
  nextSeq: 1,
  breadcrumbsById: {} as Record<string, BreadcrumbSnapshot>,
};

/**
 * 영속용 sanitize — title이 문자열인 breadcrumb 항목만 남긴다. 일부 페이지는 title에 ReactNode를 넣을 수
 * 있어 통째로 직렬화하면 깨지므로(rehydrate 시 객체를 자식으로 렌더 → 오류), 문자열 항목만 보존한다.
 * 새로고침 후 아직 안 연 탭의 hover 툴팁/라벨 경로를 복원하는 데 쓴다(페이지 마운트 시 실제 값으로 덮임).
 */
function serializableBreadcrumbs(map: Record<string, BreadcrumbSnapshot>): Record<string, BreadcrumbSnapshot> {
  const out: Record<string, BreadcrumbSnapshot> = {};
  for (const [id, snap] of Object.entries(map)) {
    const items = (snap.items ?? []).filter((it) => typeof it?.title === 'string');
    if (items.length > 0) out[id] = { items, params: snap.params };
  }
  return out;
}

export const useOpenTabsStore = create<OpenTabsStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        openTab: (meta) => {
          const id = `tab-${get().nextSeq}`;
          set(
            (state) => {
              const now = Date.now();
              let tabs: OpenTab[] = [...state.tabs, { id, ...meta, lastActiveAt: now }];
              let breadcrumbsById = state.breadcrumbsById;
              if (tabs.length > MAX_TABS) {
                // 방금 추가한 탭(가장 큰 lastActiveAt)은 제외하고, 가장 오래 안 쓴 비활성 탭을 제거
                const evictable = tabs.filter((t) => t.id !== id);
                const victim = evictable.reduce((min, t) => (t.lastActiveAt < min.lastActiveAt ? t : min), evictable[0]);
                tabs = tabs.filter((t) => t.id !== victim.id);
                const { [victim.id]: _removed, ...rest } = breadcrumbsById;
                breadcrumbsById = rest;
              }
              return { tabs, activeId: id, breadcrumbsById, nextSeq: state.nextSeq + 1 };
            },
            false,
            'openTab',
          );
          return id;
        },
        setTabMeta: (id, meta) =>
          set(
            (state) => {
              const target = state.tabs.find((t) => t.id === id);
              if (!target) return state;
              // 라벨은 메뉴/세그먼트발 부트스트랩 — 이후 breadcrumb 마지막 값(renameLabel)이 권위값이라
              // 여기선 url·appId·isDynamic만 확정 갱신하고 라벨은 새 도출값으로 재설정(상세 진입 시 '…' 등).
              return {
                tabs: state.tabs.map((t) => (t.id === id ? { ...t, appId: meta.appId, url: meta.url, label: meta.label, isDynamic: meta.isDynamic } : t)),
              };
            },
            false,
            'setTabMeta',
          ),
        closeTab: (id) => {
          let nextPath: string | null = null;
          set(
            (state) => {
              const idx = state.tabs.findIndex((t) => t.id === id);
              if (idx < 0) return state;
              const wasActive = state.activeId === id;
              let tabs = state.tabs.filter((t) => t.id !== id);
              const { [id]: _removed, ...breadcrumbsById } = state.breadcrumbsById;
              let activeId = state.activeId;
              if (wasActive) {
                if (tabs.length === 0) {
                  activeId = null;
                  nextPath = '/';
                } else {
                  // 닫은 위치 기준 인접 탭(우선 오른쪽, 끝이면 왼쪽)을 활성화. 재활성화한 탭은 lastActiveAt를
                  // 갱신해야 이후 openTab LRU가 "방금 본 탭"을 가장 오래된 탭으로 오판해 evict하지 않는다.
                  const neighbor = tabs[Math.min(idx, tabs.length - 1)];
                  activeId = neighbor.id;
                  nextPath = neighbor.url;
                  const now = Date.now();
                  tabs = tabs.map((t) => (t.id === neighbor.id ? { ...t, lastActiveAt: now } : t));
                }
              }
              return { tabs, activeId, breadcrumbsById };
            },
            false,
            'closeTab',
          );
          return { nextPath };
        },
        closeOthers: (id) => {
          let nextPath: string | null = null;
          set(
            (state) => {
              const target = state.tabs.find((t) => t.id === id);
              if (!target) return state;
              const breadcrumbsById = state.breadcrumbsById[id] ? { [id]: state.breadcrumbsById[id] } : {};
              if (state.activeId !== id) nextPath = target.url;
              // 남는 단일 탭이 활성이 되므로 lastActiveAt 갱신(LRU 신선도 유지).
              return { tabs: [{ ...target, lastActiveAt: Date.now() }], activeId: id, breadcrumbsById };
            },
            false,
            'closeOthers',
          );
          return { nextPath };
        },
        closeToRight: (id) => {
          let nextPath: string | null = null;
          set(
            (state) => {
              const idx = state.tabs.findIndex((t) => t.id === id);
              if (idx < 0) return state;
              let tabs = state.tabs.slice(0, idx + 1);
              const keepIds = new Set(tabs.map((t) => t.id));
              const breadcrumbsById = Object.fromEntries(Object.entries(state.breadcrumbsById).filter(([k]) => keepIds.has(k)));
              let activeId = state.activeId;
              // 활성 탭이 잘려나가면 기준 탭(id)을 활성화하고 lastActiveAt 갱신(LRU 신선도 유지).
              if (activeId && !keepIds.has(activeId)) {
                activeId = id;
                nextPath = tabs[idx].url;
                const now = Date.now();
                tabs = tabs.map((t) => (t.id === id ? { ...t, lastActiveAt: now } : t));
              }
              return { tabs, activeId, breadcrumbsById };
            },
            false,
            'closeToRight',
          );
          return { nextPath };
        },
        closeAll: () => {
          // nextSeq는 보존(닫아도 id 시퀀스는 계속 증가) — initialState 통째 적용 대신 목록만 비운다.
          set((state) => ({ tabs: [], activeId: null, breadcrumbsById: {}, nextSeq: state.nextSeq }), false, 'closeAll');
          return { nextPath: '/' };
        },
        activateTab: (id) =>
          set(
            (state) => ({
              tabs: state.tabs.map((t) => (t.id === id ? { ...t, lastActiveAt: Date.now() } : t)),
              activeId: id,
            }),
            false,
            'activateTab',
          ),
        clearActive: () => set((state) => (state.activeId === null ? state : { activeId: null }), false, 'clearActive'),
        renameLabel: (id, label) =>
          set(
            (state) => {
              if (!label) return state;
              const target = state.tabs.find((t) => t.id === id);
              if (!target || target.label === label) return state;
              return { tabs: state.tabs.map((t) => (t.id === id ? { ...t, label } : t)) };
            },
            false,
            'renameLabel',
          ),
        reorderTab: (fromId, toId) =>
          set(
            (state) => {
              if (fromId === toId) return state;
              const from = state.tabs.findIndex((t) => t.id === fromId);
              const to = state.tabs.findIndex((t) => t.id === toId);
              if (from < 0 || to < 0) return state;
              const tabs = [...state.tabs];
              const [moved] = tabs.splice(from, 1);
              tabs.splice(to, 0, moved);
              return { tabs };
            },
            false,
            'reorderTab',
          ),
        setTabBreadcrumb: (id, snapshot) =>
          set(
            (state) => {
              if (!state.tabs.some((t) => t.id === id)) return state;
              return { breadcrumbsById: { ...state.breadcrumbsById, [id]: snapshot } };
            },
            false,
            'setTabBreadcrumb',
          ),
        reset: () => set(initialState, false, 'reset'),
      }),
      {
        name: 'open-tabs-store',
        // 탭 목록은 세션 개념 — 새로고침엔 살아남고 브라우저 탭 종료 시 사라지도록 sessionStorage.
        // breadcrumbsById도 영속하되 문자열 title 항목만 sanitize해 저장(ReactNode 직렬화 깨짐 방지) →
        // 새로고침 후 아직 안 연 탭도 hover 툴팁/라벨 경로가 복원된다(페이지 마운트 시 실제 값으로 덮임).
        // nextSeq도 영속 — 새로고침 후 발급되는 id가 복원된 탭 id와 충돌하지 않게 한다.
        storage: createJSONStorage(() => sessionStorage),
        partialize: (state) => ({
          tabs: state.tabs,
          activeId: state.activeId,
          nextSeq: state.nextSeq,
          breadcrumbsById: serializableBreadcrumbs(state.breadcrumbsById),
        }),
      },
    ),
    { name: 'open-tabs-store' },
  ),
);
