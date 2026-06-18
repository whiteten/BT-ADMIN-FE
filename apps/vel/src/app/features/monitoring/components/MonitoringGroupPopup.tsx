import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Button, Checkbox, Input, Modal, Tree, type TreeDataNode } from 'antd';
import { Folder, FolderOpen } from 'lucide-react';
import { useGetGroups } from '../../common/hooks/useCommonQueries';
import type { GroupItem, PopupParams } from '../../common/types/common';

export interface MonitoringGroupPopupRef {
  open: (params: PopupParams, onSelect: (group: GroupItem, fullPath: string) => void) => void;
}

function buildTree(groups: GroupItem[], keyword: string): TreeDataNode[] {
  const matchesKeyword = (g: GroupItem) => !keyword || g.groupName.includes(keyword) || g.groupId.includes(keyword);

  const hasVisibleDescendant = (groupId: string): boolean => {
    for (const g of groups) {
      if (g.parentId === groupId) {
        if (matchesKeyword(g) || hasVisibleDescendant(g.groupId)) return true;
      }
    }
    return false;
  };

  const buildNodes = (parentId: string | null): TreeDataNode[] =>
    groups
      .filter((g) => (g.parentId ?? null) === parentId)
      .filter((g) => matchesKeyword(g) || hasVisibleDescendant(g.groupId))
      .map((g) => ({
        key: g.groupId,
        title: `${g.groupName}[${g.agentCount}]`,
        children: buildNodes(g.groupId),
      }));

  const allIds = new Set(groups.map((g) => g.groupId));
  const roots = groups.filter((g) => !g.parentId || !allIds.has(g.parentId));
  const rootParentIds = [...new Set(roots.map((g) => g.parentId ?? null))];

  return rootParentIds.flatMap((pid) => buildNodes(pid));
}

const MonitoringGroupPopup = forwardRef<MonitoringGroupPopupRef>((_, ref) => {
  const [open, setOpen] = useState(false);
  const [baseParams, setBaseParams] = useState<PopupParams | null>(null);
  const [searchAll, setSearchAll] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [keyword, setKeyword] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [isAllExpanded, setIsAllExpanded] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [onSelectCallback, setOnSelectCallback] = useState<((group: GroupItem, fullPath: string) => void) | null>(null);

  // searchAll 체크 시 권한 파라미터 제거
  const queryParams = useMemo(() => {
    if (!baseParams) return undefined;
    if (searchAll) return { tenantId: baseParams.tenantId };
    return { ...baseParams };
  }, [baseParams, searchAll]);

  const { data = [], isFetching } = useGetGroups({
    params: queryParams ? { ...queryParams } : undefined,
    queryOptions: { enabled: open && !!baseParams?.tenantId },
  });

  const allKeys = useMemo(() => data.map((g) => g.groupId), [data]);

  const groupMap = useMemo(() => new Map<string, GroupItem>(data.map((g) => [g.groupId, g])), [data]);

  const treeData = useMemo(() => buildTree(data, keyword), [data, keyword]);

  // 데이터 로드 시 전체 펼침 초기화
  useEffect(() => {
    if (data.length > 0) {
      setExpandedKeys(allKeys);
      setIsAllExpanded(true);
    }
  }, [allKeys]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    open: (p, cb) => {
      setBaseParams(p);
      setSearchAll(false);
      setInputValue('');
      setKeyword('');
      setSelectedKey(null);
      setIsAllExpanded(true);
      setOnSelectCallback(() => cb);
      setOpen(true);
    },
  }));

  const handleSearch = () => setKeyword(inputValue);

  const handleToggleExpand = () => {
    if (isAllExpanded) {
      setExpandedKeys([]);
    } else {
      setExpandedKeys(allKeys);
    }
    setIsAllExpanded((prev) => !prev);
  };

  const getFullPath = (groupId: string): string => {
    const parts: string[] = [];
    let current = groupMap.get(groupId);
    while (current) {
      parts.unshift(current.groupName);
      current = current.parentId ? groupMap.get(current.parentId) : undefined;
    }
    return parts.join('/');
  };

  const handleConfirm = () => {
    if (!selectedKey) return;
    const group = groupMap.get(selectedKey);
    if (group) {
      onSelectCallback?.(group, getFullPath(selectedKey));
      setOpen(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Modal
      title="그룹 검색"
      open={open}
      onCancel={handleClose}
      footer={
        <div className="text-right">
          <Button type="primary" onClick={handleConfirm} disabled={!selectedKey}>
            확인
          </Button>
        </div>
      }
      width={480}
    >
      {/* 그룹 전체검색 체크박스 */}
      <div className="mb-2">
        <Checkbox checked={searchAll} onChange={(e) => setSearchAll(e.target.checked)}>
          그룹 전체검색
        </Checkbox>
      </div>

      {/* 소속명 검색 */}
      <div className="flex gap-1 mb-2">
        <Input placeholder="소속명" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onPressEnter={handleSearch} className="flex-1" />
        <Button onClick={handleSearch}>조회</Button>
      </div>

      {/* 전체닫기/전체열기 */}
      <div className="mb-1">
        <Button size="small" onClick={handleToggleExpand}>
          {isAllExpanded ? '전체닫기' : '전체열기'}
        </Button>
      </div>

      {/* 트리 영역 */}
      <style>{`.monitoring-group-tree .ant-tree-iconEle { display: inline-flex !important; align-items: center !important; vertical-align: middle !important; }`}</style>
      <div style={{ height: 400, overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: 4, padding: 8 }}>
        {isFetching ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">로딩 중...</div>
        ) : (
          <Tree
            className="monitoring-group-tree"
            showLine={{ showLeafIcon: false }}
            showIcon
            icon={({ expanded }: { expanded?: boolean }) => (expanded ? <FolderOpen size={20} /> : <Folder size={20} />)}
            treeData={treeData}
            selectedKeys={selectedKey ? [selectedKey] : []}
            expandedKeys={expandedKeys}
            onExpand={(keys) => {
              setExpandedKeys(keys as string[]);
              setIsAllExpanded(keys.length === allKeys.length);
            }}
            onSelect={(keys) => setSelectedKey((keys[0] as string) ?? null)}
          />
        )}
      </div>
    </Modal>
  );
});

MonitoringGroupPopup.displayName = 'MonitoringGroupPopup';
export default MonitoringGroupPopup;
