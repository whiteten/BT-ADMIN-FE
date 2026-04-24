/**
 * 메뉴 트리 컴포넌트.
 * IAM 재설계 v2.3: menuId/parentId → menuKey/parentKey.
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
  selectedMenuKey: string | null;
  selectedTreeAppId?: string | null;
  onSelect: (menu: Menu | null) => void;
  onTreeAppSelect?: (appId: string | null) => void;
  onAdd: () => void;
}

/** flat 메뉴 목록을 tree 구조로 변환 (menuKey 기반) */
function buildMenuTree(menus: Menu[]): MenuTreeNode[] {
  const map = new Map<string, MenuTreeNode>();
  const roots: MenuTreeNode[] = [];

  for (const menu of menus) {
    map.set(menu.menuKey, {
      key: `menu:${menu.menuKey}`,
      title: menu.label,
      children: [],
      icon: menu.type === 'FOLDER' ? <Folder className="size-4 text-amber-500" /> : <File className="size-4 text-blue-500" />,
      data: menu,
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
function buildTree(menus: Menu[]): MenuTreeNode[] {
  const menusByApp = new Map<string, { appName: string; menus: Menu[] }>();
  for (const menu of menus) {
    const group = menusByApp.get(menu.appId) ?? { appName: menu.appName ?? menu.appId, menus: [] };
    group.menus.push(menu);
    menusByApp.set(menu.appId, group);
  }

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

export default function MenuTree({ menus, apps, selectedAppId, onAppChange, selectedMenuKey, selectedTreeAppId, onSelect, onTreeAppSelect, onAdd }: MenuTreeProps) {
  const filteredMenus = useMemo(() => {
    if (!selectedAppId) return menus;
    return menus.filter((m) => m.appId === selectedAppId);
  }, [menus, selectedAppId]);

  const treeData = useMemo(() => buildTree(filteredMenus), [filteredMenus]);

  const handleSelect: TreeProps['onSelect'] = (selectedKeys) => {
    if (selectedKeys.length === 0) {
      onSelect(null);
      onTreeAppSelect?.(null);
      return;
    }
    const keyStr = String(selectedKeys[0]);
    if (keyStr.startsWith('app:')) {
      const appId = keyStr.slice('app:'.length);
      onSelect(null);
      onTreeAppSelect?.(appId);
      return;
    }
    if (keyStr.startsWith('menu:')) {
      const menuKey = keyStr.slice('menu:'.length);
      onTreeAppSelect?.(null);
      const found = menus.find((m) => m.menuKey === menuKey);
      onSelect(found ?? null);
    }
  };

  const derivedSelectedKeys: string[] = selectedTreeAppId ? [`app:${selectedTreeAppId}`] : selectedMenuKey ? [`menu:${selectedMenuKey}`] : [];

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
          <Tree showIcon defaultExpandAll treeData={treeData} selectedKeys={derivedSelectedKeys} onSelect={handleSelect} className="menu-tree" />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">메뉴가 없습니다</div>
        )}
      </div>
    </div>
  );
}
