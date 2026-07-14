/**
 * 상담사 ADN 관리 (자동채번/매핑) 페이지.
 *
 * AS-IS: SWAT IPR20S3011
 * menuKey: ipron-dn-agent-adn
 * BE:     /api/ipron/agent-adns
 *
 * 멀티테넌트 개편(상담사 관리 정합): 상단 테넌트 카드 슬라이더 제거.
 *   - 일반 콘솔: 테넌트 선택기 없음(토큰=활성 테넌트 스코프). 헤더에 요약(총/배정/미배정)만.
 *   - 운영자 모드: 헤더에 대행 테넌트 ScopeSelect(공통) + 그 옆에 요약.
 *
 * 화면 구조:
 *   [헤더 h-56 — 스코프 선택 + 요약 + 검색/상태 필터]
 *   [좌 상담그룹 트리 + 스플리터 + 우 ag-Grid + 자동채번/자동배정/배정해제 액션]
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Select } from 'antd';
import { Search, Settings, Zap } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import AdnAutoConfigDrawer from '../../features/agent-adn/components/AdnAutoConfigDrawer';
import AgentAdnTable from '../../features/agent-adn/components/AgentAdnTable';
import { useAutoAssign, useGetAdnAutoConfig, useGetAgentAdnTenants, useGetAgentAdns, useSaveAdnAutoConfig, useUnassign } from '../../features/agent-adn/hooks/useAgentAdnQueries';
import type { AgentAdnRowResponse } from '../../features/agent-adn/types';
import AgentGroupTree from '../../features/agent-master/components/AgentGroupTree';
import { useGetAgentGroupTree } from '../../features/agent-master/hooks/useAgentMasterQueries';
import ScopeSelect from '@/components/custom/ScopeSelect';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '상담사 관리' }, { title: '상담사' }, { title: '상담사 ADN 배정', path: '/ipron/agent-adn' }];

export default function AgentAdnList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const modal = useModal();

  // ctx 테넌트 (JWT — 사용자 본인 테넌트)
  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // 운영자 모드(통합운영) — 시스템 관리자가 헤더 TenantChip 에서 진입.
  //  - 전체(actAsTenantId=null): tenantId 미전달 → apiClient 가 X-View-All-Tenants 주입 → 전체 테넌트 조회
  //  - 대행(actAsTenantId=X): tenantId=X 로 조회 스코프 + apiClient 가 X-Act-As-Tenant 주입 → X 대행 CUD
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const actAsTenantId = useOperatorScopeStore((s) => s.actAsTenantId);
  const setActAsTenant = useOperatorScopeStore((s) => s.setActAsTenant);
  const opTenantId = actAsTenantId ? Number(actAsTenantId) : null;
  // 조회/등록 스코프: 일반=활성테넌트 / 운영자=대행테넌트(null=전체).
  const selectedTenantId = operatorMode ? opTenantId : ctxTenantId;

  // ─── State ──────────────────────────────────────────────────────────────
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [selectedRows, setSelectedRows] = useState<AgentAdnRowResponse[]>([]);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [treeWidth, setTreeWidth] = useState(260);
  const splitRef = useRef<HTMLDivElement>(null);

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

  // 헤더 요약 — 현재 스코프(전체=합계 / 특정 테넌트=해당)의 총/배정/미배정.
  const summary = useMemo(() => {
    const stats = selectedTenantId == null ? tenantStats : tenantStats.filter((t) => t.tenantId === selectedTenantId);
    return stats.reduce((a, t) => ({ total: a.total + t.totalCnt, assigned: a.assigned + t.assignedCnt, unassigned: a.unassigned + t.unassignedCnt }), {
      total: 0,
      assigned: 0,
      unassigned: 0,
    });
  }, [tenantStats, selectedTenantId]);

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
      {/* ===== 박스 1: 헤더 (스코프 선택 + 요약 + 검색/상태 필터) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px] gap-3">
          {/* 운영자 모드: 대행 테넌트 선택(공통 ScopeSelect). 일반 콘솔은 브레드크럼이 화면명 표기. */}
          {operatorMode && (
            <ScopeSelect
              kind="tenant"
              options={tenantStats.map((t) => ({ id: t.tenantId, name: t.tenantName ?? `테넌트 ${t.tenantId}`, count: t.totalCnt }))}
              value={actAsTenantId}
              onChange={(id) => {
                setActAsTenant(id);
                setSelectedGroupId(null);
                setSelectedRows([]);
              }}
            />
          )}
          {/* 요약 — 총/배정/미배정 (운영자는 선택 뒤, 일반은 좌측). */}
          <div className={`flex items-center gap-4 text-[13px] ${operatorMode ? 'ml-3 pl-3 border-l border-gray-200' : ''}`}>
            <span className="text-gray-500">
              총 상담사 <b className="text-gray-800 font-semibold">{summary.total.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              배정 <b className="text-green-600 font-semibold">{summary.assigned.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              미배정 <b className="text-orange-600 font-semibold">{summary.unassigned.toLocaleString()}</b>
            </span>
          </div>
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

      {/* ===== 박스 2: 좌 그룹트리 + 스플리터 + 우 ag-Grid ===== */}
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
                disabled={!operatorMode}
                title={
                  !operatorMode
                    ? '자동채번 정책 설정은 운영자 모드에서만 가능합니다'
                    : policy?.active
                      ? `정책: ${policy.adnPrefix} + ${policy.digitLength}자리 (활성)`
                      : '자동채번 정책 비활성'
                }
              >
                자동채번 설정
                {operatorMode && policy && !policy.active && <span className="ml-1 text-[10px] text-orange-500">●</span>}
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
