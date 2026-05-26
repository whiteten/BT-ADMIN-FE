/**
 * 스킬 배정 페이지 (AS-IS SWAT IPR20S5090 + IPR20S5080 통합).
 *
 * 레이아웃:
 *  - 상단 테넌트 카드 슬라이더 (ADN 패턴) — 전체/테넌트별 선택 selector
 *  - 모드 토글 (① 상담사별 스킬 관리 / ③ 스킬모음 관리) ※ ② 스킬별 상담사 = Phase 2
 *  - 모드 ①: 좌 상담사 목록 + 우 보유 스킬셋 칩 + 스킬 추가 버튼
 *  - 모드 ③: 스킬모음 목록 + 등록/수정/삭제
 *
 * Phase 1: 칩 UI + 기본 CRUD. 매트릭스/diff/라우팅 시각화는 Phase 2.
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Empty, Input, Modal, Space, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, Package, Plus, Search, Trash2, Users } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useGetAgents } from '../../features/agent-master/hooks/useAgentMasterQueries';
import type { AgentResponse } from '../../features/agent-master/types';
import SkillAgentChipList from '../../features/skill-assign/components/SkillAgentChipList';
import SkillAgentEditDrawer from '../../features/skill-assign/components/SkillAgentEditDrawer';
import SkillAssignTenantCard from '../../features/skill-assign/components/SkillAssignTenantCard';
import SkillGroupFormDrawer, { type SkillGroupDrawerState } from '../../features/skill-assign/components/SkillGroupFormDrawer';
import SkillsetPickerDrawer from '../../features/skill-assign/components/SkillsetPickerDrawer';
import {
  useDeleteSkillGroup,
  useGetSkillAssignTenants,
  useGetSkillGroups,
  useGetSkillsetsByAgent,
  useUnassignSkillset,
} from '../../features/skill-assign/hooks/useSkillAssignQueries';
import type { SkillAgentResponse, SkillGroupResponse } from '../../features/skill-assign/types';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '스킬 관리', path: '/ipron/skill-assign' },
  { title: '스킬 배정', path: '/ipron/skill-assign' },
];

type Mode = 'agent' | 'group';

export default function SkillAssignList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const cardScrollRef = useRef<HTMLDivElement>(null);

  // ─── State ──────────────────────────────────────────────────────────────
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>('agent');
  const [cardExpanded, setCardExpanded] = useState(true);

  // 모드 ① 상담사별
  const [agentSearch, setAgentSearch] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editRow, setEditRow] = useState<SkillAgentResponse | null>(null);

  // 모드 ③ 스킬모음
  const [groupSearch, setGroupSearch] = useState('');
  const [groupDrawer, setGroupDrawer] = useState<SkillGroupDrawerState>({ open: false });

  // ─── Queries ────────────────────────────────────────────────────────────
  const { data: tenantStats = [] } = useGetSkillAssignTenants();

  const { data: agents = [], isLoading: agentsLoading } = useGetAgents({
    params: selectedTenantId !== null ? { tenantId: selectedTenantId } : undefined,
    queryOptions: { enabled: mode === 'agent' },
  });

  const { data: skillsets = [], isLoading: skillsetsLoading } = useGetSkillsetsByAgent(selectedAgentId, {
    queryOptions: { enabled: mode === 'agent' && !!selectedAgentId },
  });

  const { data: skillGroups = [], isLoading: groupsLoading } = useGetSkillGroups({
    params: selectedTenantId !== null ? { tenantId: selectedTenantId } : undefined,
    queryOptions: { enabled: mode === 'group' },
  });

  // ─── Mutations ──────────────────────────────────────────────────────────
  const { mutate: unassign } = useUnassignSkillset({
    mutationOptions: {
      onSuccess: () => toast.success('스킬셋이 해제되었습니다'),
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '해제 실패';
        toast.error(msg);
      },
    },
  });

  const { mutate: deleteGroup } = useDeleteSkillGroup({
    mutationOptions: {
      onSuccess: () => toast.success('스킬모음이 삭제되었습니다'),
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '삭제 실패';
        toast.error(msg);
      },
    },
  });

  // ─── Derived ────────────────────────────────────────────────────────────
  const totalStats = useMemo(() => {
    let agentCount = 0;
    let skillsetCount = 0;
    let mappingCount = 0;
    let skillGroupCount = 0;
    let unassignedAgentCnt = 0;
    for (const t of tenantStats) {
      agentCount += t.agentCount;
      skillsetCount += t.skillsetCount;
      mappingCount += t.mappingCount;
      skillGroupCount += t.skillGroupCount;
      unassignedAgentCnt += t.unassignedAgentCnt;
    }
    return { agentCount, skillsetCount, mappingCount, skillGroupCount, unassignedAgentCnt };
  }, [tenantStats]);

  const filteredAgents = useMemo(() => {
    const kw = agentSearch.trim().toLowerCase();
    if (!kw) return agents;
    return agents.filter((a) => {
      const fields: (string | number | null | undefined)[] = [a.agentName, a.agentLoginId, a.agentAlias, a.groupName];
      return fields.some((f) => f != null && String(f).toLowerCase().includes(kw));
    });
  }, [agents, agentSearch]);

  const selectedAgent = useMemo<AgentResponse | undefined>(() => agents.find((a) => a.agentId === selectedAgentId), [agents, selectedAgentId]);
  const selectedAgentLabel = selectedAgent ? `${selectedAgent.agentName} (${selectedAgent.agentLoginId})` : undefined;

  const filteredGroups = useMemo(() => {
    const kw = groupSearch.trim().toLowerCase();
    if (!kw) return skillGroups;
    return skillGroups.filter((g) => {
      const fields: (string | number | null | undefined)[] = [g.skillGroupName, g.skillGroupDesc, g.tenantName];
      return fields.some((f) => f != null && String(f).toLowerCase().includes(kw));
    });
  }, [skillGroups, groupSearch]);

  // 상담사 변경 시 보유 skillsetIds 메모
  const heldSkillsetIds = useMemo(() => skillsets.map((s) => s.skillsetId), [skillsets]);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleUnassign = useCallback(
    (row: SkillAgentResponse) => {
      Modal.confirm({
        title: '스킬셋 해제',
        content: `"${row.skillsetName}" 을 ${row.agentName ?? row.agentLoginId} 에서 해제하시겠습니까?`,
        okType: 'danger',
        onOk: () => unassign({ agentId: row.agentId, skillsetId: row.skillsetId }),
      });
    },
    [unassign],
  );

  const handleDeleteGroup = useCallback(
    (row: SkillGroupResponse) => {
      Modal.confirm({
        title: '스킬모음 삭제',
        content: `"${row.skillGroupName}" 모음을 삭제하시겠습니까? (멤버 ${row.memberCount}건 함께 삭제)`,
        okType: 'danger',
        onOk: () => deleteGroup(row.skillGroupId),
      });
    },
    [deleteGroup],
  );

  // ─── Columns ────────────────────────────────────────────────────────────
  const agentColumns: ColumnsType<AgentResponse> = [
    { title: '상담그룹', dataIndex: 'groupName', key: 'groupName', width: 130, ellipsis: true },
    { title: '로그인ID', dataIndex: 'agentLoginId', key: 'agentLoginId', width: 110 },
    { title: '이름', dataIndex: 'agentName', key: 'agentName', width: 110 },
    { title: '별명', dataIndex: 'agentAlias', key: 'agentAlias', width: 90, ellipsis: true },
    {
      title: '활성',
      dataIndex: 'activateYn',
      key: 'activateYn',
      width: 60,
      align: 'center',
      render: (v: number) => (v === 1 ? <Tag color="green">활성</Tag> : <Tag color="red">비활성</Tag>),
    },
  ];

  const groupColumns: ColumnsType<SkillGroupResponse> = [
    { title: '테넌트', dataIndex: 'tenantName', key: 'tenantName', width: 130, ellipsis: true },
    { title: '모음 이름', dataIndex: 'skillGroupName', key: 'skillGroupName' },
    { title: '설명', dataIndex: 'skillGroupDesc', key: 'skillGroupDesc', ellipsis: true },
    { title: '멤버 수', dataIndex: 'memberCount', key: 'memberCount', width: 90, align: 'right' },
    {
      title: '액션',
      key: 'action',
      width: 160,
      render: (_, row) => (
        <Space size={4}>
          <Button size="small" onClick={() => setGroupDrawer({ open: true, mode: 'edit', row })}>
            수정
          </Button>
          <Button size="small" danger icon={<Trash2 className="size-3" />} onClick={() => handleDeleteGroup(row)}>
            삭제
          </Button>
        </Space>
      ),
    },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 카드 슬라이더 박스 ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[44px] border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">테넌트별 스킬 배정 현황</span>
        </div>

        {cardExpanded ? (
          <div className="flex items-center h-[140px] px-4 py-3">
            <div className="relative flex items-center gap-2 w-full">
              <Button
                type="text"
                icon={<ChevronLeft className="size-5" />}
                onClick={() => cardScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                className="!flex-shrink-0 !w-8 !h-8 !p-0"
              />
              <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto py-2 px-1 flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <SkillAssignTenantCard tenantId={null} tenantName="전체" stats={totalStats} selected={selectedTenantId === null} onClick={() => setSelectedTenantId(null)} />
                {tenantStats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 min-h-[100px]">
                    <Empty description={false} imageStyle={{ height: 40 }} />
                    <span className="text-sm">테넌트가 없습니다</span>
                  </div>
                ) : (
                  tenantStats.map((g) => (
                    <SkillAssignTenantCard
                      key={g.tenantId}
                      tenantId={g.tenantId}
                      tenantName={g.tenantName ?? '-'}
                      stats={{
                        agentCount: g.agentCount,
                        skillsetCount: g.skillsetCount,
                        mappingCount: g.mappingCount,
                        skillGroupCount: g.skillGroupCount,
                        unassignedAgentCnt: g.unassignedAgentCnt,
                      }}
                      selected={selectedTenantId === g.tenantId}
                      onClick={(e) => {
                        setSelectedTenantId(g.tenantId);
                        setSelectedAgentId(null);
                        (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                      }}
                    />
                  ))
                )}
              </div>
              <Button
                type="text"
                icon={<ChevronRight className="size-5" />}
                onClick={() => cardScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                className="!flex-shrink-0 !w-8 !h-8 !p-0"
              />
              <Button
                type="text"
                icon={<ChevronsUp className="size-4" />}
                onClick={() => setCardExpanded(false)}
                title="카드 접기"
                className="!flex-shrink-0 !w-8 !h-8 !p-0 !text-gray-400 hover:!text-[#405189]"
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center h-[44px] px-4">
            <div className="relative flex items-center gap-2 w-full">
              <div className="flex gap-2 overflow-x-auto flex-1 items-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <CompactTenantPill name="전체" count={totalStats.mappingCount} selected={selectedTenantId === null} onClick={() => setSelectedTenantId(null)} />
                {tenantStats.map((g) => (
                  <CompactTenantPill
                    key={g.tenantId}
                    name={g.tenantName ?? '-'}
                    count={g.mappingCount}
                    selected={selectedTenantId === g.tenantId}
                    onClick={() => {
                      setSelectedTenantId(g.tenantId);
                      setSelectedAgentId(null);
                    }}
                  />
                ))}
              </div>
              <Button
                type="text"
                icon={<ChevronsDown className="size-4" />}
                onClick={() => setCardExpanded(true)}
                title="카드 펼치기"
                className="!flex-shrink-0 !w-8 !h-8 !p-0 !text-gray-400 hover:!text-[#405189]"
              />
            </div>
          </div>
        )}
      </div>

      {/* ===== 모드 토글 ===== */}
      <div className="bg-white bt-shadow flex items-center px-4 h-[44px] flex-shrink-0">
        <Space>
          <ModeButton active={mode === 'agent'} icon={<Users className="size-3.5" />} label="상담사별 스킬 관리" onClick={() => setMode('agent')} />
          <ModeButton active={mode === 'group'} icon={<Package className="size-3.5" />} label="스킬모음 관리" onClick={() => setMode('group')} />
          <span className="text-xs text-gray-400 ml-2">※ 스킬별 상담사 관리 / 매트릭스 / 라우팅 시각화 = Phase 2</span>
        </Space>
      </div>

      {/* ===== 모드 ① 상담사별 스킬 관리 ===== */}
      {mode === 'agent' && (
        <div className="flex gap-4 flex-1 min-h-0">
          {/* 좌: 상담사 목록 */}
          <Card
            size="small"
            className="w-[420px] flex-shrink-0 flex flex-col"
            styles={{ body: { padding: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 } }}
            title={
              <Space>
                <span>상담사 목록</span>
                <Tag color="default">{filteredAgents.length}명</Tag>
              </Space>
            }
            extra={
              <Input
                placeholder="이름/로그인ID/별명"
                prefix={<Search className="size-3.5 text-gray-400" />}
                value={agentSearch}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAgentSearch(e.target.value)}
                style={{ width: 200 }}
                size="small"
                allowClear
              />
            }
          >
            <Table<AgentResponse>
              size="small"
              rowKey="agentId"
              loading={agentsLoading}
              dataSource={filteredAgents}
              columns={agentColumns}
              pagination={{ pageSize: 50, showSizeChanger: false }}
              rowClassName={(row) => (row.agentId === selectedAgentId ? 'bg-[#eef0f7]' : '')}
              onRow={(row) => ({ onClick: () => setSelectedAgentId(row.agentId) })}
              scroll={{ y: 'calc(100vh - 480px)' }}
            />
          </Card>

          {/* 우: 보유 스킬셋 */}
          <Card
            size="small"
            className="flex-1 min-w-0 flex flex-col"
            styles={{ body: { flex: 1, overflow: 'auto' } }}
            title={
              <Space>
                <span>보유 스킬셋</span>
                {selectedAgent && <Tag color="blue">{selectedAgentLabel}</Tag>}
                {selectedAgent && <Tag color="default">{skillsets.length}건</Tag>}
              </Space>
            }
            extra={
              <Button type="primary" size="small" icon={<Plus className="size-3.5" />} disabled={!selectedAgentId} onClick={() => setPickerOpen(true)}>
                스킬셋 추가
              </Button>
            }
          >
            {!selectedAgentId ? (
              <Empty description="좌측에서 상담사를 선택하세요" />
            ) : skillsetsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Spin />
              </div>
            ) : (
              <SkillAgentChipList rows={skillsets} agentLabel={selectedAgentLabel} onUnassign={handleUnassign} onEdit={(row) => setEditRow(row)} />
            )}
          </Card>
        </div>
      )}

      {/* ===== 모드 ③ 스킬모음 관리 ===== */}
      {mode === 'group' && (
        <Card
          size="small"
          className="flex-1 min-h-0 flex flex-col"
          styles={{ body: { flex: 1, overflow: 'auto' } }}
          title={
            <Space>
              <span>스킬모음 목록</span>
              <Tag color="default">{filteredGroups.length}건</Tag>
            </Space>
          }
          extra={
            <Space>
              <Input
                placeholder="모음 이름/설명/테넌트"
                prefix={<Search className="size-3.5 text-gray-400" />}
                value={groupSearch}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setGroupSearch(e.target.value)}
                style={{ width: 240 }}
                size="small"
                allowClear
              />
              <Button type="primary" size="small" icon={<Plus className="size-3.5" />} onClick={() => setGroupDrawer({ open: true, mode: 'create' })}>
                스킬모음 등록
              </Button>
            </Space>
          }
        >
          <Table<SkillGroupResponse>
            size="small"
            rowKey="skillGroupId"
            loading={groupsLoading}
            dataSource={filteredGroups}
            columns={groupColumns}
            pagination={{ pageSize: 20, showSizeChanger: false }}
          />
        </Card>
      )}

      {/* ===== Drawers ===== */}
      <SkillsetPickerDrawer
        open={pickerOpen}
        agentId={selectedAgentId}
        agentLabel={selectedAgentLabel}
        tenantId={selectedAgent?.tenantId ?? selectedTenantId ?? undefined}
        excludeSkillsetIds={heldSkillsetIds}
        onClose={() => setPickerOpen(false)}
      />
      <SkillAgentEditDrawer open={!!editRow} row={editRow} onClose={() => setEditRow(null)} />
      <SkillGroupFormDrawer state={groupDrawer} tenantId={selectedTenantId ?? undefined} onClose={() => setGroupDrawer({ open: false })} />
    </div>
  );
}

interface ModeButtonProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function ModeButton({ active, icon, label, onClick }: ModeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-medium transition ${
        active ? 'bg-[#405189] text-white' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:text-[#405189] hover:border-[#405189]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

interface CompactTenantPillProps {
  name: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}

function CompactTenantPill({ name, count, selected, onClick }: CompactTenantPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${name} · 매핑 ${count.toLocaleString()}건`}
      className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition ${
        selected
          ? 'border-[#405189] bg-[#405189] text-white shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
          : 'border-gray-200 bg-white text-gray-700 hover:border-[#c5cbe0] hover:text-[#405189]'
      }`}
    >
      <span className="font-medium truncate max-w-[120px]">{name}</span>
      <span className={`text-[11px] ${selected ? 'text-white/80' : 'text-gray-400'}`}>{count.toLocaleString()}</span>
    </button>
  );
}
