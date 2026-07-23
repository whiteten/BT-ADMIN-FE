/**
 * 교환기 업무시간관리 (menuKey=ipron-pbx-worktime).
 *
 * AS-IS: SWAT IPR30S4022 (WORKTIME_TYPE='IE') 를 교환기 전용으로 분리.
 * IE 는 마스터당 슬롯 N개 → 마스터 영역 / 시간대(슬롯) 영역 상하 분리 (레거시 2단 정합).
 *
 * 레이아웃 (멀티테넌트 개편 — cti-code/dod-trans 패턴):
 *   박스 1: 헤더 (타이틀 + 운영자 대행 테넌트 ScopeSelect(공통) / 일반=선택 테넌트명)
 *   박스 2: [상단] 마스터 목록 — 카드형/리스트형 토글(ViewModeToggle, localStorage 유지)
 *   박스 3: [하단] 시간대 ag-Grid (선택 마스터 기준, 추가/삭제)
 *
 * 테넌트 스코프: 일반 콘솔은 토큰=활성 테넌트. 운영자 모드는 헤더 ScopeSelect 로 대행 테넌트 선택
 * (null=전체). 조회는 BE @Filter(JWT) 자동 격리 → FE 에서 선택 테넌트로 필터, 등록은 request
 * body 의 tenantId 로 테넌트별 저장.
 */
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Empty, Input } from 'antd';
import { ChevronLeft, ChevronRight, Plus, Search, Trash2 } from 'lucide-react';
import { VIEW_MODE, useAuthStore, useBreadcrumbStore, useOperatorScopeStore, useViewMode } from '@/shared-store';
import { toast } from '@/shared-util';
import IeWorktimeMasterDrawer from '../../features/ie-worktime/components/IeWorktimeMasterDrawer';
import IeWorktimeSlotDrawer from '../../features/ie-worktime/components/IeWorktimeSlotDrawer';
import PbxWorktimeMasterTable from '../../features/ie-worktime/components/PbxWorktimeMasterTable';
import PbxWorktimeSlotTable from '../../features/ie-worktime/components/PbxWorktimeSlotTable';
import {
  ieWorktimeQueryKeys,
  useCreateIeWorktime,
  useCreateIeWorktimeSlot,
  useDeleteIeWorktime,
  useDeleteIeWorktimeSlot,
  useGetIeWorktimeSlots,
  useGetIeWorktimeTenantStats,
  useGetIeWorktimes,
  useUpdateIeWorktime,
  useUpdateIeWorktimeSlot,
} from '../../features/ie-worktime/hooks/useIeWorktimeQueries';
import type { IeWorktimeMaster, IeWorktimeMasterRequest, IeWorktimeSlot, IeWorktimeSlotRequest } from '../../features/ie-worktime/types';
import ScopeSelect from '@/components/custom/ScopeSelect';
import ViewModeToggle from '@/components/custom/ViewModeToggle';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '시간 관리' }, { title: '교환기 업무시간관리', path: '/ipron/pbx-worktime' }];

