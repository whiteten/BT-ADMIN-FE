/**
 * BSR 그룹별 CTI큐 배정 페이지 (AS-IS SWAT IPR20S3060).
 *
 * 레이아웃 (IPRON 표준 A타입 — 테넌트 카드, 노드 종속 없음):
 *  박스1: 헤더 (타이틀 + 선택 테넌트)
 *  박스2: 테넌트 카드 슬라이더
 *  박스2b: BSR 그룹 chip 선택 바 (테넌트 카드 선택 후)
 *  박스3: CTI큐 인라인 편집 ag-Grid
 *         - bsrWeight/bsrYn/bsrDistributeYn 셀 하늘색 배경 인라인 편집
 *         - 상단 툴바: CTI큐 배정 + 저장 버튼
 *
 * 인라인 편집 컬럼 (SWAT updBsrGroupMasterList 정합):
 *   bsrWeight (숫자 0~1000), bsrYn (0/1 콤보), bsrDistributeYn (0/1 콤보)
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CellEditingStoppedEvent, ColDef } from 'ag-grid-community';
import { AgGridReact, type AgGridReact as AgGridReactType } from 'ag-grid-react';
import { Button, Empty, Input } from 'antd';
import { Building2, ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, Plus, Save, Search, Trash2 } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useAssignBsrCtiq, useGetBsrCtiqMappings, useUpdateBsrCtiqMappings } from '../../features/bsr-ctiq-mapping/hooks/useBsrCtiqMappingQueries';
import type { BsrCtiqMappingResponse, BsrCtiqMappingUpdateItem, BsrGroupComboItem } from '../../features/bsr-ctiq-mapping/types';
import { bsrGroupApi } from '../../features/bsr-group/api/bsrGroupApi';
import BsrGroupFormDrawer from '../../features/bsr-group/components/BsrGroupFormDrawer';
import { useDeleteBsrGroup, useGetBsrGroupTenants, useGetBsrGroups, useUpdateBsrGroup } from '../../features/bsr-group/hooks/useBsrGroupQueries';
import type { BsrGroupResponse, BsrGroupTenantStat, BsrGroupUpdateRequest } from '../../features/bsr-group/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: '번호자원관리', path: '/ipron/bsr-ctiq-mapping' },
  { title: '라우팅 설정', path: '/ipron/bsr-ctiq-mapping' },
  { title: 'BSR 그룹별 CTI큐 배정', path: '/ipron/bsr-ctiq-mapping' },
];

// #D1FDFD 셀 스타일 (인라인 편집 컬럼)
const editableCellStyle = { backgroundColor: '#D1FDFD' };

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
//  Compact pill
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

export default function BsrCtiqMappingList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const gridRef = useRef<AgGridReactType<BsrCtiqMappingResponse>>(null);
  const cardScrollRef = useRef<HTMLDivElement>(null);

  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // ─── State ─────────────────────────────────────────────────────────────────
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(ctxTenantId);
  const [cardExpanded, setCardExpanded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<BsrGroupResponse | null>(null);

  // 그룹 편집 Drawer
  const [groupDrawerOpen, setGroupDrawerOpen] = useState(false);
  const [groupDrawerData, setGroupDrawerData] = useState<BsrGroupResponse | null>(null);

  // 배정 Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [searchResult, setSearchResult] = useState<BsrCtiqMappingResponse[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [bsrGroupCombos, setBsrGroupCombos] = useState<BsrGroupComboItem[]>([]);

  // 인라인 편집 변경사항 추적
  const pendingEdits = useRef<Map<number, BsrCtiqMappingUpdateItem>>(new Map());
  const [hasPendingEdits, setHasPendingEdits] = useState(false);

  useEffect(() => {
    if (ctxTenantId != null && selectedTenantId === null) setSelectedTenantId(ctxTenantId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxTenantId]);

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: tenantStats = [] } = useGetBsrGroupTenants();
  const { data: groups = [], isLoading: isGroupsLoading } = useGetBsrGroups({
    params: selectedTenantId !== null ? { tenantId: selectedTenantId } : undefined,
  });
  const { data: ctiqMappings = [], isLoading: isMappingsLoading, refetch: refetchMappings } = useGetBsrCtiqMappings(selectedGroup?.bsrGroupId ?? null, selectedTenantId);

  // ─── Derived ──────────────────────────────────────────────────────────────
  const totalGroupCount = useMemo(() => tenantStats.reduce((s: number, t: BsrGroupTenantStat) => s + (t.bsrGroupCount ?? 0), 0), [tenantStats]);

  const filteredMappings = useMemo(() => {
    const kw = searchText.trim().toLowerCase();
    if (!kw) return ctiqMappings;
    return ctiqMappings.filter((m) => [m.ctiqName, m.gdnName, m.gdnNo, m.treeName, m.bsrGroupName].some((f) => f && String(f).toLowerCase().includes(kw)));
  }, [ctiqMappings, searchText]);

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const { mutate: updateGroup, isPending: isUpdatingGroup } = useUpdateBsrGroup({
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
        pendingEdits.current.clear();
        setHasPendingEdits(false);
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '삭제 실패')),
    },
  });
  const { mutate: updateMappings, isPending: isSaving } = useUpdateBsrCtiqMappings({
    mutationOptions: {
      onSuccess: () => {
        toast.success('저장되었습니다');
        pendingEdits.current.clear();
        setHasPendingEdits(false);
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '저장 실패')),
    },
  });
  const { mutate: assignCtiq, isPending: isAssigning } = useAssignBsrCtiq({
    mutationOptions: {
      onSuccess: () => {
        toast.success('CTI큐 배정이 완료되었습니다');
        setAssignModalOpen(false);
        setSearchResult([]);
        void refetchMappings();
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '배정 실패')),
    },
  });

  // ─── 배정 콤보 로드 ─────────────────────────────────────────────────────────
  const loadBsrCombos = useCallback(async () => {
    if (!selectedTenantId) return;
    try {
      const items = await bsrGroupApi.getCombo(selectedTenantId);
      setBsrGroupCombos(items);
    } catch {
      setBsrGroupCombos([]);
    }
  }, [selectedTenantId]);

  // ─── 인라인 편집 컬럼 ──────────────────────────────────────────────────────
  const colDefs: ColDef<BsrCtiqMappingResponse>[] = useMemo(
    () => [
      { field: 'tenantName', headerName: '테넌트명', width: 120 },
      { field: 'bsrGroupName', headerName: 'BSR 그룹명', width: 140 },
      { field: 'ctiqName', headerName: 'CTI큐명', flex: 1 },
      { field: 'gdnNo', headerName: '그룹DN 번호', width: 120 },
      { field: 'gdnName', headerName: '그룹DN 명', width: 130 },
      {
        field: 'treeName',
        headerName: '업무그룹명',
        width: 130,
        valueFormatter: ({ value }) => (value ? String(value) : '미배정'),
      },
      {
        field: 'bsrWeight',
        headerName: 'BSR 가중치',
        width: 110,
        editable: true,
        cellStyle: editableCellStyle,
        headerTooltip: '클릭하여 인라인 편집 (하늘색 배경, 0~1000)',
      },
      {
        field: 'bsrYn',
        headerName: 'BSR 사용여부',
        width: 115,
        editable: true,
        cellStyle: editableCellStyle,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: [1, 0] },
        valueFormatter: ({ value }) => (value === 1 ? '설정' : value === 0 ? '해제' : '-'),
        headerTooltip: '클릭하여 인라인 편집',
      },
      {
        field: 'bsrDistributeYn',
        headerName: 'BSR 분배여부',
        width: 120,
        editable: true,
        cellStyle: editableCellStyle,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: [1, 0] },
        valueFormatter: ({ value }) => (value === 1 ? '설정' : value === 0 ? '해제' : '-'),
        headerTooltip: '클릭하여 인라인 편집',
      },
    ],
    [],
  );

  const handleCellEditingStopped = useCallback((e: CellEditingStoppedEvent<BsrCtiqMappingResponse>) => {
    if (!e.data || e.oldValue === e.newValue) return;
    const ctiqId = e.data.ctiqId;
    const existing = pendingEdits.current.get(ctiqId) ?? { ctiqId };
    (existing as unknown as Record<string, unknown>)[e.colDef.field as string] = e.newValue;
    pendingEdits.current.set(ctiqId, existing as BsrCtiqMappingUpdateItem);
    setHasPendingEdits(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!selectedGroup) return;
    const items = Array.from(pendingEdits.current.values());
    if (items.length === 0) {
      toast.info('변경된 내용이 없습니다');
      return;
    }
    updateMappings({ bsrGroupId: selectedGroup.bsrGroupId, body: { items } });
  }, [selectedGroup, updateMappings]);

  // ─── 배정 팝업 ─────────────────────────────────────────────────────────────
  const handleOpenAssignModal = useCallback(async () => {
    await loadBsrCombos();
    setAssignModalOpen(true);
  }, [loadBsrCombos]);

  // NOTE: 이 화면은 통합 BSR 그룹 관리(/ipron/bsr-group-manage)로 대체 예정.
  // searchCtiq 는 더 이상 사용하지 않음 — 배정 기능은 통합 화면에서 제공.
  const handleSearch = useCallback(async (_params: Record<string, unknown>) => {
    void _params;
  }, []);

  const handleAssign = useCallback(
    (targetBsrGroupId: number, ctiqIds: number[]) => {
      assignCtiq({ targetBsrGroupId, ctiqIds });
    },
    [assignCtiq],
  );

  // 그룹 삭제
  const handleGroupDelete = useCallback(
    (group: BsrGroupResponse) => {
      modal.confirm.execute({
        onOk: () => deleteGroup(group.bsrGroupId),
        options: { title: 'BSR 그룹 삭제', content: `[${group.bsrGroupName}]을(를) 삭제하시겠습니까?` },
      });
    },
    [modal, deleteGroup],
  );

  // 테넌트 변경 시 그룹 선택 초기화
  const handleTenantSelect = useCallback((tenantId: number | null) => {
    setSelectedTenantId(tenantId);
    setSelectedGroup(null);
    pendingEdits.current.clear();
    setHasPendingEdits(false);
  }, []);

  // 그룹 chip 클릭
  const handleGroupSelect = useCallback((group: BsrGroupResponse) => {
    setSelectedGroup(group);
    pendingEdits.current.clear();
    setHasPendingEdits(false);
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* 박스1: 헤더 */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px]">
          <span className="text-sm font-semibold text-gray-700">BSR 그룹별 CTI큐 배정</span>
          {selectedTenantId !== null && (
            <span className="ml-3 text-xs text-gray-500">
              테넌트:{' '}
              <span className="font-medium text-gray-700">
                {tenantStats.find((t: BsrGroupTenantStat) => t.tenantId === selectedTenantId)?.tenantName ?? `#${selectedTenantId}`}
              </span>
            </span>
          )}
          {selectedGroup && (
            <span className="ml-2 text-xs text-gray-500">
              / BSR 그룹: <span className="font-medium text-[#405189]">{selectedGroup.bsrGroupName}</span>
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
                <BsrTenantCard tenantId={null} tenantName="전체" bsrGroupCount={totalGroupCount} selected={selectedTenantId === null} onClick={() => handleTenantSelect(null)} />
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
                        handleTenantSelect(t.tenantId);
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
                <CompactTenantPill name="전체" count={totalGroupCount} selected={selectedTenantId === null} onClick={() => handleTenantSelect(null)} />
                {tenantStats.map((t: BsrGroupTenantStat) => (
                  <CompactTenantPill
                    key={t.tenantId}
                    name={t.tenantName ?? '-'}
                    count={t.bsrGroupCount ?? 0}
                    selected={selectedTenantId === t.tenantId}
                    onClick={() => handleTenantSelect(t.tenantId)}
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

      {/* 박스2b: BSR 그룹 선택 chip 바 */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="px-4 py-2 flex items-center gap-2 min-h-[44px]">
          <span className="text-xs font-semibold text-gray-600 flex-shrink-0">BSR 그룹</span>
          {isGroupsLoading ? (
            <span className="text-xs text-gray-400">로딩 중...</span>
          ) : groups.length === 0 ? (
            <span className="text-xs text-gray-400">{selectedTenantId !== null ? '해당 테넌트에 BSR 그룹이 없습니다' : '테넌트를 선택하세요'}</span>
          ) : (
            <div className="flex gap-2 overflow-x-auto flex-1 items-center py-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {groups.map((g) => (
                <button
                  key={g.bsrGroupId}
                  type="button"
                  onClick={() => handleGroupSelect(g)}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition ${
                    selectedGroup?.bsrGroupId === g.bsrGroupId
                      ? 'border-[#405189] bg-[#405189] text-white shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-[#c5cbe0] hover:text-[#405189]'
                  }`}
                >
                  <span className="font-medium truncate max-w-[160px]">{g.bsrGroupName}</span>
                </button>
              ))}
            </div>
          )}
          {/* 그룹 수정/삭제 버튼 (선택된 그룹이 있을 때) */}
          {selectedGroup && (
            <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
              <Button
                size="small"
                onClick={() => {
                  setGroupDrawerData(selectedGroup);
                  setGroupDrawerOpen(true);
                }}
              >
                수정
              </Button>
              <Button danger size="small" icon={<Trash2 className="size-3" />} onClick={() => handleGroupDelete(selectedGroup)}>
                삭제
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 박스3: CTI큐 매핑 그리드 */}
      <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* 그리드 액션바 */}
        <div className="px-4 h-[44px] border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-semibold text-gray-800">
            {selectedGroup ? `[${selectedGroup.bsrGroupName}] CTI큐 목록 (${filteredMappings.length.toLocaleString()}건)` : 'CTI큐 목록 (BSR 그룹 선택 필요)'}
          </span>
          {hasPendingEdits && <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded ml-1">미저장 변경 있음</span>}
          <div className="ml-auto flex items-center gap-2">
            <Input
              allowClear
              prefix={<Search className="size-3.5 text-gray-400" />}
              placeholder="CTI큐명/GDN번호/업무그룹 검색"
              value={searchText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
              style={{ width: 220 }}
              disabled={!selectedGroup}
            />
            <Button icon={<Plus className="size-3.5" />} onClick={() => void handleOpenAssignModal()} disabled={!selectedGroup}>
              CTI큐 배정
            </Button>
            <Button type="primary" icon={<Save className="size-3.5" />} onClick={handleSave} loading={isSaving} disabled={!hasPendingEdits}>
              저장
            </Button>
          </div>
        </div>

        {/* 인라인 편집 안내 */}
        {selectedGroup && (
          <div className="px-4 py-1.5 border-b border-gray-100 flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
            <span>셀 클릭 시 인라인 편집</span>
            <span className="inline-flex items-center gap-1">
              <span style={{ background: '#D1FDFD', padding: '1px 8px', borderRadius: 3 }}>하늘색 셀</span>= 편집 가능 (BSR 가중치 / 사용여부 / 분배여부)
            </span>
          </div>
        )}

        {/* 그리드 영역 */}
        <div className="flex-1 min-h-0">
          {!selectedGroup ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
              <Empty description={false} imageStyle={{ height: 40 }} />
              <span className="text-sm">BSR 그룹을 선택하면 배정된 CTI큐가 표시됩니다</span>
            </div>
          ) : (
            <AgGridReact<BsrCtiqMappingResponse>
              ref={gridRef}
              {...gridOptions}
              rowData={filteredMappings}
              columnDefs={colDefs}
              loading={isMappingsLoading}
              onCellEditingStopped={handleCellEditingStopped}
              stopEditingWhenCellsLoseFocus
            />
          )}
        </div>
      </div>

      {/* BSR 그룹 수정 Drawer */}
      <BsrGroupFormDrawer
        open={groupDrawerOpen}
        mode="edit"
        group={groupDrawerData}
        defaultTenantId={selectedTenantId}
        onCancel={() => setGroupDrawerOpen(false)}
        onSubmit={(req) => {
          if (groupDrawerData) updateGroup({ id: groupDrawerData.bsrGroupId, body: req as BsrGroupUpdateRequest });
        }}
        loading={isUpdatingGroup}
      />

      {/* CTI큐 배정 기능은 통합 화면(/ipron/bsr-group-manage)으로 이동됨 */}
    </div>
  );
}
