/**
 * 리소스 추가 Drawer (통합)
 * - 여러 리소스 타입(BOT, NLU_MODEL...)을 하나의 Drawer에서 섹션으로 구분하여 선택
 * - 각 섹션은 독립적인 Tree + 체크 상태를 보유
 * - 검색은 전 섹션에 동시 적용 (각 섹션 내부에서 필터링)
 * - 이미 등록된 항목은 비활성화 + "(등록됨)" 표시
 */

import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { Button, Drawer, Input, Tag, Tree, type TreeDataNode } from 'antd';
import { Search } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import type { AvailableResource } from '../types/userResource.types';

/** Drawer에 전달되는 그룹 정의 */
export interface ResourceDrawerGroup {
  resourceType: string;
  title: string;
  availableResources: AvailableResource[];
}

/**
 * ResourceAddDrawer ref 타입
 * @property open - 드로어를 여는 함수
 * @property close - 드로어를 닫는 함수
 */
export interface ResourceAddDrawerRef {
  open: (params: { alreadyAssignedIdsByType: Record<string, string[]> }) => void;
  close: () => void;
}

interface ResourceAddDrawerProps {
  title: string;
  groups: ResourceDrawerGroup[];
  onConfirm: (selectedIdsByType: Record<string, string[]>) => void;
}

interface DrawerState {
  open: boolean;
  alreadyAssignedIdsByType: Record<string, string[]>;
}

