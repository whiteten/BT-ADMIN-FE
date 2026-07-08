/**
 * 상담사/상담그룹 스케줄 관리 (menuKey=ipron-agent-schedule).
 *
 * AS-IS: SWAT IPR20S4010(상담사 상세 스케줄 탭) / IPR20S4020(상담그룹 상세 스케줄 탭).
 * BT-ADMIN 통합 화면: 종류 3탭(미디어/근무/스킬) × 주체 토글(상담사/상담그룹).
 *
 * 멀티테넌트 개편(상담사 관리 정합): 상단 테넌트 카드 슬라이더 제거.
 *   - 일반 콘솔: 테넌트 선택기 없음(토큰=활성 테넌트 스코프). 헤더에 요약만.
 *   - 운영자 모드: 헤더에 대행 테넌트 ScopeSelect(공통) + 그 옆에 요약.
 *
 * 레이아웃 (IPRON 신규 표준 — 트리 없음):
 *  - 박스1 헤더: (운영자 ScopeSelect) + 요약 + 검색 + 등록
 *  - 박스2 그리드: 탭바(3탭+토글) + 액션바(삭제/배정/등록) + ag-Grid
 *  - Drawer: 정의 등록/수정(ScheduleInfoDrawer) · 배정 관리(ScheduleAssignDrawer)
 *
 * 삭제 정책 (REQUIREMENTS §3.3): 배정행 존재 시 거부.
 *  배정>0 행은 확인 모달에서 건수 고지 후 제외, 배정0 행만 삭제.
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input } from 'antd';
import { Plus, Search, Trash2, UserPlus } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import ScheduleAssignDrawer from '../../features/agent-schedule/components/ScheduleAssignDrawer';
import ScheduleInfoDrawer from '../../features/agent-schedule/components/ScheduleInfoDrawer';
import ScheduleInfoTable from '../../features/agent-schedule/components/ScheduleInfoTable';
import { useCreateSchedule, useDeleteSchedule, useGetScheduleTenants, useGetSchedules, useUpdateSchedule } from '../../features/agent-schedule/hooks/useAgentScheduleQueries';
import {
  SCHEDULE_KIND_LABELS,
  SUBJECT_LABELS,
  type ScheduleInfoRequest,
  type ScheduleInfoResponse,
  type ScheduleKind,
  type ScheduleSubject,
} from '../../features/agent-schedule/types';
import ScopeSelect from '@/components/custom/ScopeSelect';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '상담사 관리' }, { title: '스케줄', path: '/ipron/agent-schedule' }];

const KIND_TABS: ScheduleKind[] = ['media', 'work', 'skill'];

export default function AgentScheduleList() {
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
  const [kind, setKind] = useState<ScheduleKind>('media');
  const [subject, setSubject] = useState<ScheduleSubject>('agent');
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState<ScheduleInfoResponse[]>([]);

  const [infoDrawer, setInfoDrawer] = useState<{ open: boolean; mode: 'create' | 'edit'; schedule: ScheduleInfoResponse | null }>({
    open: false,
    mode: 'create',
    schedule: null,
  });
  const [assignDrawer, setAssignDrawer] = useState<{ open: boolean; schedule: ScheduleInfoResponse | null }>({ open: false, schedule: null });

  // ─── Queries ────────────────────────────────────────────────────────────
  const { data: schedules = [], isLoading } = useGetSchedules(kind, {
    params: { tenantId: selectedTenantId ?? undefined, subject },
  });
  const { data: tenantStats = [] } = useGetScheduleTenants();

  // ─── Mutations ──────────────────────────────────────────────────────────
  const { mutate: createSchedule, isPending: creating } = useCreateSchedule(kind, {
    mutationOptions: {
      onSuccess: () => {
        toast.success('스케줄이 등록되었습니다');
        setInfoDrawer((p) => ({ ...p, open: false }));
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '등록 실패')),
    },
  });
  const { mutate: updateSchedule, isPending: updating } = useUpdateSchedule(kind, {
    mutationOptions: {
      onSuccess: () => {
        toast.success('스케줄이 수정되었습니다');
        setInfoDrawer((p) => ({ ...p, open: false }));
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '수정 실패')),
    },
  });
  const { mutate: deleteSchedule, isPending: isDeleting } = useDeleteSchedule(kind, {
    mutationOptions: {
      onSuccess: () => {
        toast.success('선택한 스케줄이 삭제되었습니다');
        setSelectedRows([]);
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '삭제 실패')),
    },
  });

  // ─── Derived ────────────────────────────────────────────────────────────
  const filteredSchedules = useMemo(() => {
    const kw = searchText.trim().toLowerCase();
    if (!kw) return schedules;
    return schedules.filter((r) => {
      const fields: (string | null | undefined)[] = [r.scheduleName, r.skillName];
      return fields.some((f) => f != null && f.toLowerCase().includes(kw));
    });
  }, [schedules, searchText]);

  // 헤더 요약 — 현재 스코프(전체=합계 / 특정 테넌트=해당)의 스케줄/배정 상담사/배정 상담그룹.
  const summary = useMemo(() => {
    const rows = selectedTenantId == null ? tenantStats : tenantStats.filter((t) => t.tenantId === selectedTenantId);
    return rows.reduce(
      (a, t) => ({
        scheduleCount: a.scheduleCount + (t.scheduleCount ?? 0),
        assignedAgentCount: a.assignedAgentCount + (t.assignedAgentCount ?? 0),
        assignedGroupCount: a.assignedGroupCount + (t.assignedGroupCount ?? 0),
      }),
      { scheduleCount: 0, assignedAgentCount: 0, assignedGroupCount: 0 },
    );
  }, [tenantStats, selectedTenantId]);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleSwitchKind = useCallback((k: ScheduleKind) => {
    setKind(k);
    setSelectedRows([]);
  }, []);

  const handleSwitchSubject = useCallback((s: ScheduleSubject) => {
    setSubject(s);
    setSelectedRows([]);
  }, []);

  const handleCreate = useCallback(() => {
    if (selectedTenantId == null) {
      toast.warning('대행할 테넌트를 먼저 선택하세요');
      return;
    }
    setAssignDrawer({ open: false, schedule: null });
    setInfoDrawer({ open: true, mode: 'create', schedule: null });
  }, [selectedTenantId]);

  const handleEdit = useCallback((row: ScheduleInfoResponse) => {
    setAssignDrawer({ open: false, schedule: null });
    setInfoDrawer({ open: true, mode: 'edit', schedule: row });
  }, []);

  const handleInfoSubmit = useCallback(
    (req: ScheduleInfoRequest) => {
      if (infoDrawer.mode === 'create') createSchedule(req);
      else if (infoDrawer.schedule) updateSchedule({ id: infoDrawer.schedule.scheduleId, body: req });
    },
    [infoDrawer, createSchedule, updateSchedule],
  );

  const handleOpenAssign = useCallback(() => {
    if (selectedRows.length !== 1) {
      toast.warning('배정할 스케줄 1건을 선택하세요');
      return;
    }
    setInfoDrawer((p) => ({ ...p, open: false }));
    setAssignDrawer({ open: true, schedule: selectedRows[0] });
  }, [selectedRows]);

  /**
   * 일괄 삭제 — 배정행 존재 시 거부(REQUIREMENTS §3.3).
   * 배정>0 행은 건수 고지 후 제외, 배정0 행만 삭제. IPRON 표준 확인 모달(antd) 사용.
   */
  const handleBulkDelete = useCallback(() => {
    if (selectedRows.length === 0) return;
    const total = selectedRows.length;
    const blocked = selectedRows.filter((r) => (r.assignedCount ?? 0) > 0);
    const deletable = selectedRows.filter((r) => (r.assignedCount ?? 0) <= 0);

    const runDelete = () => deletable.forEach((r) => deleteSchedule(r.scheduleId));

    if (blocked.length > 0) {
      const totalAssigned = blocked.reduce((sum, r) => sum + (r.assignedCount ?? 0), 0);
      const headline = `선택한 ${total}건 중 ${blocked.length}건은 배정된 상담사/상담그룹이 있어 삭제할 수 없습니다 (배정 합계 ${totalAssigned.toLocaleString()}건). 배정을 먼저 해제하세요.`;

      if (deletable.length === 0) {
        // 전부 차단 — 정보 모달만 (삭제 진행 없음)
        modal.show.info(headline, '삭제 불가');
        return;
      }

      modal.confirm.delete({
        onOk: runDelete,
        options: {
          title: '스케줄 삭제',
          content: `${headline}\n나머지 ${deletable.length}건은 삭제할 수 있습니다. 계속하시겠습니까?`,
        },
      });
      return;
    }

    modal.confirm.delete({
      onOk: runDelete,
      options: { title: '스케줄 일괄 삭제', content: `선택한 ${total}건의 스케줄을 삭제하시겠습니까?` },
    });
  }, [selectedRows, modal, deleteSchedule]);

  const subjectLabel = SUBJECT_LABELS[subject];
  const kindLabel = SCHEDULE_KIND_LABELS[kind];

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 박스 1: 헤더 (스코프 선택 + 요약 + 검색 + 등록) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px] gap-3">
          {/* 운영자 모드: 대행 테넌트 선택(공통 ScopeSelect). 일반 콘솔은 브레드크럼이 화면명 표기. */}
          {operatorMode && (
            <ScopeSelect
              kind="tenant"
              options={tenantStats.map((t) => ({ id: t.tenantId, name: t.tenantName ?? `테넌트 ${t.tenantId}`, count: t.scheduleCount }))}
              value={actAsTenantId}
              onChange={(id) => {
                setActAsTenant(id);
                setSelectedRows([]);
              }}
            />
          )}
          {/* 요약 — 총 스케줄/배정 상담사/배정 상담그룹 (운영자는 선택 뒤, 일반은 좌측). */}
          <div className={`flex items-center gap-4 text-[13px] ${operatorMode ? 'pl-3 border-l border-gray-200' : ''}`}>
            <span className="text-gray-500">
              총 스케줄 <b className="text-gray-800 font-semibold">{summary.scheduleCount.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              배정 상담사 <b className="text-[#405189] font-semibold">{summary.assignedAgentCount.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              배정 상담그룹 <b className="text-amber-600 font-semibold">{summary.assignedGroupCount.toLocaleString()}</b>
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Input
              allowClear
              prefix={<Search className="size-3.5 text-gray-400" />}
              placeholder="스케줄명 검색"
              value={searchText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
              style={{ width: 220 }}
            />
            <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
              등록
            </Button>
          </div>
        </div>
      </div>

      {/* ===== 박스 2: 그리드 ===== */}
      <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* 탭바: 종류 3탭 + 주체 토글 */}
        <div className="border-b border-gray-100 flex items-center gap-2 h-[44px] pr-4 flex-shrink-0">
          <div className="flex items-stretch h-full">
            {KIND_TABS.map((k) => (
              <KindTab key={k} label={SCHEDULE_KIND_LABELS[k]} active={kind === k} onClick={() => handleSwitchKind(k)} />
            ))}
          </div>
          <div className="w-px h-4 bg-gray-200 flex-shrink-0 mx-1.5" />
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-md p-0.5">
            <SubjectToggle label={SUBJECT_LABELS.agent} active={subject === 'agent'} onClick={() => handleSwitchSubject('agent')} />
            <SubjectToggle label={SUBJECT_LABELS.group} active={subject === 'group'} onClick={() => handleSwitchSubject('group')} />
          </div>
        </div>

        {/* 액션바 */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 h-[44px] flex-shrink-0">
          <span className="text-sm font-semibold text-gray-800">
            {kindLabel} 목록 ({filteredSchedules.length.toLocaleString()}건)
          </span>
          {selectedRows.length > 0 && <span className="text-xs text-gray-500">{selectedRows.length}건 선택</span>}
          <div className="ml-auto flex items-center gap-2">
            <Button
              danger
              icon={<Trash2 className="size-3.5" />}
              onClick={handleBulkDelete}
              loading={isDeleting}
              disabled={selectedRows.length === 0}
              title={selectedRows.length === 0 ? '삭제할 스케줄을 선택하세요' : '선택한 스케줄 삭제'}
            >
              삭제
            </Button>
            <Button
              icon={<UserPlus className="size-3.5" />}
              onClick={handleOpenAssign}
              disabled={selectedRows.length !== 1}
              title={selectedRows.length !== 1 ? '배정할 스케줄 1건을 선택하세요' : `${subjectLabel} 배정 관리`}
            >
              배정
            </Button>
            <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
              등록
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <ScheduleInfoTable rowData={filteredSchedules} kind={kind} subject={subject} isLoading={isLoading} onRowDoubleClicked={handleEdit} onSelectionChanged={setSelectedRows} />
        </div>
      </div>

      <ScheduleInfoDrawer
        open={infoDrawer.open}
        mode={infoDrawer.mode}
        kind={kind}
        schedule={infoDrawer.schedule}
        tenantId={selectedTenantId}
        onCancel={() => setInfoDrawer((p) => ({ ...p, open: false }))}
        onSubmit={handleInfoSubmit}
        loading={creating || updating}
      />

      <ScheduleAssignDrawer
        open={assignDrawer.open}
        kind={kind}
        subject={subject}
        schedule={assignDrawer.schedule}
        onClose={() => setAssignDrawer({ open: false, schedule: null })}
      />
    </div>
  );
}

function extractMsg(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

interface KindTabProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function KindTab({ label, active, onClick }: KindTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-[18px] h-full text-sm font-semibold transition-colors ${active ? 'text-[#405189]' : 'text-gray-400 hover:text-gray-600'}`}
    >
      {label}
      {active && <span className="absolute left-0 bottom-0 w-full h-0.5 bg-[#405189]" />}
    </button>
  );
}

interface SubjectToggleProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function SubjectToggle({ label, active, onClick }: SubjectToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded text-xs font-medium transition ${active ? 'bg-white text-[#405189] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
    >
      {label}
    </button>
  );
}
