/**
 * CTI 큐 관리 목록 페이지 (AS-IS SWAT IPR20S3020).
 *
 * 구조:
 *  - 상단: 테넌트별 CTI 큐 현황 카드 슬라이더 (ADN 패턴 동일)
 *  - 하단: ag-Grid CTI 큐 마스터 목록
 *
 * Phase 1 스코프: CTI 큐 마스터 CRUD.
 * Phase 2: BSR/SLT 스케쥴 탭 추가, 호 흐름 시각화 바, 인라인 편집.
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef, GridOptions } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Empty, Input, Tag } from 'antd';
import { Building2, ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, Download, Plus, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import CtiQueueFormDrawer, { type CtiQueueDrawerState } from '../../features/cti-queue/components/CtiQueueFormDrawer';
import { useDeleteCtiQueue, useGetCtiQueueTenants, useGetCtiQueues } from '../../features/cti-queue/hooks/useCtiQueueQueries';
import type { CtiQueueResponse, CtiQueueTenantStat } from '../../features/cti-queue/types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

// ag-Grid — ADN/ADN 패턴 그대로

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '구성관리', path: '/ipron' },
  { title: '그룹DN', path: '/ipron' },
  { title: 'CTI 큐', path: '/ipron/cti-queue' },
];

export default function CtiQueueList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const modal = useModal();
  const cardScrollRef = useRef<HTMLDivElement>(null);

  // ─── State ──────────────────────────────────────────────────────────────
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState<CtiQueueResponse[]>([]);
  const [cardExpanded, setCardExpanded] = useState(true);
  const [drawer, setDrawer] = useState<CtiQueueDrawerState>({ open: false });

  // ─── Queries ────────────────────────────────────────────────────────────
  const { data: queues = [], isLoading } = useGetCtiQueues({});
  const { data: tenantStats = [] } = useGetCtiQueueTenants({});

  // ─── Mutations ──────────────────────────────────────────────────────────
  const { mutate: deleteQueue, isPending: isDeleting } = useDeleteCtiQueue({
    mutationOptions: {
      onSuccess: () => {
        toast.success('CTI 큐가 삭제되었습니다');
        setSelectedRows([]);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '삭제 실패';
        toast.error(msg);
      },
    },
  });

  // ─── Derived ────────────────────────────────────────────────────────────
  // Phase 1: CTIQ_MASTER 에 TENANT_ID 없으므로 tenantId 필터는 후속 PR 에서 적용.
  // 현재는 검색어 필터만 동작.
  const filteredQueues = useMemo(() => {
    const kw = searchText.trim().toLowerCase();
    if (!kw) return queues;
    return queues.filter((q) => {
      const fields: (string | number | null | undefined)[] = [q.ctiqId, q.ctiqName, q.gdnId];
      return fields.some((f) => f != null && String(f).toLowerCase().includes(kw));
    });
  }, [queues, searchText]);

  const totalStats = useMemo(() => {
    let totalCnt = 0;
    let activeCnt = 0;
    for (const t of tenantStats) {
      totalCnt += t.totalCnt;
      activeCnt += t.activeCnt;
    }
    return { totalCnt, activeCnt, blockedCnt: 0 };
  }, [tenantStats]);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleEdit = useCallback((row: CtiQueueResponse) => {
    setDrawer({ open: true, mode: 'edit', row });
  }, []);

  const handleDelete = useCallback(
    (row: CtiQueueResponse) => {
      modal.confirm.execute({
        onOk: () => deleteQueue(row.ctiqId),
        options: {
          title: 'CTI 큐 삭제',
          content: `"${row.ctiqName ?? row.ctiqId}" CTI 큐를 삭제하시겠습니까?`,
        },
      });
    },
    [modal, deleteQueue],
  );

  // ─── Column Defs ────────────────────────────────────────────────────────
  const columnDefs = useMemo<ColDef<CtiQueueResponse>[]>(
    () => [
      { checkboxSelection: true, headerCheckboxSelection: true, width: 40, pinned: 'left', resizable: false },
      { field: 'ctiqId', headerName: 'CTIQ ID', width: 90, filter: 'agTextColumnFilter' },
      { field: 'ctiqName', headerName: 'CTI큐 이름', flex: 1, minWidth: 130, filter: 'agTextColumnFilter' },
      { field: 'gdnId', headerName: '그룹DN ID', width: 110, filter: 'agTextColumnFilter' },
      { field: 'backUpNodeId', headerName: 'DR노드ID', width: 100 },
      {
        field: 'globalDnYn',
        headerName: '글로벌',
        width: 75,
        cellRenderer: ({ value }: { value: number | null }) => (value === 1 ? <Tag color="green">O</Tag> : <Tag color="default">X</Tag>),
      },
      {
        field: 'activateYn',
        headerName: '활성화',
        width: 80,
        cellRenderer: ({ value }: { value: number | null }) => (value === 1 ? <Tag color="green">활성</Tag> : <Tag color="red">비활성</Tag>),
      },
      {
        field: 'maxWaittimeYn',
        headerName: '최대대기',
        width: 80,
        cellRenderer: ({ value }: { value: number | null }) => (value === 1 ? <Tag color="blue">Y</Tag> : <Tag color="default">N</Tag>),
      },
      { field: 'maxWaittime', headerName: '최대대기(s)', width: 100, type: 'numericColumn' },
      { field: 'collectTimeout', headerName: '호회수T/O(s)', width: 105, type: 'numericColumn' },
      { field: 'serviceLevelTime', headerName: 'SL(s)', width: 70, type: 'numericColumn' },
      { field: 'abandonAcktime', headerName: '큐포기(s)', width: 85, type: 'numericColumn' },
      { field: 'sortSeq', headerName: '정렬', width: 65, type: 'numericColumn' },
      {
        headerName: '액션',
        width: 130,
        pinned: 'right',
        resizable: false,
        cellRenderer: ({ data }: { data: CtiQueueResponse }) =>
          data ? (
            <div className="flex gap-1 items-center h-full">
              <Button size="small" onClick={() => handleEdit(data)}>
                수정
              </Button>
              <Button size="small" danger icon={<Trash2 size={11} />} onClick={() => handleDelete(data)} />
            </div>
          ) : null,
      },
    ],
    [handleEdit, handleDelete],
  );

  const gridOptions = useMemo<GridOptions<CtiQueueResponse>>(
    () => ({
      rowSelection: { mode: 'multiRow', checkboxes: true },
      defaultColDef: { resizable: true, sortable: true },
      onRowDoubleClicked: (e) => e.data && handleEdit(e.data),
      onSelectionChanged: (e) => setSelectedRows(e.api.getSelectedRows()),
    }),
    [handleEdit],
  );

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 카드 슬라이더 박스 ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[44px] border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">테넌트별 CTI 큐 현황</span>
          <div className="ml-auto flex items-center gap-2">
            <Input
              allowClear
              prefix={<Search className="size-3.5 text-gray-400" />}
              placeholder="CTI큐 ID / 이름 검색"
              value={searchText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
              style={{ width: 200 }}
            />
            <Button icon={<Download className="size-3.5" />} disabled>
              엑셀
            </Button>
          </div>
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
                {/* 전체 카드 */}
                <CtiQueueTenantCard tenantId={null} tenantName="전체" stats={totalStats} selected={selectedTenantId === null} onClick={() => setSelectedTenantId(null)} />
                {tenantStats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 min-h-[100px]">
                    <Empty description={false} imageStyle={{ height: 40 }} />
                    <span className="text-sm">등록된 CTI 큐가 없습니다</span>
                  </div>
                ) : (
                  tenantStats.map((g) => (
                    <CtiQueueTenantCard
                      key={g.tenantId ?? 'all'}
                      tenantId={g.tenantId}
                      tenantName={g.tenantName ?? '-'}
                      stats={{ totalCnt: g.totalCnt, activeCnt: g.activeCnt, blockedCnt: g.blockedCnt }}
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
                <CompactTenantPill name="전체" count={totalStats.totalCnt} selected={selectedTenantId === null} onClick={() => setSelectedTenantId(null)} />
                {tenantStats.map((g) => (
                  <CompactTenantPill
                    key={g.tenantId ?? 'all'}
                    name={g.tenantName ?? '-'}
                    count={g.totalCnt}
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

      {/* ===== ag-Grid 박스 ===== */}
      <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 h-[44px] flex-shrink-0">
          <span className="text-sm font-semibold text-gray-800">CTI 큐 목록 ({filteredQueues.length.toLocaleString()}건)</span>
          {selectedRows.length > 0 && (
            <span className="text-xs text-gray-500">
              {filteredQueues.length.toLocaleString()}건 중 {selectedRows.length}건 선택
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button
              danger
              icon={<Trash2 className="size-3.5" />}
              onClick={() => {
                if (selectedRows.length === 0) return;
                modal.confirm.execute({
                  onOk: () => {
                    selectedRows.forEach((r) => deleteQueue(r.ctiqId));
                    setSelectedRows([]);
                  },
                  options: { title: 'CTI 큐 일괄 삭제', content: `선택한 ${selectedRows.length}건을 삭제하시겠습니까?` },
                });
              }}
              loading={isDeleting}
              disabled={selectedRows.length === 0}
            >
              {selectedRows.length > 0 ? `삭제 (${selectedRows.length})` : '삭제'}
            </Button>
            <Button type="primary" icon={<Plus className="size-3.5" />} onClick={() => setDrawer({ open: true, mode: 'create' })}>
              CTI큐 등록
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0 ag-theme-quartz">
          <AgGridReact<CtiQueueResponse> rowData={filteredQueues} columnDefs={columnDefs} gridOptions={gridOptions} loading={isLoading} />
        </div>
      </div>

      <CtiQueueFormDrawer state={drawer} onClose={() => setDrawer({ open: false })} />
    </div>
  );
}

// ─── 테넌트 카드 컴포넌트 ────────────────────────────────────────────────────

interface CtiQueueTenantCardStats {
  totalCnt: number;
  activeCnt: number;
  blockedCnt: number;
}

interface CtiQueueTenantCardProps {
  tenantId: number | null;
  tenantName: string;
  stats: CtiQueueTenantCardStats;
  selected: boolean;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function CtiQueueTenantCard({ tenantId, tenantName, stats, selected, onClick }: CtiQueueTenantCardProps) {
  const isAll = tenantId === null;
  const { totalCnt, activeCnt, blockedCnt } = stats;

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
          <span className="text-gray-500">전체 CTI큐</span>
          <span className="font-semibold text-gray-800">{totalCnt.toLocaleString()}건</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">활성화</span>
          <span className="font-medium text-green-600">{activeCnt.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">블럭 설정</span>
          <span className="font-medium text-amber-500">{blockedCnt.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// ─── CompactTenantPill ───────────────────────────────────────────────────────

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
