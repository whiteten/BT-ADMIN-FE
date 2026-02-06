/**
 * 리소스 추가 Drawer
 * - 오른쪽에서 열리는 Drawer (프로젝트 공통 패턴)
 * - forwardRef + useImperativeHandle: ref.open() / ref.close()
 * - Ant Design Tree (checkable)로 리소스 선택
 * - 검색 기능 지원 (직접 필터링)
 * - 이미 등록된 항목은 비활성화 + "(등록됨)" 표시
 * - 미래 트리 데이터 대응: AvailableResource.children 지원
 */

import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { Button, Drawer, Input, Tree, type TreeDataNode } from 'antd';
import { Search } from 'lucide-react';
import type { AvailableResource } from '../types/userResource.types';

/**
 * ResourceAddDrawer ref 타입
 * @property open - 드로어를 여는 함수
 * @property close - 드로어를 닫는 함수
 */
export interface ResourceAddDrawerRef {
  open: (params: { alreadyAssignedIds: string[] }) => void;
  close: () => void;
}

interface ResourceAddDrawerProps {
  title: string;
  availableResources: AvailableResource[];
  onConfirm: (selectedIds: string[]) => void;
}

interface DrawerState {
  open: boolean;
  alreadyAssignedIds: string[];
}

const ResourceAddDrawer = forwardRef<ResourceAddDrawerRef, ResourceAddDrawerProps>(({ title, availableResources, onConfirm }, ref) => {
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    alreadyAssignedIds: [],
  });
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);
  const [searchValue, setSearchValue] = useState('');

  const { open, alreadyAssignedIds } = drawerState;

  useImperativeHandle(ref, () => ({
    open: (params) => {
      setDrawerState({
        open: true,
        alreadyAssignedIds: params.alreadyAssignedIds,
      });
      setCheckedKeys([]);
      setSearchValue('');
    },
    close: () => {
      setDrawerState((prev) => ({ ...prev, open: false }));
    },
  }));

  const handleClose = () => {
    setDrawerState((prev) => ({ ...prev, open: false }));
  };

  // AvailableResource -> TreeDataNode 변환
  const treeData: TreeDataNode[] = useMemo(() => {
    const convert = (items: AvailableResource[]): TreeDataNode[] =>
      items.map((item) => {
        const isAssigned = alreadyAssignedIds.includes(item.id);
        return {
          key: item.id,
          title: isAssigned ? (
            <>
              {item.name} <span className="text-gray-400 text-xs">(등록됨)</span>
            </>
          ) : (
            item.name
          ),
          disabled: isAssigned,
          children: item.children ? convert(item.children) : undefined,
        };
      });
    return convert(availableResources);
  }, [availableResources, alreadyAssignedIds]);

  // 검색 필터링 (Ant Design Tree의 filterTreeNode는 하이라이트만 지원하므로 직접 필터)
  const filteredTreeData = useMemo(() => {
    if (!searchValue.trim()) return treeData;
    const keyword = searchValue.toLowerCase();

    const filterNodes = (nodes: TreeDataNode[]): TreeDataNode[] => {
      return nodes
        .map((node) => {
          const resource = findResourceByKey(availableResources, String(node.key));
          const nodeName = resource?.name ?? '';
          const filteredChildren = node.children ? filterNodes(node.children) : [];

          if (nodeName.toLowerCase().includes(keyword) || filteredChildren.length > 0) {
            return {
              ...node,
              children: filteredChildren.length > 0 ? filteredChildren : node.children,
            };
          }
          return null;
        })
        .filter(Boolean) as TreeDataNode[];
    };
    return filterNodes(treeData);
  }, [treeData, availableResources, searchValue]);

  const handleCheck = (checked: React.Key[] | { checked: React.Key[]; halfChecked: React.Key[] }) => {
    const keys = Array.isArray(checked) ? checked : checked.checked;
    setCheckedKeys(keys);
  };

  // 신규 선택 건수 (이미 등록된 항목 제외)
  const newSelectionCount = checkedKeys.filter((key) => !alreadyAssignedIds.includes(String(key))).length;

  const handleConfirm = () => {
    const newIds = checkedKeys.filter((key) => !alreadyAssignedIds.includes(String(key))).map(String);
    onConfirm(newIds);
    handleClose();
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        취소
      </Button>
      <Button variant="solid" type="primary" onClick={handleConfirm} disabled={newSelectionCount === 0}>
        {newSelectionCount > 0 ? `${newSelectionCount}건 추가` : '추가'}
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title={title} closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      <div className="space-y-3">
        <Input
          prefix={<Search className="h-4 w-4 text-gray-400" />}
          placeholder="검색어를 입력하세요."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          allowClear
        />
        <div className="h-[calc(100vh-220px)] overflow-y-auto border border-gray-200 rounded-md p-2">
          {filteredTreeData.length > 0 ? (
            <Tree checkable checkedKeys={checkedKeys} onCheck={handleCheck} treeData={filteredTreeData} defaultExpandAll selectable={false} />
          ) : (
            <div className="text-gray-400 text-center py-8">{searchValue ? '검색 결과가 없습니다.' : '조회된 데이터가 없습니다.'}</div>
          )}
        </div>
        {alreadyAssignedIds.length > 0 && <div className="text-xs text-gray-400">* 이미 등록된 항목은 선택할 수 없습니다.</div>}
      </div>
    </Drawer>
  );
});

ResourceAddDrawer.displayName = 'ResourceAddDrawer';

export default ResourceAddDrawer;

/** AvailableResource 트리에서 key로 항목 찾기 (재귀) */
function findResourceByKey(resources: AvailableResource[], key: string): AvailableResource | undefined {
  for (const resource of resources) {
    if (resource.id === key) return resource;
    if (resource.children) {
      const found = findResourceByKey(resource.children, key);
      if (found) return found;
    }
  }
  return undefined;
}
