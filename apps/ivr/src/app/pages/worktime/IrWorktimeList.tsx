/**
 * IVR 업무시간관리 (menuKey=ivr-worktime).
 *
 * AS-IS: SWAT IPR30S4022 (WORKTIME_TYPE='IR') 를 IVR 전용으로 분리.
 * IR 은 마스터당 슬롯 1개 → 마스터+슬롯을 flatten 한 단일 그리드 + 단일 폼 Drawer.
 *
 * 레이아웃 (테넌트 구조 화면 표준 — cti-code/agent-master 패턴):
 *   박스 1: 헤더 (타이틀 + 선택 테넌트)
 *   박스 2: 테넌트 카드 슬라이더 (BE tenant-stats — TB_CC_TENANTMASTER ACTIVE_YN=1 드라이빙, 접기/펼치기)
 *   박스 3: 검색/등록/삭제 액션바 + ag-Grid (균일 행)
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
import WorktimeDrawer from '../../features/worktime/components/IrWorktimeDrawer';
import WorktimeTable from '../../features/worktime/components/WorktimeTable';
import WorktimeTenantCard, { type WorktimeTenantCardStats } from '../../features/worktime/components/WorktimeTenantCard';
import {
  irWorktimeQueryKeys,
  useCreateIrWorktime,
  useDeleteIrWorktime,
  useGetIrWorktimeTenantStats,
  useGetIrWorktimes,
  useUpdateIrWorktime,
} from '../../features/worktime/hooks/useIrWorktimeQueries';
import type { IrWorktime, IrWorktimeRequest } from '../../features/worktime/types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '시간 관리' }, { title: 'IVR 업무시간관리', path: '/ivr/worktime' }];

function extractMsg(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

export default function IrWorktimeList() {
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
  const [selectedRows, setSelectedRows] = useState<IrWorktime[]>([]);
  const [focusId, setFocusId] = useState<number | null>(null); // 저장 직후 선택/노출할 행
  const [drawer, setDrawer] = useState<{ open: boolean; mode: 'create' | 'edit'; item: IrWorktime | null }>({ open: false, mode: 'create', item: null });

  // ctx 비동기 로드 시 동기화
  useEffect(() => {
    if (ctxTenantId != null && selectedTenantId === null) {
      setSelectedTenantId(ctxTenantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxTenantId]);

  const { data: list = [], isLoading } = useGetIrWorktimes();
  const { data: tenantStats = [] } = useGetIrWorktimeTenantStats();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: irWorktimeQueryKeys.getList._def });
    void queryClient.invalidateQueries({ queryKey: irWorktimeQueryKeys.getTenantStats.queryKey });
  };

  // ─── 테넌트 카드: BE tenant-stats (TB_CC_TENANTMASTER ACTIVE_YN=1 드라이빙 — ADN 패턴) ───
  const tenantCards = useMemo(
    () =>
      tenantStats.map((t) => ({
        tenantId: t.tenantId,
        tenantName: t.tenantName ?? `#${t.tenantId}`,
        stats: { worktimeCnt: t.worktimeCnt, useCnt: t.useCnt } satisfies WorktimeTenantCardStats,
      })),
    [tenantStats],
  );

  const selectedTenantName = selectedTenantId == null ? null : (tenantCards.find((t) => t.tenantId === selectedTenantId)?.tenantName ?? `#${selectedTenantId}`);

  // ─── 그리드 행: 선택 테넌트 + 검색 필터 ───
  const filtered = useMemo(() => {
    const kw = searchText.trim().toLowerCase();
    return list
      .filter((r) => selectedTenantId == null || r.tenantId === selectedTenantId)
      .filter((r) => !kw || r.worktimeName?.toLowerCase().includes(kw) || r.groupKey?.toLowerCase().includes(kw));
  }, [list, selectedTenantId, searchText]);

  // ─── mutations ───
  const { mutate: createIr, isPending: creating } = useCreateIrWorktime({
    mutationOptions: {
      onSuccess: (data: unknown) => {
        toast.success('업무시간이 등록되었습니다');
        setDrawer((p) => ({ ...p, open: false }));
        const saved = data as IrWorktime;
        if (saved?.worktimeId != null) setFocusId(saved.worktimeId); // refetch 후 저장된 행 선택/노출
        invalidate();
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '등록 실패')),
    },
  });
  const { mutate: updateIr, isPending: updating } = useUpdateIrWorktime({
    mutationOptions: {
      onSuccess: (data: unknown) => {
        toast.success('업무시간이 수정되었습니다');
        setDrawer((p) => ({ ...p, open: false }));
        const saved = data as IrWorktime;
        if (saved?.worktimeId != null) setFocusId(saved.worktimeId);
        invalidate();
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '수정 실패')),
    },
  });
  const { mutateAsync: deleteIrAsync, isPending: deleting } = useDeleteIrWorktime();

  // ─── handlers ───
  const handleCreate = () => {
    if (selectedTenantId == null) {
      toast.warning('테넌트를 먼저 선택하세요');
      return;
    }
    setDrawer({ open: true, mode: 'create', item: null });
  };
  const handleEdit = (item: IrWorktime) => setDrawer({ open: true, mode: 'edit', item });
  const handleBulkDelete = () => {
    if (selectedRows.length === 0) return;
    modal.confirm.delete({
      onOk: async () => {
        try {
          await Promise.all(selectedRows.map((r) => deleteIrAsync({ id: r.worktimeId })));
          toast.success(`${selectedRows.length}건이 삭제되었습니다`);
          setSelectedRows([]);
          setFocusId(null);
        } catch (e) {
          toast.error(extractMsg(e, '삭제 실패'));
        } finally {
          invalidate();
        }
      },
      options: { title: '업무시간 삭제', content: `선택한 ${selectedRows.length}건의 업무시간을 삭제하시겠습니까?` },
    });
  };
  const handleSubmit = (req: IrWorktimeRequest) => {
    if (drawer.mode === 'create') createIr(req);
    else if (drawer.item) updateIr({ id: drawer.item.worktimeId, body: req });
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
                    <Empty description={false} styles={{ image: { height: 40 } }} />
                    <span className="text-sm">조회 가능한 테넌트가 없습니다</span>
                  </div>
                ) : (
                  tenantCards.map((t) => (
                    <WorktimeTenantCard
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

      {/* ===== 박스 3: 액션바 + ag-Grid ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="flex items-center px-4 h-[56px] border-b border-gray-100 gap-2">
          <span className="text-xs text-gray-500">
            {filtered.length.toLocaleString()}건{selectedRows.length > 0 && ` 중 ${selectedRows.length}건 선택`}
          </span>
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
              onClick={handleBulkDelete}
              loading={deleting}
              disabled={selectedRows.length === 0}
              title={selectedRows.length === 0 ? '삭제할 업무시간을 선택하세요' : '선택한 업무시간 삭제'}
            >
              삭제
            </Button>
            <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
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
            <WorktimeTable rowData={filtered} isLoading={isLoading} focusId={focusId} onRowDoubleClicked={handleEdit} onSelectionChanged={setSelectedRows} />
          )}
        </div>
      </div>

      <WorktimeDrawer
        open={drawer.open}
        mode={drawer.mode}
        item={drawer.item}
        tenantId={selectedTenantId}
        tenantName={selectedTenantName}
        onCancel={() => setDrawer((p) => ({ ...p, open: false }))}
        onSubmit={handleSubmit}
        loading={creating || updating}
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
