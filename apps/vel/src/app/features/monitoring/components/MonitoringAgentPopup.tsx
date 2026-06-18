import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Button, Checkbox, Input, Modal, Table, Tree, type TreeDataNode } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Folder, FolderOpen } from 'lucide-react';
import { useGetAgents, useGetGroups } from '../../common/hooks/useCommonQueries';
import type { AgentItem, GroupItem, PopupParams } from '../../common/types/common';

export interface MonitoringAgentPopupRef {
  open: (params: PopupParams, onSelect: (agent: AgentItem) => void) => void;
}

function buildGroupTree(groups: GroupItem[]): TreeDataNode[] {
  const buildNodes = (parentId: string | null): TreeDataNode[] =>
    groups
      .filter((g) => (g.parentId ?? null) === parentId)
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

const MonitoringAgentPopup = forwardRef<MonitoringAgentPopupRef>((_, ref) => {
  const [open, setOpen] = useState(false);
  const [baseParams, setBaseParams] = useState<PopupParams | null>(null);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [isAllExpanded, setIsAllExpanded] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [keyword, setKeyword] = useState('');
  const [retireIncluded, setRetireIncluded] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentItem | null>(null);
  const [onSelectCallback, setOnSelectCallback] = useState<((agent: AgentItem) => void) | null>(null);

  const agentParams = useMemo(() => (baseParams ? { ...baseParams, retireIncluded } : undefined), [baseParams, retireIncluded]);

  const { data: groups = [], isFetching: groupsFetching } = useGetGroups({
    params: baseParams ? { ...baseParams } : undefined,
    queryOptions: { enabled: open && !!baseParams?.tenantId },
  });

  const { data: agents = [], isFetching: agentsFetching } = useGetAgents({
    params: agentParams,
    queryOptions: { enabled: open && !!baseParams?.tenantId },
  });

  const allGroupKeys = useMemo(() => groups.map((g) => g.groupId), [groups]);
  const treeData = useMemo(() => buildGroupTree(groups), [groups]);

  useEffect(() => {
    if (groups.length > 0) {
      setCheckedKeys(allGroupKeys);
      setExpandedKeys(allGroupKeys);
      setIsAllExpanded(true);
    }
  }, [allGroupKeys]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    open: (p, cb) => {
      setBaseParams(p);
      setCheckedKeys([]);
      setExpandedKeys([]);
      setInputValue('');
      setKeyword('');
      setRetireIncluded(false);
      setSelectedAgent(null);
      setOnSelectCallback(() => cb);
      setOpen(true);
    },
  }));

  const filteredAgents = useMemo(() => {
    const checkedSet = new Set(checkedKeys);
    const allChecked = allGroupKeys.length > 0 && allGroupKeys.every((k) => checkedSet.has(k));

    let result = allChecked ? agents : agents.filter((a) => !a.groupId || checkedSet.has(a.groupId));

    if (keyword) {
      const kw = keyword.toLowerCase();
      result = result.filter((a) => a.userId.toLowerCase().includes(kw) || a.userName.toLowerCase().includes(kw));
    }

    return result;
  }, [agents, checkedKeys, allGroupKeys, keyword]);

  const handleToggleExpand = () => {
    if (isAllExpanded) {
      setExpandedKeys([]);
    } else {
      setExpandedKeys(allGroupKeys);
    }
    setIsAllExpanded((prev) => !prev);
  };

  const handleSearch = () => setKeyword(inputValue);

  const handleConfirm = () => {
    if (!selectedAgent) return;
    onSelectCallback?.(selectedAgent);
    setOpen(false);
  };

  const handleClose = () => setOpen(false);

  const handleRowDoubleClick = (row: AgentItem) => {
    onSelectCallback?.(row);
    setOpen(false);
  };

  const columns: ColumnsType<AgentItem> = [
    {
      title: '#',
      width: 60,
      onHeaderCell: () => ({ style: { textAlign: 'center' as const } }),
      render: (_: unknown, __: AgentItem, index: number) => index + 1,
    },
    {
      title: '소속',
      dataIndex: 'groupName',
      ellipsis: true,
      onHeaderCell: () => ({ style: { textAlign: 'center' as const } }),
    },
    {
      title: '사번',
      dataIndex: 'userId',
      width: 165,
      align: 'center',
      onHeaderCell: () => ({ style: { textAlign: 'center' as const } }),
    },
    {
      title: '상담사명',
      dataIndex: 'userName',
      width: 135,
      align: 'center',
      onHeaderCell: () => ({ style: { textAlign: 'center' as const } }),
    },
  ];

  return (
    <Modal
      title="상담사 검색"
      open={open}
      onCancel={handleClose}
      footer={
        <div className="text-right">
          <Button type="primary" onClick={handleConfirm} disabled={!selectedAgent}>
            확인
          </Button>
        </div>
      }
      width={1080}
    >
      <div className="flex gap-3" style={{ height: 460 }}>
        {/* 좌측: 그룹 트리 */}
        <div style={{ width: 410, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="mb-1">
            <Button size="small" onClick={handleToggleExpand}>
              {isAllExpanded ? '전체닫기' : '전체열기'}
            </Button>
          </div>
          <style>{`.agent-group-tree .ant-tree-iconEle { display: inline-flex !important; align-items: center !important; vertical-align: middle !important; }`}</style>
          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: 4, padding: 8 }}>
            {groupsFetching ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">로딩 중...</div>
            ) : (
              <Tree
                className="agent-group-tree"
                checkable
                showLine={{ showLeafIcon: false }}
                showIcon
                icon={({ expanded }: { expanded?: boolean }) => (expanded ? <FolderOpen size={20} /> : <Folder size={20} />)}
                treeData={treeData}
                checkedKeys={checkedKeys}
                expandedKeys={expandedKeys}
                onExpand={(keys) => {
                  setExpandedKeys(keys as string[]);
                  setIsAllExpanded(keys.length === allGroupKeys.length);
                }}
                onCheck={(keys) => setCheckedKeys(Array.isArray(keys) ? (keys as string[]) : (keys as { checked: string[] }).checked)}
              />
            )}
          </div>
        </div>

        {/* 우측: 검색 + 그리드 */}
        <div className="flex flex-col flex-1" style={{ minWidth: 0 }}>
          <div className="flex gap-1 mb-2">
            <Input placeholder="행번/성명" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onPressEnter={handleSearch} style={{ flex: 1 }} />
            <Button onClick={handleSearch}>조회</Button>
          </div>
          <div className="mb-2">
            <Checkbox checked={retireIncluded} onChange={(e) => setRetireIncluded(e.target.checked)}>
              퇴직자 포함
            </Checkbox>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Table<AgentItem>
              columns={columns}
              dataSource={filteredAgents}
              rowKey="userId"
              size="small"
              loading={agentsFetching}
              pagination={false}
              scroll={{ y: 380 }}
              rowClassName={(row) => (row.userId === selectedAgent?.userId ? 'ant-table-row-selected' : '')}
              onRow={(row) => ({
                onClick: () => setSelectedAgent(row),
                onDoubleClick: () => handleRowDoubleClick(row),
                style: { cursor: 'pointer' },
              })}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
});

MonitoringAgentPopup.displayName = 'MonitoringAgentPopup';
export default MonitoringAgentPopup;
