/**
 * 메뉴 트리 컴포넌트.
 * IAM 재설계 v2.3: menuId/parentId → menuKey/parentKey.
 *
 * 공통 트리(useTreeView + TreeView 프리미티브) 기반. 행 chrome(선택바·라벨·hover)은
 * 상담사 설정 트리와 톤을 맞추고, 노드 타입 아이콘(App/Folder/File)은 메뉴 도메인 자체 색상을 유지한다.
 */
import type { ReactNode } from 'react';
import { Button, Select } from 'antd';
import { AppWindow, File, Folder } from 'lucide-react';
import type { Menu } from '../types';
import { TreeCaret, TreeLabel, TreeRow } from '@/components/custom/TreeView';
import useTreeView, { type TreeViewItem } from '@/libs/shared-ui/src/hooks/useTreeView';

interface MenuTreeProps {
  menus: Menu[];
  apps: { label: string; value: string }[];
  selectedAppId: string;
  onAppChange: (appId: string) => void;
  selectedMenuKey: string | null;
  selectedTreeAppId?: string | null;
  onSelect: (menu: Menu | null) => void;
  onTreeAppSelect?: (appId: string | null) => void;
  onAdd: () => void;
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

export default function MenuTree({ menus, apps, selectedAppId, onAppChange, selectedMenuKey, selectedTreeAppId, onSelect, onTreeAppSelect, onAdd }: MenuTreeProps) {
  const filteredMenus = selectedAppId ? menus.filter((m) => m.appId === selectedAppId) : menus;
  const treeData = buildTree(filteredMenus);

  const { items, rootProps } = useTreeView<MenuTreeItem>({
    data: treeData,
    getId: (n) => n.key,
    getChildren: (n) => n.children,
    getName: (n) => n.label,
    defaultExpandAll: true,
    ariaLabel: '메뉴 트리',
  });

  const selectedKey = selectedTreeAppId ? `app:${selectedTreeAppId}` : selectedMenuKey ? `menu:${selectedMenuKey}` : null;

  const handleSelectNode = (node: MenuTreeItem) => {
    // 이미 선택된 노드를 다시 클릭하면 선택 해제 (antd Tree 토글 동작 보존)
    if (node.key === selectedKey) {
      onSelect(null);
      onTreeAppSelect?.(null);
      return;
    }
    if (node.key.startsWith('app:')) {
      onSelect(null);
      onTreeAppSelect?.(node.key.slice('app:'.length));
      return;
    }
    if (node.key.startsWith('menu:')) {
      onTreeAppSelect?.(null);
      const menuKey = node.key.slice('menu:'.length);
      const found = menus.find((m) => m.menuKey === menuKey);
      onSelect(found ?? null);
    }
  };

  const renderRow = (item: TreeViewItem<MenuTreeItem>) => {
    const node = item.node;
    const isSelected = node.key === selectedKey;
    return (
      <TreeRow key={item.id} item={item} selected={isSelected} onClick={() => handleSelectNode(node)}>
        <TreeCaret item={item} />
        {node.icon}
        <TreeLabel selected={isSelected}>{node.label}</TreeLabel>
      </TreeRow>
    );
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* 앱 필터 + 추가 버튼 */}
      <div className="flex gap-2">
        <Select options={apps} value={selectedAppId} onChange={onAppChange} className="flex-1" />
        <Button type="primary" onClick={onAdd}>
          추가
        </Button>
      </div>

      {/* 트리 */}
      <div className="flex-1 overflow-auto">
        {treeData.length > 0 ? (
          <div {...rootProps}>{items.map(renderRow)}</div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">메뉴가 없습니다</div>
        )}
      </div>
    </div>
  );
}
