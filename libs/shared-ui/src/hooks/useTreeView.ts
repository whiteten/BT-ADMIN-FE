/**
 * useTreeView — headless-tree 배선을 전담하는 공통 트리 훅.
 *
 * 프로젝트 전반의 트리 UI를 단일 라이브러리(headless-tree)로 통일하기 위한 코어 훅.
 * 재귀 렌더 평탄화 / 펼침·접힘 / 들여쓰기 / 키보드 a11y / 검색(필터형) 을 흡수하고,
 * 선택·DnD·아이콘·액션·카운트 등 도메인 결합 로직은 소비처가 주입한다.
 *
 * 검색은 headless-tree 기본 searchFeature(하이라이트형)가 아니라 "필터형" UX 다.
 * 단, 데이터를 rebuild 하지 않는다 — dataLoader 는 항상 전체 트리로 고정하고,
 * 매칭+조상 폴더만 펼친 뒤 렌더 단계에서 가시 id 집합으로 행을 필터한다.
 * (과거 filterTree→rebuildTree→expandAll 조합이 일으킨 런타임 크래시를 구조적으로 회피)
 */
import { type HTMLAttributes, type MouseEvent, type Ref, useEffect, useRef, useState } from 'react';
import { expandAllFeature, hotkeysCoreFeature, syncDataLoaderFeature } from '@headless-tree/core';
import { useTree } from '@headless-tree/react';

/** 합성 루트 id — 렌더되지 않는 컨테이너 노드. */
const ROOT_ID = '__root__';

/** TreeRow 등 행 요소에 스프레드할 div props (ref 포함). */
export type TreeRowDivProps = HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> };

/** 평탄화된 가시 항목 — 원본 ItemInstance 위의 얇은 래퍼. */
export interface TreeViewItem<T> {
  id: string;
  node: T;
  /** 0-base depth (level). 들여쓰기에 사용. */
  depth: number;
  isFolder: boolean;
  isExpanded: boolean;
  expand: () => void;
  collapse: () => void;
  toggle: () => void;
  /**
   * 행 div 에 스프레드할 props. headless-tree 기본 props(ref·role·aria·tabIndex)를 머지하되
   * 기본 onClick 의 폴더 펼침 토글을 제거한다(행 클릭=선택만, 펼침은 caret 전용).
   * onClick 은 setFocused 후 extra.onClick 을 호출. draggable·onDrag*·style·className 등은 그대로 머지.
   */
  getRowProps: (extra?: TreeRowDivProps) => TreeRowDivProps;
}

export interface UseTreeViewOptions<T> {
  /** 이미 nested 된 트리 데이터. */
  data: T[];
  getId: (node: T) => string;
  getChildren: (node: T) => T[] | undefined;
  getName: (node: T) => string;
  /** 컨트롤드 검색어(소비처가 Input 보유). 비어 있으면 전체 표시. */
  searchText?: string;
  /** 매칭 판정. 미지정 시 getName 부분일치(대소문자 무시). */
  matchesSearch?: (node: T, keyword: string) => boolean;
  /** 마운트·데이터 변경 시 전체 펼침 유지. */
  defaultExpandAll?: boolean;
  ariaLabel?: string;
}

export interface UseTreeViewResult<T> {
  items: TreeViewItem<T>[];
  rootProps: TreeRowDivProps;
  allExpanded: boolean;
  toggleAll: () => void;
  expandAll: () => void;
  collapseAll: () => void;
}

interface TreeMaps<T> {
  nodeById: Record<string, T>;
  childIdsById: Record<string, string[]>;
  parentById: Record<string, string>;
  folderIds: string[];
}

function buildMaps<T>(data: T[], getId: (n: T) => string, getChildren: (n: T) => T[] | undefined): TreeMaps<T> {
  const nodeById: Record<string, T> = {};
  const childIdsById: Record<string, string[]> = {};
  const parentById: Record<string, string> = {};
  const folderIds: string[] = [];

  const walk = (nodes: T[], parentId: string): string[] => {
    const ids: string[] = [];
    for (const n of nodes) {
      const id = getId(n);
      ids.push(id);
      nodeById[id] = n;
      parentById[id] = parentId;
      const children = getChildren(n) ?? [];
      childIdsById[id] = children.length ? walk(children, id) : [];
      if (children.length) folderIds.push(id);
    }
    return ids;
  };

  childIdsById[ROOT_ID] = walk(data, ROOT_ID);
  return { nodeById, childIdsById, parentById, folderIds };
}