function extractMsg(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

export default function IeWorktimeList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const modal = useModal();
  const queryClient = useQueryClient();
  const cardScrollRef = useRef<HTMLDivElement>(null);

  // ctx 테넌트 (JWT — 사용자 본인 테넌트)
  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // 운영자 모드(통합운영) — 시스템 관리자가 헤더 TenantChip 에서 진입.
  //  - 전체(actAsTenantId=null): tenantId 미전달 → 전체 테넌트 조회
  //  - 대행(actAsTenantId=X): X 테넌트 스코프 조회 + X 대행 CUD
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const actAsTenantId = useOperatorScopeStore((s) => s.actAsTenantId);
  const setActAsTenant = useOperatorScopeStore((s) => s.setActAsTenant);
  const opTenantId = actAsTenantId ? Number(actAsTenantId) : null;
  // 조회/등록 스코프: 일반=활성테넌트 / 운영자=대행테넌트(null=전체).
  const selectedTenantId = operatorMode ? opTenantId : ctxTenantId;

  // 마스터 목록 표기방식(카드형/리스트형) — localStorage 유지. 화면키는 교환기 업무시간 전용.
  const [viewMode, setViewMode] = useViewMode('ipron-worktime');
  const [searchText, setSearchText] = useState('');
  const [selectedMaster, setSelectedMaster] = useState<IeWorktimeMaster | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<IeWorktimeSlot[]>([]);
  const [focusSlotSeq, setFocusSlotSeq] = useState<number | null>(null); // 슬롯 저장 직후 선택/노출할 행
  const [masterDrawer, setMasterDrawer] = useState<{ open: boolean; mode: 'create' | 'edit'; item: IeWorktimeMaster | null }>({ open: false, mode: 'create', item: null });
  const [slotDrawer, setSlotDrawer] = useState<{ open: boolean; mode: 'create' | 'edit'; slot: IeWorktimeSlot | null }>({ open: false, mode: 'create', slot: null });

  const { data: list = [], isLoading } = useGetIeWorktimes();
  const { data: slots = [], isLoading: slotsLoading } = useGetIeWorktimeSlots(selectedMaster?.worktimeId);
  const { data: tenantStats = [] } = useGetIeWorktimeTenantStats();

  const invalidateList = () => {
    void queryClient.invalidateQueries({ queryKey: ieWorktimeQueryKeys.getList._def });
    void queryClient.invalidateQueries({ queryKey: ieWorktimeQueryKeys.getTenantStats.queryKey });
  };
  const invalidateSlots = (id: number) => queryClient.invalidateQueries({ queryKey: ieWorktimeQueryKeys.getSlots(id).queryKey });

  const selectedTenantName = selectedTenantId == null ? null : (tenantStats.find((t) => t.tenantId === selectedTenantId)?.tenantName ?? `#${selectedTenantId}`);

  // ─── 마스터 행: 선택 테넌트 + 검색 필터 ───
  const filtered = useMemo(() => {
    const kw = searchText.trim().toLowerCase();
    return list
      .filter((r) => selectedTenantId == null || r.tenantId === selectedTenantId)
      .filter((r) => !kw || r.worktimeName?.toLowerCase().includes(kw) || r.groupKey?.toLowerCase().includes(kw));
  }, [list, selectedTenantId, searchText]);

  // 테넌트 전환/검색으로 선택 마스터가 목록에서 사라지면 선택 해제
  useEffect(() => {
    if (selectedMaster && !filtered.some((m) => m.worktimeId === selectedMaster.worktimeId)) {
      setSelectedMaster(null);
      setSelectedSlots([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  // ─── 마스터 mutations ───
  const { mutate: createMaster, isPending: creating } = useCreateIeWorktime({
    mutationOptions: {
      onSuccess: (data: unknown) => {
        toast.success('업무시간이 등록되었습니다');
        setMasterDrawer((p) => ({ ...p, open: false }));
        const saved = data as IeWorktimeMaster;
        if (saved?.worktimeId != null) setSelectedMaster(saved); // refetch 후 그리드에서 재선택/노출
        invalidateList();
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '등록 실패')),
    },
  });
  const { mutate: updateMaster, isPending: updating } = useUpdateIeWorktime({
    mutationOptions: {
      onSuccess: (data: unknown) => {
        toast.success('업무시간이 수정되었습니다');
        setMasterDrawer((p) => ({ ...p, open: false }));
        const saved = data as IeWorktimeMaster;
        if (saved?.worktimeId != null) setSelectedMaster(saved);
        invalidateList();
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '수정 실패')),
    },
  });
  const { mutate: deleteMaster } = useDeleteIeWorktime({
    mutationOptions: {
      onSuccess: () => {
        toast.success('업무시간이 삭제되었습니다');
        setSelectedMaster(null);
        invalidateList();
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '삭제 실패')),
    },
  });

  // ─── 슬롯 mutations ───
  const slotMutationOptions = (successMsg: string, failMsg: string) => ({
    onSuccess: (data: unknown) => {
      toast.success(successMsg);
      setSlotDrawer((p) => ({ ...p, open: false }));
      const saved = data as IeWorktimeSlot;
      if (saved?.listSeq != null) setFocusSlotSeq(saved.listSeq); // refetch 후 저장된 슬롯 선택/노출
      if (selectedMaster) invalidateSlots(selectedMaster.worktimeId);
      invalidateList(); // slotCount 갱신
    },
    onError: (e: unknown) => toast.error(extractMsg(e, failMsg)),
  });
  const { mutate: createSlot, isPending: slotCreating } = useCreateIeWorktimeSlot({ mutationOptions: slotMutationOptions('시간대가 추가되었습니다', '추가 실패') });
  const { mutate: updateSlot, isPending: slotUpdating } = useUpdateIeWorktimeSlot({ mutationOptions: slotMutationOptions('시간대가 수정되었습니다', '수정 실패') });
  const { mutateAsync: deleteSlotAsync, isPending: slotDeleting } = useDeleteIeWorktimeSlot();

  // ─── 마스터 선택 (카드 클릭 / 그리드 선택 공통) ───
  const handleSelectMaster = (next: IeWorktimeMaster | null) => {
    setSelectedMaster(next);
    setSelectedSlots([]);
    if (next?.worktimeId !== selectedMaster?.worktimeId) setFocusSlotSeq(null);
  };

  // ─── 마스터 handlers ───
  const handleCreateMaster = () => {
    if (selectedTenantId == null) {
      toast.warning(operatorMode ? '대행할 테넌트를 먼저 선택하세요' : '테넌트를 먼저 선택하세요');
      return;
    }
    setMasterDrawer({ open: true, mode: 'create', item: null });
  };
  const handleEditMaster = (item: IeWorktimeMaster) => setMasterDrawer({ open: true, mode: 'edit', item });
  const handleDeleteMaster = () => {
    if (!selectedMaster) return;
    if (selectedMaster.slotCount > 0) {
      modal.show.info(`하위 시간대 ${selectedMaster.slotCount}개를 먼저 삭제하세요.`, '삭제 불가');
      return;
    }
    modal.confirm.delete({
      onOk: () => deleteMaster({ id: selectedMaster.worktimeId }),
      options: { title: '업무시간 삭제', content: `"${selectedMaster.worktimeName}" 업무시간을 삭제하시겠습니까?` },
    });
  };
  const handleSubmitMaster = (req: IeWorktimeMasterRequest) => {
    if (masterDrawer.mode === 'create') createMaster(req);
    else if (masterDrawer.item) updateMaster({ id: masterDrawer.item.worktimeId, body: req });
  };

  // ─── 슬롯 handlers ───
  const handleAddSlot = () => {
    if (!selectedMaster) {
      toast.warning('업무시간을 먼저 선택하세요');
      return;
    }
    setSlotDrawer({ open: true, mode: 'create', slot: null });
  };
  const handleEditSlot = (slot: IeWorktimeSlot) => setSlotDrawer({ open: true, mode: 'edit', slot });
  const handleDeleteSlots = () => {
    if (!selectedMaster || selectedSlots.length === 0) return;
    const masterId = selectedMaster.worktimeId;
    modal.confirm.delete({
      onOk: async () => {
        try {
          await Promise.all(selectedSlots.map((s) => deleteSlotAsync({ id: masterId, listSeq: s.listSeq })));
          toast.success(`시간대 ${selectedSlots.length}건이 삭제되었습니다`);
          setSelectedSlots([]);
          setFocusSlotSeq(null);
        } catch (e) {
          toast.error(extractMsg(e, '삭제 실패'));
        } finally {
          invalidateSlots(masterId);
          invalidateList();
        }
      },
      options: { title: '시간대 삭제', content: `선택한 ${selectedSlots.length}건의 시간대를 삭제하시겠습니까?` },
    });
  };
  const handleSubmitSlot = (req: IeWorktimeSlotRequest) => {
    if (!selectedMaster) return;
    if (slotDrawer.mode === 'create') createSlot({ id: selectedMaster.worktimeId, body: req });
    else if (slotDrawer.slot) updateSlot({ id: selectedMaster.worktimeId, listSeq: slotDrawer.slot.listSeq, body: req });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 박스 1: 헤더 (스코프 선택 + 타이틀) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px] gap-3">
          <span className="text-sm font-semibold text-gray-700">업무시간관리</span>
          {/* 운영자 모드: 대행 테넌트 선택(공통 ScopeSelect). 일반 콘솔은 선택 테넌트명 표기. */}
          {operatorMode ? (
            <ScopeSelect
              kind="tenant"
              options={tenantStats.map((t) => ({ id: t.tenantId, name: t.tenantName ?? `테넌트 ${t.tenantId}`, count: t.worktimeCnt }))}
              value={actAsTenantId}
              onChange={(id) => {
                setActAsTenant(id);
                handleSelectMaster(null);
              }}
            />
          ) : (
            selectedTenantName && (
              <span className="text-xs text-gray-500">
                테넌트: <span className="font-medium text-gray-700">{selectedTenantName}</span>
              </span>
            )
          )}
        </div>
      </div>

      {/* ===== 박스 2: [상단] 마스터 목록 (카드형 / 리스트형 토글) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0 flex flex-col">
        <div className="flex items-center px-4 h-[56px] border-b border-gray-100 gap-2">
          <span className="text-sm font-semibold text-gray-700">업무시간</span>
          <span className="text-xs text-gray-500">{filtered.length.toLocaleString()}건</span>
          <div className="ml-auto flex items-center gap-2">
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
            <Input
              allowClear
              prefix={<Search className="size-3.5 text-gray-400" />}
              placeholder="업무시간명·KEY 검색"
              value={searchText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
              style={{ width: 220 }}
            />
            <Button
              danger
              icon={<Trash2 className="size-3.5" />}
              onClick={handleDeleteMaster}
              disabled={!selectedMaster}
              title={!selectedMaster ? '삭제할 업무시간을 선택하세요' : '선택한 업무시간 삭제'}
            >
              삭제
            </Button>
            <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreateMaster}>
              등록
            </Button>
          </div>
        </div>

        {/* 목록 본문 — 카드형은 가로 슬라이더, 리스트형은 ag-Grid */}
        <div className={`flex items-center px-4 py-3 ${viewMode === VIEW_MODE.CARD ? 'h-[170px]' : 'h-[260px]'}`}>
          {filtered.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-2">
              <Empty description={false} styles={{ image: { height: 40 } }} />
              <span className="text-sm">{searchText.trim() ? '검색 결과가 없습니다' : '등록된 업무시간이 없습니다'}</span>
            </div>
          ) : viewMode === VIEW_MODE.LIST ? (
            <div className="w-full h-full">
              <PbxWorktimeMasterTable
                rowData={filtered}
                isLoading={isLoading}
                focusId={selectedMaster?.worktimeId ?? null}
                onRowDoubleClicked={handleEditMaster}
                onSelectionChanged={(rows) => handleSelectMaster(rows[0] ?? null)}
              />
            </div>
          ) : (
            <div className="relative flex items-center gap-2 w-full">
              <Button
                type="text"
                icon={<ChevronLeft className="size-5" />}
                onClick={() => cardScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                className="!flex-shrink-0 !w-8 !h-8 !p-0"
              />
              <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto py-2 px-1 flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {filtered.map((master) => {
                  const isCardSelected = selectedMaster?.worktimeId === master.worktimeId;
                  return (
                    <div
                      key={master.worktimeId}
                      className={`bg-white border rounded-lg p-3 cursor-pointer transition-all w-[200px] h-[130px] flex-shrink-0 flex flex-col ${
                        isCardSelected
                          ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                          : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                      }`}
                      onClick={(e) => {
                        handleSelectMaster(master);
                        (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                      }}
                      onDoubleClick={() => handleEditMaster(master)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-semibold truncate ${isCardSelected ? 'text-[#405189]' : 'text-gray-800'}`} title={master.worktimeName}>
                          {master.worktimeName}
                        </span>
                      </div>
                      <div className="flex-1 text-xs text-gray-500 space-y-0.5">
                        {master.groupKey && <div className="truncate">KEY: {master.groupKey}</div>}
                        {master.worktimeDesc && <div className="truncate">{master.worktimeDesc}</div>}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-auto">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                            master.slotCount > 0 ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-gray-500 bg-gray-50 border-gray-200'
                          }`}
                        >
                          {master.slotCount > 0 ? `시간대 ${master.slotCount}건` : '시간대 없음'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button
                type="text"
                icon={<ChevronRight className="size-5" />}
                onClick={() => cardScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                className="!flex-shrink-0 !w-8 !h-8 !p-0"
              />
            </div>
          )}
        </div>
      </div>

      {/* ===== 박스 3: [하단] 시간대(슬롯) 그리드 ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="flex items-center px-4 h-[56px] border-b border-gray-100 gap-2">
          <span className="text-sm font-semibold text-gray-700">시간대</span>
          {selectedMaster ? (
            <span className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">{selectedMaster.worktimeName}</span> · {slots.length.toLocaleString()}건
              {selectedSlots.length > 0 && ` 중 ${selectedSlots.length}건 선택`}
            </span>
          ) : (
            <span className="text-xs text-gray-400">상단에서 업무시간을 선택하세요</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button
              danger
              icon={<Trash2 className="size-3.5" />}
              onClick={handleDeleteSlots}
              loading={slotDeleting}
              disabled={!selectedMaster || selectedSlots.length === 0}
              title={selectedSlots.length === 0 ? '삭제할 시간대를 선택하세요' : '선택한 시간대 삭제'}
            >
              삭제
            </Button>
            <Button icon={<Plus className="size-3.5" />} onClick={handleAddSlot} disabled={!selectedMaster}>
              시간대 추가
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          {!selectedMaster ? (
            <div className="flex items-center justify-center h-full">
              <Empty description="업무시간을 선택하면 시간대가 표시됩니다" />
            </div>
          ) : slots.length === 0 && !slotsLoading ? (
            <div className="flex items-center justify-center h-full">
              <Empty description="등록된 시간대가 없습니다" />
            </div>
          ) : (
            <PbxWorktimeSlotTable rowData={slots} isLoading={slotsLoading} focusSeq={focusSlotSeq} onRowDoubleClicked={handleEditSlot} onSelectionChanged={setSelectedSlots} />
          )}
        </div>
      </div>

      <IeWorktimeMasterDrawer
        open={masterDrawer.open}
        mode={masterDrawer.mode}
        item={masterDrawer.item}
        tenantId={selectedTenantId}
        tenantName={selectedTenantName}
        onCancel={() => setMasterDrawer((p) => ({ ...p, open: false }))}
        onSubmit={handleSubmitMaster}
        loading={creating || updating}
      />

      <IeWorktimeSlotDrawer
        open={slotDrawer.open}
        mode={slotDrawer.mode}
        slot={slotDrawer.slot}
        onCancel={() => setSlotDrawer((p) => ({ ...p, open: false }))}
        onSubmit={handleSubmitSlot}
        loading={slotCreating || slotUpdating}
      />
    </div>
  );
}
