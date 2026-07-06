/**
 * 교환기 업무시간관리 (menuKey=ipron-pbx-worktime).
 *
 * AS-IS: SWAT IPR30S4022 (WORKTIME_TYPE='IE') 를 교환기 전용으로 분리.
 * IE 는 마스터당 슬롯 N개 → 마스터 영역 / 시간대(슬롯) 영역 상하 분리 (레거시 2단 정합).
 *
 * 레이아웃 (테넌트 구조 화면 표준 — cti-code/agent-master 패턴):
 *   박스 1: 헤더 (타이틀 + 선택 테넌트)
 *   박스 2: 테넌트 카드 슬라이더 (BE tenant-stats — TB_CC_TENANTMASTER ACTIVE_YN=1 드라이빙, 접기/펼치기)
 *   박스 3: [상단] 마스터 ag-Grid (검색/등록/삭제, 행 선택 → 하단 로드)
 *   박스 4: [하단] 시간대 ag-Grid (선택 마스터 기준, 추가/삭제)
 *
 * 테넌트 파라미터: 조회는 BE @Filter(JWT) 자동 격리 → 관리자면 전체 행 수신, FE 에서
 * 선택 테넌트로 필터. 등록/수정은 request body 의 tenantId 로 테넌트별 저장.
 */
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Empty, Input } from 'antd';
import { ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, Plus, Search, Trash2 } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import IeWorktimeMasterDrawer from '../../features/ie-worktime/components/IeWorktimeMasterDrawer';
import IeWorktimeSlotDrawer from '../../features/ie-worktime/components/IeWorktimeSlotDrawer';
import PbxWorktimeMasterTable from '../../features/ie-worktime/components/PbxWorktimeMasterTable';
import PbxWorktimeSlotTable from '../../features/ie-worktime/components/PbxWorktimeSlotTable';
import PbxWorktimeTenantCard, { type PbxWorktimeTenantCardStats } from '../../features/ie-worktime/components/PbxWorktimeTenantCard';
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

  // ctx 테넌트 (JWT) — 페이지 진입 시 자동 선택
  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(ctxTenantId);
  const [searchText, setSearchText] = useState('');
  const [cardExpanded, setCardExpanded] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState<IeWorktimeMaster | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<IeWorktimeSlot[]>([]);
  const [focusSlotSeq, setFocusSlotSeq] = useState<number | null>(null); // 슬롯 저장 직후 선택/노출할 행
  const [masterDrawer, setMasterDrawer] = useState<{ open: boolean; mode: 'create' | 'edit'; item: IeWorktimeMaster | null }>({ open: false, mode: 'create', item: null });
  const [slotDrawer, setSlotDrawer] = useState<{ open: boolean; mode: 'create' | 'edit'; slot: IeWorktimeSlot | null }>({ open: false, mode: 'create', slot: null });

  // ctx 비동기 로드 시 동기화
  useEffect(() => {
    if (ctxTenantId != null && selectedTenantId === null) {
      setSelectedTenantId(ctxTenantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxTenantId]);

  const { data: list = [], isLoading } = useGetIeWorktimes();
  const { data: slots = [], isLoading: slotsLoading } = useGetIeWorktimeSlots(selectedMaster?.worktimeId);
  const { data: tenantStats = [] } = useGetIeWorktimeTenantStats();

  const invalidateList = () => {
    void queryClient.invalidateQueries({ queryKey: ieWorktimeQueryKeys.getList._def });
    void queryClient.invalidateQueries({ queryKey: ieWorktimeQueryKeys.getTenantStats.queryKey });
  };
  const invalidateSlots = (id: number) => queryClient.invalidateQueries({ queryKey: ieWorktimeQueryKeys.getSlots(id).queryKey });

  // ─── 테넌트 카드: BE tenant-stats (TB_CC_TENANTMASTER ACTIVE_YN=1 드라이빙 — ADN 패턴) ───
  const tenantCards = useMemo(
    () =>
      tenantStats.map((t) => ({
        tenantId: t.tenantId,
        tenantName: t.tenantName ?? `#${t.tenantId}`,
        stats: { worktimeCnt: t.worktimeCnt, slotCnt: t.slotCnt } satisfies PbxWorktimeTenantCardStats,
      })),
    [tenantStats],
  );

  const selectedTenantName = selectedTenantId == null ? null : (tenantCards.find((t) => t.tenantId === selectedTenantId)?.tenantName ?? `#${selectedTenantId}`);

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

  // ─── 마스터 handlers ───
  const handleCreateMaster = () => {
    if (selectedTenantId == null) {
      toast.warning('테넌트를 먼저 선택하세요');
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
      {/* ===== 박스 1: 헤더 ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px]">
          <span className="text-sm font-semibold text-gray-700">업무시간관리</span>
          {selectedTenantName && (
            <span className="ml-3 text-xs text-gray-500">
              테넌트: <span className="font-medium text-gray-700">{selectedTenantName}</span>
            </span>
          )}
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
                {tenantCards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 min-h-[100px]">
                    <Empty description={false} imageStyle={{ height: 40 }} />
                    <span className="text-sm">조회 가능한 테넌트가 없습니다</span>
                  </div>
                ) : (
                  tenantCards.map((t) => (
                    <PbxWorktimeTenantCard
                      key={t.tenantId}
                      tenantName={t.tenantName}
                      stats={t.stats}
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
                {tenantCards.map((t) => (
                  <CompactTenantPill
                    key={t.tenantId}
                    name={t.tenantName}
                    count={t.stats.worktimeCnt}
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

      {/* ===== 박스 3: [상단] 마스터 그리드 ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-[3] flex flex-col min-h-0">
        <div className="flex items-center px-4 h-[56px] border-b border-gray-100 gap-2">
          <span className="text-sm font-semibold text-gray-700">업무시간</span>
          <span className="text-xs text-gray-500">{filtered.length.toLocaleString()}건</span>
          <div className="ml-auto flex items-center gap-2">
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
        <div className="flex-1 min-h-0">
          {filtered.length === 0 && !isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Empty description={searchText.trim() ? '검색 결과가 없습니다' : '등록된 업무시간이 없습니다'} />
            </div>
          ) : (
            <PbxWorktimeMasterTable
              rowData={filtered}
              isLoading={isLoading}
              focusId={selectedMaster?.worktimeId ?? null}
              onRowDoubleClicked={handleEditMaster}
              onSelectionChanged={(rows) => {
                const next = rows[0] ?? null;
                setSelectedMaster(next);
                setSelectedSlots([]);
                if (next?.worktimeId !== selectedMaster?.worktimeId) setFocusSlotSeq(null);
              }}
            />
          )}
        </div>
      </div>

      {/* ===== 박스 4: [하단] 시간대(슬롯) 그리드 ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-[2] flex flex-col min-h-0">
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
      title={`${name} · ${count.toLocaleString()}건`}
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
