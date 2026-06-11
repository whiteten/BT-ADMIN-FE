/**
 * BSR 그룹 관리 페이지 (AS-IS SWAT IPR20S3040).
 *
 * 레이아웃 (IPRON 표준 A타입 — 테넌트 카드, 노드 종속 없음):
 *  박스1: 헤더 (타이틀 + 선택 테넌트 라벨)
 *  박스2: 테넌트 카드 슬라이더 (compact pill ↔ expanded card h-[140px] 토글)
 *  박스3: 좌(BSR 그룹 ag-Grid 풀높이) + 우(인라인 드로어 w-[480px])
 *    - 좌: BSR 그룹 목록 (행 클릭 → 우측 드로어 open / 더블클릭 → 수정 Drawer)
 *    - 우: 그룹 선택 시 열리는 인라인 상세 드로어 (스케줄 탭)
 *      · 스케줄 탭: 배정 스케줄 ag-Grid + 추가/배정해제 버튼 (CRUD 보존)
 *      · 기본정보/지역번호 라우팅 편집은 "그룹 수정" 버튼 → BsrGroupFormDrawer(오버레이) 재사용
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Empty, Input } from 'antd';
import { Building2, ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import BsrGroupFormDrawer from '../../features/bsr-group/components/BsrGroupFormDrawer';
import BsrScheduleFormDrawer from '../../features/bsr-group/components/BsrScheduleFormDrawer';
import {
  useCreateBsrGroup,
  useCreateBsrSchedule,
  useDeleteBsrGroup,
  useGetBsrGroupSchedules,
  useGetBsrGroupTenants,
  useGetBsrGroups,
  useUnassignBsrSchedule,
  useUpdateBsrGroup,
  useUpdateBsrSchedule,
} from '../../features/bsr-group/hooks/useBsrGroupQueries';
import {
  type BsrGroupCreateRequest,
  type BsrGroupResponse,
  type BsrGroupTenantStat,
  type BsrGroupUpdateRequest,
  type BsrScheduleInfoCreateRequest,
  type BsrScheduleInfoResponse,
  type BsrScheduleInfoUpdateRequest,
  getBsrMethodLabel,
} from '../../features/bsr-group/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: '번호자원관리', path: '/ipron/bsr-group' },
  { title: '라우팅 설정', path: '/ipron/bsr-group' },
  { title: 'BSR 그룹 관리', path: '/ipron/bsr-group' },
];

// ──────────────────────────────────────────────────────────
//  카드 컴포넌트 (AdnTenantCard 패턴 — 표준 토큰 그대로)
// ──────────────────────────────────────────────────────────

interface BsrTenantCardProps {
  tenantId: number | null; // null = "전체"
  tenantName: string;
  bsrGroupCount: number;
  selected: boolean;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function BsrTenantCard({ tenantId, tenantName, bsrGroupCount, selected, onClick }: BsrTenantCardProps) {
  const isAll = tenantId === null;
  return (
    <div
      className={`bg-white border rounded-lg p-3 cursor-pointer transition-all w-[240px] h-[100px] flex-shrink-0 flex flex-col ${
        selected ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]' : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {isAll ? (
          <span className={`text-[13px] font-semibold ${selected ? 'text-[#405189]' : 'text-gray-600'}`}>전체</span>
        ) : (
          <>
            <Building2 className={`size-3.5 flex-shrink-0 ${selected ? 'text-[#405189]' : 'text-gray-500'}`} />
            <span className={`text-[13px] font-semibold truncate ${selected ? 'text-[#405189]' : 'text-gray-800'}`} title={tenantName}>
              {tenantName}
            </span>
          </>
        )}
      </div>
      <div className="flex-1 flex flex-col gap-0.5 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">BSR 그룹</span>
          <span className="font-semibold text-gray-800">{bsrGroupCount.toLocaleString()}건</span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
//  Compact pill (접힘 상태)
// ──────────────────────────────────────────────────────────

interface CompactPillProps {
  name: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}

function CompactTenantPill({ name, count, selected, onClick }: CompactPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
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

function extractMsg(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

export default function BsrGroupList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const cardScrollRef = useRef<HTMLDivElement>(null);

  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // ─── State ────────────────────────────────────────────────────────────────
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(ctxTenantId);
  // default 접힘 (AdnList 표준)
  const [cardExpanded, setCardExpanded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<BsrGroupResponse | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<number[]>([]);

  // Drawer state
  const [groupDrawerOpen, setGroupDrawerOpen] = useState(false);
  const [groupDrawerMode, setGroupDrawerMode] = useState<'create' | 'edit'>('create');
  const [groupDrawerData, setGroupDrawerData] = useState<BsrGroupResponse | null>(null);

  const [scheduleDrawerOpen, setScheduleDrawerOpen] = useState(false);
  const [scheduleDrawerMode, setScheduleDrawerMode] = useState<'create' | 'edit'>('create');
  const [scheduleDrawerData, setScheduleDrawerData] = useState<BsrScheduleInfoResponse | null>(null);

  useEffect(() => {
    if (ctxTenantId != null && selectedTenantId === null) setSelectedTenantId(ctxTenantId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxTenantId]);

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: tenantStats = [] } = useGetBsrGroupTenants();
  const { data: groups = [], isLoading: isGroupsLoading } = useGetBsrGroups({
    params: selectedTenantId !== null ? { tenantId: selectedTenantId } : undefined,
  });
  const { data: schedules = [], isLoading: isSchedulesLoading } = useGetBsrGroupSchedules(selectedGroup?.bsrGroupId ?? null);

  // ─── Mutations ────────────────────────────────────────────────────────────
  const { mutate: createGroup, isPending: isCreating } = useCreateBsrGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('BSR 그룹이 등록되었습니다');
        setGroupDrawerOpen(false);
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '등록 실패')),
    },
  });
  const { mutate: updateGroup, isPending: isUpdating } = useUpdateBsrGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('BSR 그룹이 수정되었습니다');
        setGroupDrawerOpen(false);
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '수정 실패')),
    },
  });
  const { mutate: deleteGroup } = useDeleteBsrGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('BSR 그룹이 삭제되었습니다');
        setSelectedGroup(null);
        setSelectedGroupIds([]);
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '삭제 실패')),
    },
  });
  const { mutate: createSchedule, isPending: isCreatingSchedule } = useCreateBsrSchedule({
    mutationOptions: {
      onSuccess: () => {
        toast.success('스케줄이 등록되었습니다');
        setScheduleDrawerOpen(false);
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '스케줄 등록 실패')),
    },
  });
  const { mutate: updateSchedule, isPending: isUpdatingSchedule } = useUpdateBsrSchedule({
    mutationOptions: {
      onSuccess: () => {
        toast.success('스케줄이 수정되었습니다');
        setScheduleDrawerOpen(false);
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '스케줄 수정 실패')),
    },
  });
  const { mutate: unassignSchedule } = useUnassignBsrSchedule({
    mutationOptions: {
      onSuccess: () => {
        toast.success('스케줄 배정이 해제되었습니다');
        setSelectedScheduleIds([]);
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '해제 실패')),
    },
  });

  // ─── Derived ───────────────────────────────────────────────────────────────
  const totalGroupCount = useMemo(() => tenantStats.reduce((s: number, t: BsrGroupTenantStat) => s + (t.bsrGroupCount ?? 0), 0), [tenantStats]);

  const filteredGroups = useMemo(() => {
    const kw = searchText.trim().toLowerCase();
    if (!kw) return groups;
    return groups.filter((g) => [g.bsrGroupName, g.bsrMethod, g.tenantName, g.bsrGroupDesc].some((f) => f && String(f).toLowerCase().includes(kw)));
  }, [groups, searchText]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleGroupRowClicked = useCallback((row: BsrGroupResponse) => {
    setSelectedGroup(row);
    setSelectedScheduleIds([]);
  }, []);

  const handleGroupDblClicked = useCallback((row: BsrGroupResponse) => {
    setGroupDrawerMode('edit');
    setGroupDrawerData(row);
    setGroupDrawerOpen(true);
  }, []);

  // 인라인 드로어 닫기 (선택 해제)
  const handleCloseDetail = useCallback(() => {
    setSelectedGroup(null);
    setSelectedScheduleIds([]);
  }, []);

  const handleGroupCreate = useCallback(() => {
    if (!selectedTenantId) {
      toast.warning('테넌트를 먼저 선택하세요');
      return;
    }
    setGroupDrawerMode('create');
    setGroupDrawerData(null);
    setGroupDrawerOpen(true);
  }, [selectedTenantId]);

  const handleGroupBulkDelete = useCallback(() => {
    if (selectedGroupIds.length === 0) return;
    modal.confirm.execute({
      onOk: () => selectedGroupIds.forEach((id) => deleteGroup(id)),
      options: { title: 'BSR 그룹 삭제', content: `선택한 ${selectedGroupIds.length}건을 삭제하시겠습니까?` },
    });
  }, [selectedGroupIds, modal, deleteGroup]);

  const handleGroupDrawerSubmit = useCallback(
    (req: BsrGroupCreateRequest | BsrGroupUpdateRequest) => {
      if (groupDrawerMode === 'create') {
        createGroup({ ...req, tenantId: selectedTenantId as number });
      } else if (groupDrawerData) {
        updateGroup({ id: groupDrawerData.bsrGroupId, body: req as BsrGroupUpdateRequest });
      }
    },
    [groupDrawerMode, groupDrawerData, createGroup, updateGroup, selectedTenantId],
  );

  const handleScheduleCreate = useCallback(() => {
    if (!selectedGroup) {
      toast.warning('BSR 그룹을 먼저 선택하세요');
      return;
    }
    setScheduleDrawerMode('create');
    setScheduleDrawerData(null);
    setScheduleDrawerOpen(true);
  }, [selectedGroup]);

  const handleScheduleDblClicked = useCallback((row: BsrScheduleInfoResponse) => {
    setScheduleDrawerMode('edit');
    setScheduleDrawerData(row);
    setScheduleDrawerOpen(true);
  }, []);

  const handleScheduleDelete = useCallback(() => {
    if (selectedScheduleIds.length === 0 || !selectedGroup) return;
    modal.confirm.execute({
      onOk: () => selectedScheduleIds.forEach((sid) => unassignSchedule({ bsrGroupId: selectedGroup.bsrGroupId, scheduleId: sid })),
      options: { title: '스케줄 배정 해제', content: `선택한 ${selectedScheduleIds.length}건의 스케줄 배정을 해제하시겠습니까?` },
    });
  }, [selectedScheduleIds, selectedGroup, modal, unassignSchedule]);

  const handleScheduleDrawerSubmit = useCallback(
    (req: BsrScheduleInfoCreateRequest | BsrScheduleInfoUpdateRequest) => {
      if (scheduleDrawerMode === 'create') {
        createSchedule({ ...req, tenantId: selectedTenantId as number });
      } else if (scheduleDrawerData) {
        updateSchedule({ scheduleId: scheduleDrawerData.bsrScheduleId, body: req as BsrScheduleInfoUpdateRequest });
      }
    },
    [scheduleDrawerMode, scheduleDrawerData, createSchedule, updateSchedule, selectedTenantId],
  );

  // ─── Column Defs ──────────────────────────────────────────────────────────
  const groupColDefs: ColDef<BsrGroupResponse>[] = useMemo(
    () => [
      { width: 44, pinned: 'left', suppressHeaderMenuButton: true },
      { field: 'tenantName', headerName: '테넌트명', width: 120 },
      { field: 'bsrGroupName', headerName: 'BSR 그룹명', flex: 1, tooltipField: 'bsrGroupName' },
      {
        field: 'bsrMethod',
        headerName: 'BSR 메소드',
        width: 180,
        valueFormatter: ({ value }) => getBsrMethodLabel(value as string | null),
      },
      {
        field: 'activateYn',
        headerName: '활성화',
        width: 80,
        valueFormatter: ({ value }) => (value === 1 ? '활성' : '비활성'),
      },
      { field: 'sortSeq', headerName: '정렬순서', width: 90 },
      { field: 'bsrGroupDesc', headerName: '설명', flex: 1, tooltipField: 'bsrGroupDesc' },
      { field: 'workTime', headerName: '작업일시', width: 160 },
    ],
    [],
  );

  const scheduleColDefs: ColDef<BsrScheduleInfoResponse>[] = useMemo(
    () => [
      { width: 44, pinned: 'left', suppressHeaderMenuButton: true },
      { field: 'bsrScheduleName', headerName: '스케줄명', flex: 1, tooltipField: 'bsrScheduleName' },
      { field: 'startDate', headerName: '시작일', width: 120 },
      { field: 'startTime', headerName: '시작시간', width: 90 },
      { field: 'finshTime', headerName: '종료시간', width: 90 },
      {
        headerName: '요일',
        width: 160,
        valueGetter: ({ data }) => {
          if (!data) return '';
          const days: string[] = [];
          if (data.mon === 1) days.push('월');
          if (data.tue === 1) days.push('화');
          if (data.wed === 1) days.push('수');
          if (data.thu === 1) days.push('목');
          if (data.fri === 1) days.push('금');
          if (data.sat === 1) days.push('토');
          if (data.sun === 1) days.push('일');
          return days.join(' ');
        },
      },
    ],
    [],
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* 박스1: 헤더 */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px]">
          <span className="text-sm font-semibold text-gray-700">BSR 그룹 현황</span>
          {selectedTenantId !== null && (
            <span className="ml-3 text-xs text-gray-500">
              테넌트:{' '}
              <span className="font-medium text-gray-700">
                {tenantStats.find((t: BsrGroupTenantStat) => t.tenantId === selectedTenantId)?.tenantName ?? `#${selectedTenantId}`}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* 박스2: 테넌트 카드 슬라이더 (표준 h-[140px] / h-[44px]) */}
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
              {/* 전체+테넌트 카드: 같은 flex gap-3 컨테이너 안 형제 (divider/추가margin 금지) */}
              <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto py-2 px-1 flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <BsrTenantCard tenantId={null} tenantName="전체" bsrGroupCount={totalGroupCount} selected={selectedTenantId === null} onClick={() => setSelectedTenantId(null)} />
                {tenantStats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 min-h-[100px]">
                    <Empty description={false} imageStyle={{ height: 40 }} />
                    <span className="text-sm">등록된 BSR 그룹이 없습니다</span>
                  </div>
                ) : (
                  tenantStats.map((t: BsrGroupTenantStat) => (
                    <BsrTenantCard
                      key={t.tenantId}
                      tenantId={t.tenantId}
                      tenantName={t.tenantName ?? '-'}
                      bsrGroupCount={t.bsrGroupCount ?? 0}
                      selected={selectedTenantId === t.tenantId}
                      onClick={(e) => {
                        setSelectedTenantId(t.tenantId);
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
                <CompactTenantPill name="전체" count={totalGroupCount} selected={selectedTenantId === null} onClick={() => setSelectedTenantId(null)} />
                {tenantStats.map((t: BsrGroupTenantStat) => (
                  <CompactTenantPill
                    key={t.tenantId}
                    name={t.tenantName ?? '-'}
                    count={t.bsrGroupCount ?? 0}
                    selected={selectedTenantId === t.tenantId}
                    onClick={() => setSelectedTenantId(t.tenantId)}
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

      {/* 박스3: 좌(BSR 그룹 그리드 풀높이) + 우(인라인 상세 드로어) */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌: BSR 그룹 목록 (풀높이) */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-w-0">
          <div className="px-4 h-[44px] border-b border-gray-100 flex items-center flex-shrink-0 gap-2">
            <span className="text-sm font-semibold text-gray-700">BSR 그룹 목록 ({filteredGroups.length.toLocaleString()}건)</span>
            {selectedGroupIds.length > 0 && (
              <span className="text-xs text-gray-500">
                {filteredGroups.length.toLocaleString()}건 중 {selectedGroupIds.length}건 선택
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="그룹명/메소드/설명 검색"
                value={searchText}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
                style={{ width: 220 }}
              />
              <Button danger icon={<Trash2 className="size-3.5" />} onClick={handleGroupBulkDelete} disabled={selectedGroupIds.length === 0}>
                {selectedGroupIds.length > 0 ? `삭제 (${selectedGroupIds.length})` : '삭제'}
              </Button>
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleGroupCreate}>
                등록
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <AgGridReact<BsrGroupResponse>
              {...gridOptions}
              rowData={filteredGroups}
              columnDefs={groupColDefs}
              loading={isGroupsLoading}
              rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true }}
              onRowClicked={(e) => e.data && handleGroupRowClicked(e.data)}
              onRowDoubleClicked={(e) => e.data && handleGroupDblClicked(e.data)}
              onSelectionChanged={(e) => setSelectedGroupIds(e.api.getSelectedRows().map((r) => r.bsrGroupId))}
            />
          </div>
        </div>

        {/* 우: 인라인 상세 드로어 (그룹 선택 시 열림 — 스케줄 탭) */}
        {selectedGroup && (
          <div className="bg-white bt-shadow flex flex-col w-[480px] flex-shrink-0 min-h-0">
            {/* 드로어 헤더 */}
            <div className="px-4 h-[44px] border-b border-gray-100 flex items-center flex-shrink-0 gap-2">
              <span className="text-sm font-semibold text-gray-800 truncate flex-1" title={selectedGroup.bsrGroupName ?? ''}>
                {selectedGroup.bsrGroupName} 상세
              </span>
              <Button size="small" icon={<Pencil className="size-3" />} onClick={() => handleGroupDblClicked(selectedGroup)}>
                그룹 수정
              </Button>
              <Button type="text" size="small" icon={<X className="size-4" />} onClick={handleCloseDetail} title="닫기" className="!text-gray-400 hover:!text-[#405189]" />
            </div>

            {/* 스케줄 섹션 헤더 (탭 1개 — 스케줄) */}
            <div className="px-4 h-[40px] border-b border-gray-100 flex items-center flex-shrink-0 gap-2">
              <span className="text-xs font-semibold text-[#405189] border-b-2 border-[#405189] h-full flex items-center">스케줄 ({schedules.length.toLocaleString()})</span>
              <div className="ml-auto flex items-center gap-2">
                <Button danger size="small" icon={<Trash2 className="size-3" />} onClick={handleScheduleDelete} disabled={selectedScheduleIds.length === 0}>
                  {selectedScheduleIds.length > 0 ? `배정 해제 (${selectedScheduleIds.length})` : '배정 해제'}
                </Button>
                <Button type="primary" size="small" icon={<Plus className="size-3" />} onClick={handleScheduleCreate}>
                  스케줄 등록
                </Button>
              </div>
            </div>

            {/* 스케줄 그리드 */}
            <div className="flex-1 min-h-0">
              <AgGridReact<BsrScheduleInfoResponse>
                {...gridOptions}
                rowData={schedules}
                columnDefs={scheduleColDefs}
                loading={isSchedulesLoading}
                rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true }}
                onRowDoubleClicked={(e) => e.data && handleScheduleDblClicked(e.data)}
                onSelectionChanged={(e) => setSelectedScheduleIds(e.api.getSelectedRows().map((r) => r.bsrScheduleId))}
              />
            </div>
          </div>
        )}
      </div>

      {/* BSR 그룹 Drawer */}
      <BsrGroupFormDrawer
        open={groupDrawerOpen}
        mode={groupDrawerMode}
        group={groupDrawerData}
        defaultTenantId={selectedTenantId}
        onCancel={() => setGroupDrawerOpen(false)}
        onSubmit={handleGroupDrawerSubmit}
        loading={isCreating || isUpdating}
      />

      {/* 스케줄 Drawer */}
      <BsrScheduleFormDrawer
        open={scheduleDrawerOpen}
        mode={scheduleDrawerMode}
        schedule={scheduleDrawerData}
        defaultTenantId={selectedTenantId}
        onCancel={() => setScheduleDrawerOpen(false)}
        onSubmit={handleScheduleDrawerSubmit}
        loading={isCreatingSchedule || isUpdatingSchedule}
      />
    </div>
  );
}