/** 검색 시 가시 id 집합 + 펼칠 폴더 id 계산. 매칭 노드의 전체 서브트리 + 조상 경로를 노출. */
function computeSearchVisibility<T>(maps: TreeMaps<T>, keyword: string, matches: (node: T, kw: string) => boolean): { visible: Set<string>; toExpand: string[] } {
  const matched = new Set<string>();
  for (const id of Object.keys(maps.nodeById)) {
    if (matches(maps.nodeById[id], keyword)) matched.add(id);
  }

  const visible = new Set<string>();
  const addSubtree = (id: string) => {
    visible.add(id);
    for (const c of maps.childIdsById[id] ?? []) addSubtree(c);
  };
  for (const id of matched) {
    addSubtree(id);
    let p = maps.parentById[id];
    while (p && p !== ROOT_ID) {
      visible.add(p);
      p = maps.parentById[p];
    }
  }

  const toExpand = [...visible].filter((id) => (maps.childIdsById[id]?.length ?? 0) > 0);
  return { visible, toExpand };
}

/**
 * 구조 시그니처 — 부모→자식 관계를 직렬화한 문자열.
 * 이펙트를 data 배열 "참조"가 아니라 이 "구조"에 키잉해, 참조만 바뀐 렌더에서 rebuild/expandAll 이
 * 재실행돼 무한 루프(특히 defaultExpandAll)로 번지는 것을 막는다.
 */
function buildSignature<T>(maps: TreeMaps<T>): string {
  return Object.keys(maps.childIdsById)
    .sort()
    .map((id) => `${id}>${maps.childIdsById[id].join(',')}`)
    .join('|');
}

