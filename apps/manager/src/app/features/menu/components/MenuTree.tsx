/**
 * 메뉴 트리 컴포넌트.
 * IAM 재설계 v2.3: menuId/parentId → menuKey/parentKey.
 *
 * 공통 트리(useTreeView + TreeView 프리미티브) 기반. 상담그룹 트리(AgentGroupTree)와 동일 규격:
 * 상단 검색 입력 + "전체" 가상 행 + 트리. 행 chrome(선택바·라벨·hover)은 톤을 맞추고,
 * 노드 타입 아이콘(App/Folder/File)은 메뉴 도메인 자체 색상을 유지한다.
 * 패널 헤더(제목·추가 버튼)는 부모(MenuManagement)가 담당한다.
 */
import { type ReactNode, useState } from 'react';
import { Input, Popover, Tooltip } from 'antd';
import { AppWindow, ChevronDown, ChevronsDownUp, ChevronsUpDown, File, Folder, Plus, Search } from 'lucide-react';
import { fuzzyScore } from '@/shared-util';
import type { Menu } from '../types';
import { Highlight } from '@/components/custom/Highlight';
import { TreeCaret, TreeLabel, TreeRow } from '@/components/custom/TreeView';
import useTreeView, { type TreeViewItem } from '@/libs/shared-ui/src/hooks/useTreeView';

/**
 * 트리 액션 버튼 공통 Tooltip 옵션 — AgentGroupTree 와 동일 컴팩트 규격.
 * styles.container: antd v6 inner 키. minHeight:auto 로 기본 min-height(32px) 제거 + flex 중앙정렬.
 */
