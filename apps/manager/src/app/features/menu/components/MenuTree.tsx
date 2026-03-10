/**
 * 메뉴 트리 컴포넌트
 * - 앱 필터 Select
 * - Ant Design Tree (flat → tree 변환)
 * - 노드 선택 시 onSelect 콜백
 */

import { useMemo } from 'react';
import { Button, Select, Tree, type TreeProps } from 'antd';
import { AppWindow, File, Folder } from 'lucide-react';
import type { Menu, MenuTreeNode } from '../types/menu.types';

interface MenuTreeProps {
  menus: Menu[];
  apps: { label: string; value: string }[];
  selectedAppId: string;
  onAppChange: (appId: string) => void;
  selectedMenuId: number | null;
  selectedTreeAppId?: string | null;
  onSelect: (menu: Menu | null) => void;
  onTreeAppSelect?: (appId: string | null) => void;
  onAdd: () => void;
}

/** flat 메뉴 목록을 tree 구조로 변환 */
function buildMenuTree(menus: Menu[]): MenuTreeNode[] {
  const map = new Map<number, MenuTreeNode>();
  const roots: MenuTreeNode[] = [];

  for (const menu of menus) {
    map.set(menu.menuId, {
      key: menu.menuId,
      title: menu.label,
      children: [],
      icon: menu.type === 'FOLDER' ? <Folder className="size-4 text-amber-500" /> : <File className="size-4 text-blue-500" />,
      data: menu,
    });
  }

  for (const menu of menus) {
    const node = map.get(menu.menuId);
    if (!node) continue;
    const parent = menu.parentId ? map.get(menu.parentId) : null;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/** 앱별로 그룹핑한 tree 구조 생성 */
function buildTree(menus: Menu[]): MenuTreeNode[] {
  // appId별 메뉴 그룹핑
  const menusByApp = new Map<string, { appName: string; menus: Menu[] }>();
  for (const menu of menus) {
    const group = menusByApp.get(menu.appId) ?? { appName: menu.appName ?? menu.appId, menus: [] };
    group.menus.push(menu);
    menusByApp.set(menu.appId, group);
  }

  // 앱별로 트리 노드 생성
  const result: MenuTreeNode[] = [];
  for (const [appId, { appName, menus: appMenus }] of menusByApp) {
    result.push({
      key: `app:${appId}`,
      title: appName,
      children: buildMenuTree(appMenus),
      icon: <AppWindow className="size-4 text-green-600" />,
    });
  }

  return result;
}

export default function MenuTree({ menus, apps, selectedAppId, onAppChange, selectedMenuId, selectedTreeAppId, onSelect, onTreeAppSelect, onAdd }: MenuTreeProps) {
  // 앱 필터 적용
  const filteredMenus = useMemo(() => {
    if (!selectedAppId) return menus;
    return menus.filter((m) => m.appId === selectedAppId);
  }, [menus, selectedAppId]);

  // 트리 데이터 생성 (앱별 그룹핑)
  const treeData = useMemo(() => buildTree(filteredMenus), [filteredMenus]);

  // 노드 선택 핸들러
  const handleSelect: TreeProps['onSelect'] = (selectedKeys) => {
    if (selectedKeys.length === 0) {
      onSelect(null);
      onTreeAppSelect?.(null);
      return;
    }
    const key = selectedKeys[0];
    if (typeof key === 'string' && String(key).startsWith('app:')) {
      // 앱 그룹 노드 선택
      const appId = String(key).replace('app:', '');
      onSelect(null);
      onTreeAppSelect?.(appId);
      return;
    }
    onTreeAppSelect?.(null);
    const found = menus.find((m) => m.menuId === key);
    onSelect(found ?? null);
  };

  // 선택된 키: 메뉴 또는 앱 노드
  const derivedSelectedKeys = selectedTreeAppId ? [`app:${selectedTreeAppId}`] : selectedMenuId ? [selectedMenuId] : [];

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
      <div className="flex-1 overflow-auto border border-gray-200 rounded-lg p-2">
        {treeData.length > 0 ? (
          <Tree showIcon defaultExpandAll treeData={treeData} selectedKeys={derivedSelectedKeys} onSelect={handleSelect} className="menu-tree" />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">메뉴가 없습니다</div>
        )}
      </div>
    </div>
  );
}
