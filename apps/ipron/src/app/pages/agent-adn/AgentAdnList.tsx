/**
 * 상담사 ADN 관리 (자동채번/매핑) 페이지.
 *
 * AS-IS: SWAT IPR20S3011
 * menuKey: ipron-dn-agent-adn
 * BE:     /api/ipron/agent-adns
 *
 * 화면 구조 (IPRON 표준 — 트리 없음):
 *   [헤더 h-56]
 *   [테넌트 카드 슬라이더 expanded h-140 / compact h-44]
 *   [ag-Grid 단일 그리드 + 상태 필터 + 자동채번/자동배정/배정해제 액션]
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Empty, Input, Select } from 'antd';
import { ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, Search, Settings, Zap } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import AdnAutoConfigDrawer from '../../features/agent-adn/components/AdnAutoConfigDrawer';
import AgentAdnTable from '../../features/agent-adn/components/AgentAdnTable';
import AgentAdnTenantCard from '../../features/agent-adn/components/AgentAdnTenantCard';
import { useAutoAssign, useGetAdnAutoConfig, useGetAgentAdnTenants, useGetAgentAdns, useSaveAdnAutoConfig, useUnassign } from '../../features/agent-adn/hooks/useAgentAdnQueries';
import type { AgentAdnRowResponse } from '../../features/agent-adn/types';
import AgentGroupTree from '../../features/agent-master/components/AgentGroupTree';
import { useGetAgentGroupTree } from '../../features/agent-master/hooks/useAgentMasterQueries';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: 'IPRON' }, { title: '상담사 관리' }, { title: '상담사' }, { title: '상담사 ADN 배정', path: '/ipron/agent-adn' }];

export default function AgentAdnList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const modal = useModal();
  const cardScrollRef = useRef<HTMLDivElement>(null);

  // ctx 테넌트 (JWT)
  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // ─── State ──────────────────────────────────────────────────────────────
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(ctxTenantId);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [selectedRows, setSelectedRows] = useState<AgentAdnRowResponse[]>([]);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [cardExpanded, setCardExpanded] = useState(false);
  const [treeWidth, setTreeWidth] = useState(260);
  const splitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ctxTenantId != null && selectedTenantId === null) {
      setSelectedTenantId(ctxTenantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxTenantId]);

  // 테넌트 변경 시 그룹 선택/체크 해제
  useEffect(() => {
    setSelectedGroupId(null);
    setSelectedRows([]);
  }, [selectedTenantId]);

  const handleSelectGroup = useCallback((groupId: number | null) => {
    setSelectedGroupId(groupId);
    setSelectedRows([]);
  }, []);

  const onSplitterMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = treeWidth;
      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        setTreeWidth(Math.max(180, Math.min(480, startWidth + delta)));
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

  // ─── Queries ────────────────────────────────────────────────────────────
  const { data: rows = [], isLoading } = useGetAgentAdns({
    params: { tenantId: selectedTenantId ?? undefined, groupId: selectedGroupId ?? undefined },
  });
  const { data: tenantStats = [] } = useGetAgentAdnTenants();
  const { data: policy } = useGetAdnAutoConfig();
  const { data: groupTree = [] } = useGetAgentGroupTree({
    params: { tenantId: selectedTenantId ?? undefined },
  });

  // ─── Mutations ──────────────────────────────────────────────────────────
  const { mutate: savePolicy, isPending: isSavingPolicy } = useSaveAdnAutoConfig({
    mutationOptions: {
      onSuccess: () => {
        toast.success('자동채번 정책이 저장되었습니다');
        setPolicyOpen(false);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '저장 실패';
        toast.error(msg);
      },
    },
  });

  const { mutate: autoAssign, isPending: isAssigning } = useAutoAssign({
    mutationOptions: {
      onSuccess: (resp) => {
        const parts: string[] = [];
        parts.push(`${resp.assigned}건 자동배정 완료`);
        if (resp.skipped > 0) parts.push(`스킵 ${resp.skipped}건`);
        if (resp.newAdnCount > 0) parts.push(`신규 ADN ${resp.newAdnCount}건 생성`);
        toast.success(parts.join(' · '));
        setSelectedRows([]);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '자동배정 실패';
        toast.error(msg);
      },
    },
  });

  const { mutate: unassign, isPending: isUnassigning } = useUnassign({
    mutationOptions: {
      onSuccess: (count) => {
        toast.success(`${count}건 배정 해제 완료`);
        setSelectedRows([]);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '배정 해제 실패';
        toast.error(msg);
      },
    },
  });

  // ─── Derived ────────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let r = rows;
    if (selectedTenantId !== null) r = r.filter((x) => x.tenantId === selectedTenantId);
    if (statusFilter !== 'ALL') r = r.filter((x) => x.mappingStatus === statusFilter);
    const kw = searchText.trim().toLowerCase();
    if (kw) {
      r = r.filter((x) => {
        const fields: (string | null | undefined)[] = [x.agentName, x.agentLoginId, x.pbxLoginId, x.tenantName, x.groupName];
        return fields.some((f) => f != null && String(f).toLowerCase().includes(kw));
      });
    }
    return r;
  }, [rows, selectedTenantId, statusFilter, searchText]);

  const totalStats = useMemo(() => {
    let totalCnt = 0;
    let assignedCnt = 0;
    let unassignedCnt = 0;
    for (const t of tenantStats) {
      totalCnt += t.totalCnt;
      assignedCnt += t.assignedCnt;
      unassignedCnt += t.unassignedCnt;
    }
    return { totalCnt, assignedCnt, unassignedCnt };
  }, [tenantStats]);

  const selectedUnassigned = useMemo(() => selectedRows.filter((r) => r.mappingStatus === 'UNASSIGNED').length, [selectedRows]);
  const selectedAssigned = useMemo(() => selectedRows.filter((r) => r.mappingStatus === 'ASSIGNED').length, [selectedRows]);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleAutoAssign = useCallback(() => {
    if (selectedRows.length === 0) {
      toast.warning('자동배정할 상담사를 선택하세요');
      return;
    }
    if (!policy?.active) {
      toast.warning('자동채번 정책이 비활성 상태입니다 — [자동채번 설정] 에서 활성화하세요');
      return;
    }
    if (selectedUnassigned === 0) {
      toast.warning('선택한 상담사는 모두 이미 배정되어 있어 자동배정 대상이 없습니다');
      return;
    }
    modal.confirm.execute({
      onOk: () => autoAssign({ agentIds: selectedRows.map((r) => r.agentId) }),
      options: {
        title: 'ADN 자동배정',
        content: `미배정 ${selectedUnassigned}명에게 ADN을 자동 배정하시겠습니까?`,
      },
    });
  }, [selectedRows, selectedUnassigned, policy, modal, autoAssign]);

  const handleBulkUnassign = useCallback(() => {
    const targets = selectedRows.filter((r) => r.mappingStatus === 'ASSIGNED');
    if (targets.length === 0) {
      toast.warning('해제할 배정된 상담사를 선택하세요');
      return;
    }
    modal.confirm.execute({
      onOk: () => unassign({ agentIds: targets.map((r) => r.agentId) }),
      options: {
        title: '배정 일괄 해제',
        content: `배정된 상담사 ${targets.length}건의 ADN 배정을 해제하시겠습니까?`,
      },
    });
  }, [selectedRows, modal, unassign]);

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 박스 1: 헤더 ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px]">
          <span className="text-sm font-semibold text-gray-700">상담사 ADN 관리</span>
          {selectedTenantId !== null && (
            <span className="ml-3 text-xs text-gray-500">
              테넌트: <span className="font-medium text-gray-700">{tenantStats.find((t) => t.tenantId === selectedTenantId)?.tenantName ?? `#${selectedTenantId}`}</span>
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Input
              allowClear
              prefix={<Search className="size-3.5 text-gray-400" />}
              placeholder="상담사명 / ID / ADN 검색"
              value={searchText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
              style={{ width: 240 }}
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 110 }}
              options={[
                { value: 'ALL', label: '전체 상태' },
                { value: 'ASSIGNED', label: '배정' },
                { value: 'UNASSIGNED', label: '미배정' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* ===== 박스 2: 테넌트 카드 슬라이더 ===== */}
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
                <AgentAdnTenantCard tenantId={null} tenantName="전체" stats={totalStats} selected={selectedTenantId === null} onClick={() => setSelectedTenantId(null)} />
                {tenantStats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 min-h-[100px]">
                    <Empty description={false} imageStyle={{ height: 40 }} />
                    <span className="text-sm">등록된 상담사가 없습니다</span>
                  </div>
                ) : (
                  tenantStats.map((g) => (
                    <AgentAdnTenantCard
                      key={g.tenantId}
                      tenantId={g.tenantId}
                      tenantName={g.tenantName ?? '-'}
                      stats={{ totalCnt: g.totalCnt, assignedCnt: g.assignedCnt, unassignedCnt: g.unassignedCnt }}
                      selected={selectedTenantId === g.tenantId}
                      onClick={(e) => {
                        setSelectedTenantId(g.tenantId);
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
                <CompactTenantPill
                  name="전체"
                  count={totalStats.totalCnt}
                  unassigned={totalStats.unassignedCnt}
                  selected={selectedTenantId === null}
                  onClick={() => setSelectedTenantId(null)}
                />
                {tenantStats.map((g) => (
                  <CompactTenantPill
                    key={g.tenantId}
                    name={g.tenantName ?? '-'}
                    count={g.totalCnt}
                    unassigned={g.unassignedCnt}
                    selected={selectedTenantId === g.tenantId}
                    onClick={() => setSelectedTenantId(g.tenantId)}
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

      {/* ===== 박스 3: 좌 그룹트리 + 스플리터 + 우 ag-Grid ===== */}
      <div ref={splitRef} className="flex flex-1 min-h-0 gap-4">
        {/* 좌측 상담그룹 트리 (read-only) */}
        <div className="bg-white bt-shadow flex flex-col flex-shrink-0 overflow-hidden" style={{ width: treeWidth }}>
          <div className="flex items-center px-4 h-[44px] border-b border-gray-100 flex-shrink-0">
            <span className="text-sm font-semibold text-gray-700">상담그룹</span>
            {selectedGroupId !== null && (
              <button type="button" onClick={() => handleSelectGroup(null)} className="ml-auto text-xs text-gray-400 hover:text-[#405189]" title="그룹 선택 해제">
                전체 보기
              </button>
            )}
          </div>
          <div className="flex-1 min-h-0">
            <AgentGroupTree tree={groupTree} selectedGroupId={selectedGroupId} onSelectGroup={handleSelectGroup} />
          </div>
        </div>

        {/* 스플리터 */}
        <div className="flex-shrink-0 -mx-2 w-4 cursor-col-resize relative group" onMouseDown={onSplitterMouseDown}>
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-px h-9 bg-gray-300 rounded group-hover:bg-[#405189] transition-colors" />
        </div>

        {/* 우측 ag-Grid */}
        <div className="bg-white bt-shadow flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 h-[44px] flex-shrink-0">
            <span className="text-sm font-semibold text-gray-800">상담사 목록 ({filteredRows.length.toLocaleString()}명)</span>
            <span className={selectedRows.length > 0 ? 'text-xs text-gray-500' : 'invisible text-xs text-gray-500'}>
              선택 {selectedRows.length}건 (미배정 <b className="text-orange-600">{selectedUnassigned}</b> · 배정 <b className="text-green-700">{selectedAssigned}</b>)
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                icon={<Settings className="size-3.5" />}
                onClick={() => setPolicyOpen(true)}
                title={policy?.active ? `정책: ${policy.adnPrefix} + ${policy.digitLength}자리 (활성)` : '자동채번 정책 비활성'}
              >
                자동채번 설정
                {policy && !policy.active && <span className="ml-1 text-[10px] text-orange-500">●</span>}
              </Button>
              <Button
                type="primary"
                icon={<Zap className="size-3.5" />}
                onClick={handleAutoAssign}
                loading={isAssigning}
                disabled={!policy?.active || selectedUnassigned === 0}
                title={!policy?.active ? '먼저 자동채번 정책을 활성화하세요' : selectedUnassigned === 0 ? '미배정 상담사를 선택하세요' : `미배정 ${selectedUnassigned}명 자동배정`}
              >
                자동배정
              </Button>
              <Button
                danger
                onClick={handleBulkUnassign}
                loading={isUnassigning}
                disabled={selectedAssigned === 0}
                title={selectedAssigned === 0 ? '해제할 배정된 상담사를 선택하세요' : `${selectedAssigned}건 배정 해제`}
              >
                배정 해제
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <AgentAdnTable rowData={filteredRows} isLoading={isLoading} onSelectionChanged={setSelectedRows} />
          </div>
        </div>
      </div>

      <AdnAutoConfigDrawer open={policyOpen} initial={policy ?? null} onCancel={() => setPolicyOpen(false)} onSubmit={(values) => savePolicy(values)} submitting={isSavingPolicy} />
    </div>
  );
}

interface CompactTenantPillProps {
  name: string;
  count: number;
  unassigned: number;
  selected: boolean;
  onClick: () => void;
}

function CompactTenantPill({ name, count, unassigned, selected, onClick }: CompactTenantPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${name} · 전체 ${count.toLocaleString()} / 미배정 ${unassigned.toLocaleString()}`}
      className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition ${
        selected
          ? 'border-[#405189] bg-[#405189] text-white shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
          : 'border-gray-200 bg-white text-gray-700 hover:border-[#c5cbe0] hover:text-[#405189]'
      }`}
    >
      <span className="font-medium truncate max-w-[120px]">{name}</span>
      <span className={`text-[11px] ${selected ? 'text-white/80' : 'text-gray-400'}`}>{count.toLocaleString()}</span>
      {unassigned > 0 && <span className={`text-[10px] px-1 rounded ${selected ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-600'}`}>{unassigned}</span>}
    </button>
  );
}