const TOOLTIP_PROPS = {
  mouseEnterDelay: 0.5,
  styles: {
    container: {
      minHeight: 'auto',
      fontSize: 12,
      lineHeight: '16px',
      padding: '4px 8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  },
} as const;

interface MenuTreeProps {
  menus: Menu[];
  selectedMenuKey: string | null;
  onSelect: (menu: Menu | null) => void;
  /** + 버튼 클릭 시 메뉴 추가 — parent(FOLDER면 부모로 사용)·fallbackAppId(최상위일 때 앱 프리셋). 드로어 open 시그니처와 동일. */
  onAddMenu: (parent: Menu | null, fallbackAppId?: string) => void;
}

/** 트리 렌더용 노드 — key 는 app:/menu: prefix 로 선택 라우팅 키를 보존. */
interface MenuTreeItem {
  key: string;
  label: string;
  icon: ReactNode;
  data?: Menu;
  children: MenuTreeItem[];
}

/** flat 메뉴 목록을 tree 구조로 변환 (menuKey 기반) */
function buildMenuTree(menus: Menu[]): MenuTreeItem[] {
  const map = new Map<string, MenuTreeItem>();
  const roots: MenuTreeItem[] = [];

  for (const menu of menus) {
    map.set(menu.menuKey, {
      key: `menu:${menu.menuKey}`,
      label: menu.label,
      icon: menu.type === 'FOLDER' ? <Folder className="size-4 text-amber-500" /> : <File className="size-4 text-blue-500" />,
      data: menu,
      children: [],
    });
  }

  for (const menu of menus) {
    const node = map.get(menu.menuKey);
    if (!node) continue;
    const parent = menu.parentKey ? map.get(menu.parentKey) : null;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/** 앱별로 그룹핑한 tree 구조 생성 */
function buildTree(menus: Menu[]): MenuTreeItem[] {
  const menusByApp = new Map<string, { appName: string; menus: Menu[] }>();
  for (const menu of menus) {
    const group = menusByApp.get(menu.appId) ?? { appName: menu.appName ?? menu.appId, menus: [] };
    group.menus.push(menu);
    menusByApp.set(menu.appId, group);
  }

  const result: MenuTreeItem[] = [];
  for (const [appId, { appName, menus: appMenus }] of menusByApp) {
    result.push({
      key: `app:${appId}`,
      label: appName,
      icon: <AppWindow className="size-4 text-green-600" />,
      children: buildMenuTree(appMenus),
    });
  }

  return result;
}

export default function MenuTree({ menus, selectedMenuKey, onSelect, onAddMenu }: MenuTreeProps) {
  const [searchText, setSearchText] = useState('');
  const [appFilter, setAppFilter] = useState<string | null>(null);
  const [appPopOpen, setAppPopOpen] = useState(false);

  // 앱 필터 칩 목록 — 메뉴가 존재하는 앱만, 등장 순서 유지
  const appChips: { appId: string; appName: string }[] = [];
  const seenApps = new Set<string>();
  for (const m of menus) {
    if (seenApps.has(m.appId)) continue;
    seenApps.add(m.appId);
    appChips.push({ appId: m.appId, appName: m.appName ?? m.appId });
  }

  // 칩으로 선택한 앱이 있으면 해당 앱 메뉴만 트리에 노출(기존 앱 Select 역할 대체).
  // 앱 선택 시엔 앱 루트 래퍼 없이 그 앱의 메뉴부터 바로 노출(buildMenuTree), 전체일 땐 앱별 그룹(buildTree).
  const filteredMenus = appFilter ? menus.filter((m) => m.appId === appFilter) : menus;
  const treeData = appFilter ? buildMenuTree(filteredMenus) : buildTree(filteredMenus);

  const selectedAppName = appFilter ? (appChips.find((a) => a.appId === appFilter)?.appName ?? '전체') : '전체';

  const pickApp = (appId: string | null) => {
    setAppFilter(appId);
    setAppPopOpen(false);
  };

  const chipClass = (active: boolean) =>
    `flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] transition ${
      active
        ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary)] text-white'
        : 'border-gray-200 bg-white text-gray-600 hover:border-[var(--color-bt-primary)] hover:text-[var(--color-bt-primary)]'
    }`;

  const { items, rootProps, allExpanded, toggleAll } = useTreeView<MenuTreeItem>({
    data: treeData,
    getId: (n) => n.key,
    getChildren: (n) => n.children,
    getName: (n) => n.label,
    searchText,
    matchesSearch: (n, kw) => fuzzyScore(kw, n.label) >= 0,
    defaultExpandAll: true,
    ariaLabel: '메뉴 트리',
  });

  const selectedKey = selectedMenuKey ? `menu:${selectedMenuKey}` : null;

  const handleSelectNode = (node: MenuTreeItem) => {
    // 이미 선택된 노드를 다시 클릭하면 선택 해제
    if (node.key === selectedKey) {
      onSelect(null);
      return;
    }
    // 앱 루트(depth 0)는 선택 비활성 — 그룹 헤더 역할만. 펼침/접힘은 caret 으로 처리.
    if (node.key.startsWith('app:')) {
      return;
    }
    if (node.key.startsWith('menu:')) {
      const menuKey = node.key.slice('menu:'.length);
      const found = menus.find((m) => m.menuKey === menuKey);
      onSelect(found ?? null);
    }
  };

  const renderRow = (item: TreeViewItem<MenuTreeItem>) => {
    const node = item.node;
    const isAppRoot = node.key.startsWith('app:');
    const isFolder = node.data?.type === 'FOLDER';
    // + 추가 버튼은 앱 루트·폴더 행에만 노출(leaf 메뉴 제외)
    const showAdd = isAppRoot || isFolder;
    const isSelected = node.key === selectedKey;
    return (
      <TreeRow key={item.id} item={item} selected={isSelected} onClick={() => handleSelectNode(node)} className={isAppRoot ? 'cursor-default' : undefined}>
        <TreeCaret item={item} />
        {node.icon}
        <TreeLabel selected={isSelected}>
          <Highlight text={node.label} query={searchText} />
        </TreeLabel>
        {/* 우측 액션 슬롯 — 모든 행에 h-5 고정으로 상시 존재시켜 hover 시 행 높이가 흔들리지 않게 한다(상담그룹 카운트 span과 동일 역할). */}
        <div className="flex items-center h-5 flex-shrink-0">
          {showAdd && (
            <Tooltip title="하위 메뉴 추가" {...TOOLTIP_PROPS}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  // 앱 루트: 최상위 메뉴(부모 없음) + 해당 앱 프리셋 / 폴더: 그 폴더를 부모로
                  if (isAppRoot) onAddMenu(null, node.key.slice('app:'.length));
                  else onAddMenu(node.data ?? null);
                }}
                className="hidden group-hover:inline-flex w-5 h-5 items-center justify-center rounded text-gray-400 hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)]"
              >
                <Plus className="size-3.5" />
              </button>
            </Tooltip>
          )}
        </div>
      </TreeRow>
    );
  };

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      {/* 검색 — 이전 셀렉트박스와 동일한 기본 크기 */}
      <Input allowClear prefix={<Search className="size-4 text-gray-400" />} placeholder="메뉴 검색" value={searchText} onChange={(e) => setSearchText(e.target.value)} />

      {/* 앱 필터 — 트리거 칩 클릭 시 팝오버에서 전체/앱 선택. 기존 앱 Select 역할 대체 */}
      <Popover
        open={appPopOpen}
        onOpenChange={setAppPopOpen}
        trigger="click"
        placement="bottomLeft"
        content={
          <div className="flex w-[240px] flex-wrap gap-1.5 max-h-[220px] overflow-auto">
            <button type="button" onClick={() => pickApp(null)} className={chipClass(appFilter === null)}>
              전체
            </button>
            {appChips.map((a) => (
              <button key={a.appId} type="button" onClick={() => pickApp(a.appId)} className={chipClass(appFilter === a.appId)} title={a.appName}>
                {a.appName}
              </button>
            ))}
          </div>
        }
      >
        <button
          type="button"
          className={`self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs transition ${
            appFilter !== null
              ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary-soft)] text-[var(--color-bt-primary)]'
              : 'border-gray-200 bg-white text-gray-600 hover:border-[var(--color-bt-primary)] hover:text-[var(--color-bt-primary)]'
          }`}
        >
          <span>앱: {selectedAppName}</span>
          <ChevronDown className="size-3.5" />
        </button>
      </Popover>

      {/* 앱 필터(앱선택)와 메뉴 트리 사이 구분선 */}
      <div className="border-t border-gray-200" />

      <div className="flex-1 overflow-auto py-1">
        {/* 전체 — 0뎁스(앱 루트)처럼 선택 비활성(단 hover 배경은 적용). 우측 + 추가·펼치기/접기 토글 상시 노출. */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 select-none border-l-[3px] border-transparent cursor-default hover:bg-gray-50 transition">
          <span className="flex-1 text-[12.5px] truncate text-gray-700">메뉴 목록</span>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Tooltip title="메뉴 추가" {...TOOLTIP_PROPS}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  // 최상위 메뉴 추가(부모 없음). 앱이 선택돼 있으면 그 앱을 프리셋, 전체면 드로어에서 앱 선택.
                  onAddMenu(null, appFilter ?? undefined);
                }}
                className="inline-flex w-5 h-5 items-center justify-center rounded text-gray-400 hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)]"
              >
                <Plus className="size-3.5" />
              </button>
            </Tooltip>
            <Tooltip title={allExpanded ? '모두 접기' : '모두 펼치기'} {...TOOLTIP_PROPS}>
              <button
                type="button"
                onClick={() => toggleAll()}
                className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)] transition"
              >
                {allExpanded ? <ChevronsDownUp className="size-3.5" /> : <ChevronsUpDown className="size-3.5" />}
              </button>
            </Tooltip>
          </div>
        </div>

        {treeData.length > 0 ? <div {...rootProps}>{items.map(renderRow)}</div> : <div className="px-3 py-6 text-center text-[11px] text-gray-400">메뉴가 없습니다</div>}
      </div>
    </div>
  );
}
