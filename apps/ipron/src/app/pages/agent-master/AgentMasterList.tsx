/**
 * 상담사 관리 목록 페이지 (AS-IS SWAT IPR20S4010 / IPR20S4020).
 *
 * 레이아웃: 상단 카드 슬라이더 + 하단 (좌 그룹트리 ↔ 스플리터 ↔ 우 ag-Grid).
 * 드래그앤드롭: 그리드 선택 행을 좌측 트리 노드에 드롭 → 그룹 이동 (다른 테넌트는 확인 모달).
 *
 * Phase 1 스코프 (memory: agent-master-phase1-exclude):
 *   - 매크로/인사말/스케줄/핸드폰·이메일/노드·DR노드/작업자·일시 제외
 *   - 엑셀 가져오기/내보내기 UI 는 후속 (BE endpoint 추가 후)
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Empty, Input } from 'antd';
import { ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, Plus, Search, Trash2 } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import AgentGroupFormDrawer from '../../features/agent-master/components/AgentGroupFormDrawer';
import AgentGroupTree from '../../features/agent-master/components/AgentGroupTree';
import AgentMasterFormDrawer from '../../features/agent-master/components/AgentMasterFormDrawer';
import AgentMasterTable from '../../features/agent-master/components/AgentMasterTable';
import AgentMasterTenantCard from '../../features/agent-master/components/AgentMasterTenantCard';
import {
  useDeleteAgentGroup,
  useDeleteAgents,
  useGetAgentGroupTree,
  useGetAgentTenants,
  useGetAgents,
  useMoveAgent,
  useReorderAgentGroup,
} from '../../features/agent-master/hooks/useAgentMasterQueries';
import type { AgentGroupNode, AgentGroupReorderPosition, AgentResponse } from '../../features/agent-master/types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: '상담사 관리', path: '/ipron/agent-master' },
  { title: '상담사', path: '/ipron/agent-master' },
  { title: '상담사 설정', path: '/ipron/agent-master' },
];

export default function AgentMasterList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const navigate = useNavigate();
  const modal = useModal();
  const cardScrollRef = useRef<HTMLDivElement>(null);

  // ctx 테넌트 (JWT — 사용자 본인 테넌트) — 페이지 진입 시 자동 선택
  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // ─── State ──────────────────────────────────────────────────────────────
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(ctxTenantId);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState<AgentResponse[]>([]);
  // 카드 박스 default 접힘(compact pill). 권한 wrapping 일관성을 위해 hidden 토글 X.
  const [cardExpanded, setCardExpanded] = useState(false);

  // ctx 비동기 로드 시 동기화
  useEffect(() => {
    if (ctxTenantId != null && selectedTenantId === null) {
      setSelectedTenantId(ctxTenantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxTenantId]);
  const [treeWidth, setTreeWidth] = useState(260);
  const splitRef = useRef<HTMLDivElement>(null);

  // 상담그룹 Drawer (등록/수정) — 트리 액션에서 호출
  const [groupDrawer, setGroupDrawer] = useState<
    { open: false } | { open: true; mode: 'create'; tenantId?: number; priorGrpId?: number } | { open: true; mode: 'edit'; groupId: number }
  >({ open: false });

  // 상담사 Drawer (등록/수정) — 더블클릭 / [등록] 버튼에서 호출
  const [agentDrawer, setAgentDrawer] = useState<
    { open: false } | { open: true; mode: 'create'; tenantId?: number; groupId?: number } | { open: true; mode: 'edit'; agentId: number }
  >({ open: false });

  // ─── Queries ────────────────────────────────────────────────────────────
  const { data: agents = [], isLoading } = useGetAgents({
    params: { tenantId: selectedTenantId ?? undefined, groupId: selectedGroupId ?? undefined },
  });
  const { data: tenantStats = [] } = useGetAgentTenants();
  const { data: groupTree = [] } = useGetAgentGroupTree({
    params: { tenantId: selectedTenantId ?? undefined },
  });

  // ─── Mutations ──────────────────────────────────────────────────────────
  const { mutate: deleteAgents, isPending: isDeleting } = useDeleteAgents({
    mutationOptions: {
      onSuccess: () => {
        toast.success('선택한 상담사가 삭제되었습니다');
        setSelectedRows([]);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '삭제 실패';
        toast.error(msg);
      },
    },
  });

  const { mutate: moveAgent } = useMoveAgent({
    mutationOptions: {
      onSuccess: () => {
        toast.success('상담사 그룹이 변경되었습니다');
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '그룹 이동 실패';
        toast.error(msg);
      },
    },
  });

  const { mutate: reorderGroup } = useReorderAgentGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('상담그룹 순서가 변경되었습니다');
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '그룹 재배치 실패';
        toast.error(msg);
      },
    },
  });

  const { mutate: deleteGroup } = useDeleteAgentGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('상담그룹이 삭제되었습니다');
        if (selectedGroupId != null) setSelectedGroupId(null);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '그룹 삭제 실패';
        toast.error(msg);
      },
    },
  });

  // ─── Derived ────────────────────────────────────────────────────────────
  const filteredAgents = useMemo(() => {
    const kw = searchText.trim().toLowerCase();
    if (!kw) return agents;
    return agents.filter((r) => {
      const fields: (string | number | null | undefined)[] = [r.agentLoginId, r.agentName, r.agentAlias, r.tenantName, r.groupName, r.jikgup];
      return fields.some((f) => f != null && String(f).toLowerCase().includes(kw));
    });
  }, [agents, searchText]);

  const totalStats = useMemo(() => {
    let totalCnt = 0;
    let activeCnt = 0;
    let unassignedAdnCnt = 0;
    for (const t of tenantStats) {
      totalCnt += t.totalCnt;
      activeCnt += t.activeCnt;
      unassignedAdnCnt += t.unassignedAdnCnt;
    }
    return { totalCnt, activeCnt, unassignedAdnCnt };
  }, [tenantStats]);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleCreate = useCallback(() => {
    setAgentDrawer({
      open: true,
      mode: 'create',
      tenantId: selectedTenantId ?? undefined,
      groupId: selectedGroupId ?? undefined,
    });
  }, [selectedTenantId, selectedGroupId]);

  const handleEdit = useCallback((a: AgentResponse) => setAgentDrawer({ open: true, mode: 'edit', agentId: a.agentId }), []);

  const handleDelete = useCallback(
    (a: AgentResponse) => {
      modal.confirm.execute({
        onOk: () => deleteAgents([a.agentId]),
        options: { title: '상담사 삭제', content: `"${a.agentName}" 상담사를 삭제하시겠습니까?` },
      });
    },
    [modal, deleteAgents],
  );

  const handleBulkDelete = useCallback(() => {
    if (selectedRows.length === 0) return;
    modal.confirm.execute({
      onOk: () => deleteAgents(selectedRows.map((r) => r.agentId)),
      options: {
        title: '상담사 일괄 삭제',
        content: `선택한 ${selectedRows.length}명의 상담사를 삭제하시겠습니까?`,
      },
    });
  }, [selectedRows, modal, deleteAgents]);

  const handleSelectTenant = useCallback((tenantId: number | null) => {
    setSelectedTenantId(tenantId);
    setSelectedGroupId(null); // 테넌트 바뀌면 그룹 선택 해제
    setSelectedRows([]);
  }, []);

  const handleSelectGroup = useCallback((groupId: number | null) => {
    setSelectedGroupId(groupId);
    setSelectedRows([]);
  }, []);

  // 그룹 이동 (드래그앤드롭) — 페이로드 agentIds 를 targetGroupId 로 이동
  const handleAgentDrop = useCallback(
    (targetGroupId: number, agentIds: number[]) => {
      if (!agentIds || agentIds.length === 0) return;
      const dragged = agents.filter((a) => agentIds.includes(a.agentId));
      if (dragged.length === 0) return;

      const target = findGroup(groupTree, targetGroupId);
      const sourceTenantIds = new Set(dragged.map((r) => r.tenantId));
      const sourceGroupIds = new Set(dragged.map((r) => r.groupId));
      if (sourceGroupIds.size === 1 && sourceGroupIds.has(targetGroupId)) {
        // 같은 그룹으로 드롭 — 무시
        return;
      }
      const crossTenant = target && (sourceTenantIds.size > 1 || !sourceTenantIds.has(target.tenantId));

      const move = (allowTenantChange: boolean) => {
        for (const r of dragged) {
          moveAgent({ id: r.agentId, body: { targetGroupId, allowTenantChange } });
        }
        setSelectedRows([]);
      };

      if (crossTenant) {
        modal.confirm.execute({
          onOk: () => move(true),
          options: {
            title: '다른 테넌트로 이동',
            content: `대상 그룹의 테넌트가 다릅니다. ${dragged.length}명의 상담사를 ${target?.tenantName ?? '대상 테넌트'} 로 이동하시겠습니까?`,
          },
        });
      } else {
        move(false);
      }
    },
    [agents, groupTree, modal, moveAgent],
  );

  // ─── Splitter (트리 ↔ 그리드 리사이즈) ──────────────────────────────────
  const onSplitterMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = treeWidth;
      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        const next = Math.max(180, Math.min(480, startWidth + delta));
        setTreeWidth(next);
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [treeWidth],
  );

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 박스 1: 헤더 (별도 박스) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px]">
          <span className="text-sm font-semibold text-gray-700">상담사 현황</span>
          {selectedTenantId !== null && (
            <span className="ml-3 text-xs text-gray-500">
              테넌트: <span className="font-medium text-gray-700">{tenantStats.find((t) => t.tenantId === selectedTenantId)?.tenantName ?? `#${selectedTenantId}`}</span>
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Input
              allowClear
              prefix={<Search className="size-3.5 text-gray-400" />}
              placeholder="상담사 검색 (로그인ID/이름/별명/직급)"
              value={searchText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
              style={{ width: 220 }}
            />
          </div>
        </div>
      </div>

      {/* ===== 박스 2: 테넌트 카드 슬라이더 (별도 박스) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
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
                <AgentMasterTenantCard tenantId={null} tenantName="전체" stats={totalStats} selected={selectedTenantId === null} onClick={() => handleSelectTenant(null)} />
                {tenantStats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 min-h-[100px]">
                    <Empty description={false} imageStyle={{ height: 40 }} />
                    <span className="text-sm">등록된 상담사가 없습니다</span>
                  </div>
                ) : (
                  tenantStats.map((g) => (
                    <AgentMasterTenantCard
                      key={g.tenantId}
                      tenantId={g.tenantId}
                      tenantName={g.tenantName ?? '-'}
                      stats={{ totalCnt: g.totalCnt, activeCnt: g.activeCnt, unassignedAdnCnt: g.unassignedAdnCnt }}
                      selected={selectedTenantId === g.tenantId}
                      onClick={(e) => {
                        handleSelectTenant(g.tenantId);
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
                <CompactTenantPill name="전체" count={totalStats.totalCnt} selected={selectedTenantId === null} onClick={() => handleSelectTenant(null)} />
                {tenantStats.map((g) => (
                  <CompactTenantPill
                    key={g.tenantId}
                    name={g.tenantName ?? '-'}
                    count={g.totalCnt}
                    selected={selectedTenantId === g.tenantId}
                    onClick={() => handleSelectTenant(g.tenantId)}
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

      {/* ===== 트리 ↔ ag-Grid 스플릿 ===== */}
      <div ref={splitRef} className="flex flex-1 min-h-0 gap-4">
        {/* 좌측 그룹 트리 — DN/ADN 패턴 정합으로 별도 박스 */}
        <div className="bg-white bt-shadow flex flex-col flex-shrink-0 overflow-hidden" style={{ width: treeWidth }}>
          <div className="flex items-center px-4 h-[44px] border-b border-gray-100 flex-shrink-0">
            <span className="text-sm font-semibold text-gray-700">상담그룹</span>
            <div className="ml-auto">
              <Button
                size="small"
                type="primary"
                icon={<Plus className="size-3.5" />}
                onClick={() =>
                  setGroupDrawer({
                    open: true,
                    mode: 'create',
                    tenantId: selectedTenantId ?? undefined,
                  })
                }
              >
                그룹 추가
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <AgentGroupTree
              tree={groupTree}
              selectedGroupId={selectedGroupId}
              onSelectGroup={handleSelectGroup}
              onCreateChild={(parent) =>
                setGroupDrawer({
                  open: true,
                  mode: 'create',
                  tenantId: parent?.tenantId ?? selectedTenantId ?? undefined,
                  priorGrpId: parent?.groupId,
                })
              }
              onEditGroup={(g) => setGroupDrawer({ open: true, mode: 'edit', groupId: g.groupId })}
              onDeleteGroup={(g) => {
                modal.confirm.execute({
                  onOk: () => deleteGroup(g.groupId),
                  options: { title: '그룹 삭제', content: `"${g.groupName}" 그룹을 삭제하시겠습니까? (하위 그룹/소속 상담사 있으면 차단됩니다)` },
                });
              }}
              onAgentDrop={handleAgentDrop}
              onGroupReorder={(movedGroupId, position, referenceGroupId) => {
                reorderGroup({
                  id: movedGroupId,
                  body: { position, referenceGroupId },
                });
              }}
            />
          </div>
        </div>

        {/* 스플리터 (트리 박스와 그리드 박스 사이 gap-4 영역에 정렬) */}
        <div className="flex-shrink-0 -mx-2 w-4 cursor-col-resize relative group" onMouseDown={onSplitterMouseDown}>
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-px h-9 bg-gray-300 rounded group-hover:bg-[#405189] transition-colors" />
        </div>

        {/* 우측 그리드 — DN/ADN 패턴 정합으로 별도 박스 */}
        <div className="bg-white bt-shadow flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 h-[44px] flex-shrink-0">
            <span className="text-sm font-semibold text-gray-800">상담사 목록 ({filteredAgents.length.toLocaleString()}건)</span>
            {selectedRows.length > 0 && (
              <span className="text-xs text-gray-500">
                {filteredAgents.length.toLocaleString()}건 중 {selectedRows.length}건 선택
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button
                danger
                icon={<Trash2 className="size-3.5" />}
                onClick={handleBulkDelete}
                loading={isDeleting}
                disabled={selectedRows.length === 0}
                title={selectedRows.length === 0 ? '삭제할 상담사를 선택하세요' : '선택한 상담사 삭제'}
              >
                {selectedRows.length > 0 ? `삭제 (${selectedRows.length})` : '삭제'}
              </Button>
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
                등록
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <AgentMasterTable
              rowData={filteredAgents}
              isLoading={isLoading}
              onRowDoubleClicked={handleEdit}
              onDelete={handleDelete}
              onSelectionChanged={setSelectedRows}
              onBulkDelete={handleBulkDelete}
              selectedCount={selectedRows.length}
              getDragAgentIds={(dragRow) => {
                if (selectedRows.some((r) => r.agentId === dragRow.agentId)) {
                  return selectedRows.map((r) => r.agentId);
                }
                return [dragRow.agentId];
              }}
            />
          </div>
        </div>
      </div>

      <AgentGroupFormDrawer
        open={groupDrawer.open}
        mode={groupDrawer.open && groupDrawer.mode === 'edit' ? 'edit' : 'create'}
        groupId={groupDrawer.open && groupDrawer.mode === 'edit' ? groupDrawer.groupId : undefined}
        initialTenantId={groupDrawer.open && groupDrawer.mode === 'create' ? groupDrawer.tenantId : undefined}
        initialPriorGrpId={groupDrawer.open && groupDrawer.mode === 'create' ? groupDrawer.priorGrpId : undefined}
        onClose={() => setGroupDrawer({ open: false })}
      />

      <AgentMasterFormDrawer
        open={agentDrawer.open}
        mode={agentDrawer.open && agentDrawer.mode === 'edit' ? 'edit' : 'create'}
        agentId={agentDrawer.open && agentDrawer.mode === 'edit' ? agentDrawer.agentId : undefined}
        initialTenantId={agentDrawer.open && agentDrawer.mode === 'create' ? agentDrawer.tenantId : undefined}
        initialGroupId={agentDrawer.open && agentDrawer.mode === 'create' ? agentDrawer.groupId : undefined}
        onClose={() => setAgentDrawer({ open: false })}
      />
    </div>
  );
}

function findGroup(tree: AgentGroupNode[], id: number): AgentGroupNode | null {
  for (const n of tree) {
    if (n.groupId === id) return n;
    if (n.children?.length) {
      const found = findGroup(n.children, id);
      if (found) return found;
    }
  }
  return null;
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
      title={`${name} · ${count.toLocaleString()}명`}
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