export default function useTreeView<T>(options: UseTreeViewOptions<T>): UseTreeViewResult<T> {
  const { data, defaultExpandAll = false, ariaLabel = 'tree' } = options;
  const searchText = (options.searchText ?? '').trim();

  // 콜백을 ref 에 보관 — config 클로저/이펙트가 항상 최신을 읽되, 이펙트 deps 는 안정적으로 유지.
  const cbRef = useRef(options);
  cbRef.current = options;

  // 데이터 맵을 매 렌더 동기 갱신 — dataLoader 클로저(아래)가 항상 최신 전체 데이터를 읽도록.
  const maps = buildMaps(data, options.getId, options.getChildren);
  const mapsRef = useRef(maps);
  mapsRef.current = maps;
  // 구조 시그니처 — 이펙트는 이 값에만 의존(배열 참조 변화에 휘둘리지 않음).
  const signature = buildSignature(maps);

  const [initialState] = useState(() => ({ expandedItems: [ROOT_ID] }));

  const tree = useTree<T>({
    rootItemId: ROOT_ID,
    // getItemData 가 stale id 로 undefined 를 줄 수 있어 null-safe 처리.
    getItemName: (item) => {
      if (item.getId() === ROOT_ID) return '';
      const node = item.getItemData();
      return node ? cbRef.current.getName(node) : '';
    },
    isItemFolder: (item) => (mapsRef.current.childIdsById[item.getId()]?.length ?? 0) > 0,
    dataLoader: {
      getItem: (itemId) => (itemId === ROOT_ID ? ({} as T) : (mapsRef.current.nodeById[itemId] ?? ({} as T))),
      getChildren: (itemId) => mapsRef.current.childIdsById[itemId] ?? [],
    },
    initialState,
    features: [syncDataLoaderFeature, hotkeysCoreFeature, expandAllFeature],
  });

  // 구조 시그니처가 바뀌면 렌더 중 동기로 재빌드를 예약한다 — 아래 getItems() 가 즉시 새 데이터로 재빌드해
  // "데이터는 교체됐는데 트리는 옛 item 을 반환"하는 1프레임 stale 상태를 제거한다.
  // (이 stale 프레임에서 소비처가 옛 노드의 필드에 접근하다 렌더 중 throw 하는 것이 데이터 변경 크래시의 근본 원인)
  const prevSignatureRef = useRef<string | null>(null);
  if (prevSignatureRef.current !== signature) {
    prevSignatureRef.current = signature;
    tree.scheduleRebuildTree();
  }

  // tree 참조를 ref 에 보관 — useTree() 가 매 렌더 새 참조를 반환하는 경우에도
  // useEffect deps 에 포함되지 않아 signature/searchText 와 무관한 무한 실행을 방지한다.
  const treeRef = useRef(tree);
  treeRef.current = tree;

  // 전체 펼침 모드 — 구조 변경 시 전체 펼침. signature 에만 의존해 무한 루프 방지.
  useEffect(() => {
    if (defaultExpandAll && signature) {
      void treeRef.current.expandAll();
    }
    // tree 참조 대신 treeRef 사용 — tree 가 deps 에 있으면 매 렌더 실행됨.
  }, [defaultExpandAll, signature]);

  // 검색 — 데이터 rebuild 없이 매칭+조상만 펼치고, 진입 직전 펼침 상태를 snapshot 해 해제 시 복원.
  const searchSnapshotRef = useRef<string[] | null>(null);
  useEffect(() => {
    const t = treeRef.current;
    if (!searchText) {
      if (searchSnapshotRef.current) {
        const snap = searchSnapshotRef.current;
        searchSnapshotRef.current = null;
        t.applySubStateUpdate('expandedItems', () => snap);
        t.rebuildTree();
      }
      return;
    }
    searchSnapshotRef.current ??= t.getState().expandedItems;
    const matches = cbRef.current.matchesSearch ?? ((n: T, kw: string) => cbRef.current.getName(n).toLowerCase().includes(kw.toLowerCase()));
    const { toExpand } = computeSearchVisibility(mapsRef.current, searchText, matches);
    t.applySubStateUpdate('expandedItems', (prev) => [...new Set([...prev, ...toExpand])]);
    t.rebuildTree();
    // tree 참조 대신 treeRef 사용.
  }, [searchText, signature]);

  // 검색 시 가시 id 집합 — 펼친 조상이 끌어온 비매칭 형제를 렌더 단계에서 제거.
  let visibleIds: Set<string> | null = null;
  if (searchText) {
    const matches = options.matchesSearch ?? ((n: T, kw: string) => options.getName(n).toLowerCase().includes(kw.toLowerCase()));
    visibleIds = computeSearchVisibility(maps, searchText, matches).visible;
  }

  const rawItems = tree.getItems().filter((it) => it.getId() !== ROOT_ID && (!visibleIds || visibleIds.has(it.getId())));

  const items: TreeViewItem<T>[] = rawItems.map((it) => ({
    id: it.getId(),
    node: it.getItemData(),
    depth: it.getItemMeta().level,
    isFolder: it.isFolder(),
    isExpanded: it.isExpanded(),
    expand: () => it.expand(),
    collapse: () => it.collapse(),
    toggle: () => (it.isExpanded() ? it.collapse() : it.expand()),
    getRowProps: (extra: TreeRowDivProps = {}) => {
      // 기본 onClick(폴더 펼침 토글)은 아래 onClick 으로 덮어쓴다 — 행 클릭=선택만.
      const merged: TreeRowDivProps = { ...(it.getProps() as TreeRowDivProps), ...extra };
      merged.onClick = (e: MouseEvent<HTMLDivElement>) => {
        it.setFocused();
        extra.onClick?.(e);
      };
      return merged;
    },
  }));

  const expandedSet = new Set(tree.getState().expandedItems);
  const allExpanded = maps.folderIds.length > 0 && maps.folderIds.every((id) => expandedSet.has(id));

  const expandAll = () => void tree.expandAll();
  const collapseAll = () => tree.collapseAll();
  const toggleAll = () => (allExpanded ? collapseAll() : expandAll());

  return {
    items,
    rootProps: tree.getContainerProps(ariaLabel) as TreeRowDivProps,
    allExpanded,
    toggleAll,
    expandAll,
    collapseAll,
  };
}
