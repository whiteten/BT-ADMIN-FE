/**
 * 메뉴 트리 컴포넌트
 * - 앱 필터 Select
 * - Ant Design Tree (flat → tree 변환)
 * - 노드 선택 시 onSelect 콜백
 */

import { useMemo } from 'react';
import { Button, Select, Tree, type TreeProps } from 'antd';
import { File, Folder } from 'lucide-react';
import type { Menu, MenuTreeNode } from '../types/menu.types';

interface MenuTreeProps {
  menus: Menu[];
  apps: { label: string; value: string }[];
  selectedAppId: string;
  onAppChange: (appId: string) => void;
  selectedMenuId: number | null;
  onSelect: (menu: Menu | null) => void;
  onAdd: () => void;
}

/** flat 메뉴 목록을 tree 구조로 변환 */
function buildTree(menus: Menu[]): MenuTreeNode[] {
  const map = new Map<number, MenuTreeNode>();
  const roots: MenuTreeNode[] = [];

  // 먼저 모든 노드 생성
  for (const menu of menus) {
    map.set(menu.menuId, {
      key: menu.menuId,
      title: menu.label,
      children: [],
      icon: menu.type === 'FOLDER' ? <Folder className="size-4 text-amber-500" /> : <File className="size-4 text-blue-500" />,
      data: menu,
    });
  }

  // 부모-자식 관계 설정
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

export default function MenuTree({ menus, apps, selectedAppId, onAppChange, selectedMenuId, onSelect, onAdd }: MenuTreeProps) {
  // 앱 필터 적용
  const filteredMenus = useMemo(() => {
    if (!selectedAppId) return menus;
    return menus.filter((m) => m.appId === selectedAppId);
  }, [menus, selectedAppId]);

  // 트리 데이터 생성
  const treeData = useMemo(() => buildTree(filteredMenus), [filteredMenus]);

  // 노드 선택 핸들러
  const handleSelect: TreeProps['onSelect'] = (selectedKeys) => {
    if (selectedKeys.length === 0) {
      onSelect(null);
      return;
    }
    const menuId = selectedKeys[0] as number;
    const found = menus.find((m) => m.menuId === menuId);
    onSelect(found ?? null);
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
      <div className="flex-1 overflow-auto border border-gray-200 rounded-lg p-2">
        {treeData.length > 0 ? (
          <Tree showIcon defaultExpandAll treeData={treeData} selectedKeys={selectedMenuId ? [selectedMenuId] : []} onSelect={handleSelect} className="menu-tree" />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">메뉴가 없습니다</div>
        )}
      </div>
    </div>
  );
}