const ResourceAddDrawer = forwardRef<ResourceAddDrawerRef, ResourceAddDrawerProps>(({ title, groups, onConfirm }, ref) => {
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    alreadyAssignedIdsByType: {},
  });
  const [checkedKeysByType, setCheckedKeysByType] = useState<Record<string, React.Key[]>>({});
  const [searchValue, setSearchValue] = useState('');

  const { open, alreadyAssignedIdsByType } = drawerState;

  useImperativeHandle(ref, () => ({
    open: (params) => {
      setDrawerState({
        open: true,
        alreadyAssignedIdsByType: params.alreadyAssignedIdsByType,
      });
      setCheckedKeysByType({});
      setSearchValue('');
    },
    close: () => {
      setDrawerState((prev) => ({ ...prev, open: false }));
    },
  }));

  const handleClose = () => {
    setDrawerState((prev) => ({ ...prev, open: false }));
  };

  // 그룹별 트리 데이터 변환 (이미 등록된 항목 비활성화)
  const treeDataByType = useMemo(() => {
    const result: Record<string, TreeDataNode[]> = {};
    groups.forEach((group) => {
      const alreadyAssignedIds = alreadyAssignedIdsByType[group.resourceType] ?? [];
      const convert = (items: AvailableResource[]): TreeDataNode[] =>
        items.map((item) => {
          const isAssigned = alreadyAssignedIds.includes(item.id);
          const nameLabel = (
            <div className="flex flex-col">
              <div className="flex items-center gap-1 h-6 leading-6">
                <span className="truncate max-w-[350px]">{item.name}</span>
                {item.tag && (
                  <Tag color="blue" className="!m-0">
                    {item.tag}
                  </Tag>
                )}
                {isAssigned && <span className="text-gray-400 text-xs">(등록됨)</span>}
              </div>
              {item.description && <div className="text-gray-400 text-xs leading-4 truncate max-w-[350px]">{item.description}</div>}
            </div>
          );
          return {
            key: item.id,
            title: nameLabel,
            disabled: isAssigned,
            children: item.children ? convert(item.children) : undefined,
          };
        });
      result[group.resourceType] = convert(group.availableResources);
    });
    return result;
  }, [groups, alreadyAssignedIdsByType]);

  // 그룹별 검색 필터링
  const filteredTreeDataByType = useMemo(() => {
    if (!searchValue.trim()) return treeDataByType;
    const keyword = searchValue.toLowerCase();
    const result: Record<string, TreeDataNode[]> = {};

    groups.forEach((group) => {
      const filterNodes = (nodes: TreeDataNode[]): TreeDataNode[] =>
        nodes
          .map((node) => {
            const resource = findResourceByKey(group.availableResources, String(node.key));
            const nodeName = resource?.name ?? '';
            const nodeDesc = resource?.description ?? '';
            const filteredChildren = node.children ? filterNodes(node.children) : [];

            if (nodeName.toLowerCase().includes(keyword) || nodeDesc.toLowerCase().includes(keyword) || filteredChildren.length > 0) {
              return {
                ...node,
                children: filteredChildren.length > 0 ? filteredChildren : node.children,
              };
            }
            return null;
          })
          .filter(Boolean) as TreeDataNode[];
      result[group.resourceType] = filterNodes(treeDataByType[group.resourceType] ?? []);
    });
    return result;
  }, [groups, treeDataByType, searchValue]);

  const handleCheck = (resourceType: string, checked: React.Key[] | { checked: React.Key[]; halfChecked: React.Key[] }) => {
    const keys = Array.isArray(checked) ? checked : checked.checked;
    setCheckedKeysByType((prev) => ({ ...prev, [resourceType]: keys }));
  };

  // 그룹별 신규 선택 건수 (이미 등록된 항목 제외)
  const newSelectionCountByType = useMemo(() => {
    const result: Record<string, number> = {};
    groups.forEach((group) => {
      const checkedKeys = checkedKeysByType[group.resourceType] ?? [];
      const alreadyAssignedIds = alreadyAssignedIdsByType[group.resourceType] ?? [];
      result[group.resourceType] = checkedKeys.filter((key) => !alreadyAssignedIds.includes(String(key))).length;
    });
    return result;
  }, [groups, checkedKeysByType, alreadyAssignedIdsByType]);

  const totalNewSelectionCount = Object.values(newSelectionCountByType).reduce((acc, n) => acc + n, 0);

  const handleConfirm = () => {
    const selectedIdsByType: Record<string, string[]> = {};
    groups.forEach((group) => {
      const checkedKeys = checkedKeysByType[group.resourceType] ?? [];
      const alreadyAssignedIds = alreadyAssignedIdsByType[group.resourceType] ?? [];
      selectedIdsByType[group.resourceType] = checkedKeys.filter((key) => !alreadyAssignedIds.includes(String(key))).map(String);
    });
    onConfirm(selectedIdsByType);
    handleClose();
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        취소
      </Button>
      <Button variant="solid" type="primary" onClick={handleConfirm} disabled={totalNewSelectionCount === 0}>
        {totalNewSelectionCount > 0 ? `${totalNewSelectionCount}건 추가` : '추가'}
      </Button>
    </div>
  );

  const hasAnyAssigned = Object.values(alreadyAssignedIdsByType).some((ids) => ids.length > 0);

  return (
    <Drawer open={open} onClose={handleClose} title={title} closable={{ placement: 'end' }} size={520} footer={footer} destroyOnHidden>
      <div className="flex flex-col h-full gap-3">
        <Input
          prefix={<Search className="h-4 w-4 text-gray-400" />}
          placeholder="검색어를 입력하세요."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          allowClear
        />
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
          {groups.map((group) => {
            const filteredTree = filteredTreeDataByType[group.resourceType] ?? [];
            const selectedCount = newSelectionCountByType[group.resourceType] ?? 0;
            const totalInType = countTreeNodes(treeDataByType[group.resourceType] ?? []);
            return (
              <section key={group.resourceType} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {/* 섹션 헤더: 색상 인디케이터 + 타입명 + 건수 */}
                <header className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: getTypeAccent(group.resourceType) }} />
                    <span className="text-sm font-semibold text-gray-800">{group.title}</span>
                    <span className="text-xs text-gray-400 font-mono">{group.resourceType}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {selectedCount > 0 && <span className="text-blue-600 font-medium">{selectedCount}건 선택</span>}
                    <span className="text-gray-400">전체 {totalInType}건</span>
                  </div>
                </header>

                {/* 섹션 바디: 트리 */}
                <div className="p-2">
                  {filteredTree.length > 0 ? (
                    <Tree
                      checkable
                      checkedKeys={checkedKeysByType[group.resourceType] ?? []}
                      onCheck={(checked) => handleCheck(group.resourceType, checked)}
                      treeData={filteredTree}
                      defaultExpandAll
                      selectable={false}
                      className="[&_.ant-tree-treenode]:!items-start [&_.ant-tree-checkbox]:!mt-1 [&_.ant-tree-node-content-wrapper]:!leading-6"
                    />
                  ) : (
                    <div className="text-gray-400 text-center py-6 text-sm">{searchValue ? '검색 결과가 없습니다.' : '조회된 데이터가 없습니다.'}</div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
        {hasAnyAssigned && <div className="text-xs text-gray-400">* 이미 등록된 항목은 선택할 수 없습니다.</div>}
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

/** Tree 노드 수 집계 (재귀) */
function countTreeNodes(nodes: TreeDataNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count += 1;
    if (node.children) count += countTreeNodes(node.children);
  }
  return count;
}

/** 리소스 타입별 accent 색상 */
function getTypeAccent(resourceType: string): string {
  const palette: Record<string, string> = {
    BOT: '#2563eb',
    NLU_MODEL: '#7c3aed',
  };
  return palette[resourceType] ?? '#64748b';
}
