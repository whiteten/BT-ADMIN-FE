/**
 * COS 설정 목록 페이지
 *
 * 상단: A타입 테넌트 카드슬라이더 (AdnList.tsx 패턴 — compact pill ↔ expanded card 토글)
 * 하단: ag-Grid (COS 목록, 서비스 플래그 설정/해제 배지)
 *
 * Layout:
 * +----------------------------------------------------------+
 * | 박스 1: 헤더 (검색 + 등록 버튼)                            |
 * +----------------------------------------------------------+
 * | 박스 2: 테넌트 카드슬라이더 (A타입, expanded/compact 토글) |
 * +----------------------------------------------------------+
 * | 박스 3: ag-Grid (COS 목록)                                |
 * +----------------------------------------------------------+
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Empty, Input, Modal } from 'antd';
import { Building2, ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, Plus, Search, Trash2 } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { cosQueryKeys, useDeleteCos, useGetCosList, useGetNodeTenants } from '../../features/cos/hooks/useCosQueries';
import type { Cos } from '../../features/cos/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: '번호자원관리', path: '/ipron/cos' },
  { title: 'COS 설정', path: '/ipron/cos' },
];

/** 0/1 서비스 플래그를 설정/해제 배지로 표시 */
const StatusBadgeRenderer = (params: ICellRendererParams) => {
  const value = params.value;
  return value === 1 ? (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#e6f4ff', color: '#1677ff' }}>
      설정
    </span>
  ) : (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#fafafa', color: '#8c8c8c' }}>
      해제
    </span>
  );
};

export default function CosList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const cardScrollRef = useRef<HTMLDivElement>(null);

  // ctx 테넌트 (JWT — 사용자 본인 테넌트) — 페이지 진입 시 자동 선택
  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(ctxTenantId);
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState<Cos[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  // 카드 박스 default 접힘(compact pill). ADnList.tsx 동일 패턴
  const [cardExpanded, setCardExpanded] = useState(false);

  // ctx 비동기 로드 시 동기화
  useEffect(() => {
    if (ctxTenantId != null && selectedTenantId === null) {
      setSelectedTenantId(ctxTenantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxTenantId]);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: nodeTenants = [] } = useGetNodeTenants();

  // 테넌트 목록 (중복 제거)
  const tenants = useMemo(() => {
    const map = new Map<number, string>();
    for (const nt of nodeTenants) {
      if (!map.has(nt.tenantId)) {
        map.set(nt.tenantId, nt.tenantName);
      }
    }
    return Array.from(map.entries())
      .map(([tenantId, tenantName]) => ({ tenantId, tenantName }))
      .sort((a, b) => a.tenantId - b.tenantId);
  }, [nodeTenants]);

  // 선택된 테넌트의 COS 목록 조회
  const listParams = useMemo(() => (selectedTenantId && selectedTenantId > 0 ? { tenantId: selectedTenantId } : undefined), [selectedTenantId]);
  const { data: cosList = [], isLoading } = useGetCosList({
    params: listParams,
    queryOptions: { enabled: !!listParams },
  });

  // 검색 필터
  const filteredCosList = useMemo(() => {
    if (!searchText.trim()) return cosList;
    const kw = searchText.trim().toLowerCase();
    return cosList.filter((cos) => cos.cosName?.toLowerCase().includes(kw) || String(cos.cosId).includes(kw));
  }, [cosList, searchText]);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutateAsync: deleteCosAsync } = useDeleteCos({
    mutationOptions: {
      onSuccess: () => {
        invalidateList();
      },
    },
  });

  // ─── Invalidation helpers ──────────────────────────────────────────────────
  const invalidateList = useCallback(() => {
    if (listParams) {
      queryClient.invalidateQueries({
        queryKey: cosQueryKeys.getList(listParams).queryKey,
      });
    }
  }, [queryClient, listParams]);

  // ctxTenantId 없으면 첫 번째 테넌트 자동 선택
  useEffect(() => {
    if (selectedTenantId === null && tenants.length > 0) {
      setSelectedTenantId(tenants[0].tenantId);
    }
  }, [tenants, selectedTenantId]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleTenantSelect = useCallback((tenantId: number) => {
    setSelectedTenantId(tenantId);
    setSearchText('');
    setSelectedRows([]);
  }, []);

  const handleCreate = useCallback(() => {
    navigate('/ipron/cos/create' + (selectedTenantId && selectedTenantId > 0 ? `?tenantId=${selectedTenantId}` : ''));
  }, [navigate, selectedTenantId]);

  const handleEdit = useCallback(
    (cos: Cos) => {
      navigate(`/ipron/cos/${cos.cosId}/edit`);
    },
    [navigate],
  );

  const handleBulkDelete = useCallback(async () => {
    if (selectedRows.length === 0) return;

    // 기본 COS 삭제 방지 (tenantId == cosId)
    const defaultCos = selectedRows.find((c) => c.tenantId === c.cosId);
    if (defaultCos) {
      Modal.warning({
        title: '삭제 불가',
        content: '기본 COS로 등록된 항목은 삭제할 수 없습니다.',
      });
      return;
    }

    modal.confirm.execute({
      onOk: async () => {
        setIsDeleting(true);
        try {
          await Promise.all(selectedRows.map((c) => deleteCosAsync({ cosId: c.cosId })));
          toast.success(`${selectedRows.length}건이 삭제되었습니다`);
          setSelectedRows([]);
        } catch {
          toast.error('일부 항목 삭제에 실패하였습니다');
        } finally {
          setIsDeleting(false);
        }
      },
      options: {
        title: 'COS 삭제',
        content: `선택한 ${selectedRows.length}건의 COS를 삭제하시겠습니까?`,
      },
    });
  }, [modal, deleteCosAsync, selectedRows]);

  // ─── ag-Grid Column Defs ──────────────────────────────────────────────────
  const columnDefs: ColDef<Cos>[] = useMemo(
    () => [
      { headerName: 'COS 이름', field: 'cosName', flex: 1, minWidth: 160 },
      { headerName: '착신금지', field: 'dnTblSvc', width: 100, cellRenderer: StatusBadgeRenderer },
      { headerName: '발신금지', field: 'dnOblSvc', width: 100, cellRenderer: StatusBadgeRenderer },
      { headerName: '픽업사용', field: 'pickupSvc', width: 100, cellRenderer: StatusBadgeRenderer },
      { headerName: '코칭사용', field: 'coachingSvc', width: 100, cellRenderer: StatusBadgeRenderer },
      { headerName: '감청사용', field: 'monitorSvc', width: 100, cellRenderer: StatusBadgeRenderer },
      { headerName: '피감청/피코칭', field: 'ignoreBugsCoaching', width: 120, cellRenderer: StatusBadgeRenderer },
      { headerName: '특정번호발신허용', field: 'dodNumAllow', width: 140, cellRenderer: StatusBadgeRenderer },
      { headerName: '특정번호착신금지', field: 'callScreenSvc', width: 140, cellRenderer: StatusBadgeRenderer },
    ],
    [],
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 박스 1: 헤더 (검색 + 등록 버튼) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px]">
          <span className="text-sm font-semibold text-gray-700">COS 설정</span>
          {selectedTenantId !== null && (
            <span className="ml-3 text-xs text-gray-500">
              테넌트: <span className="font-medium text-gray-700">{tenants.find((t) => t.tenantId === selectedTenantId)?.tenantName ?? `#${selectedTenantId}`}</span>
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Input
              allowClear
              prefix={<Search className="size-3.5 text-gray-400" />}
              placeholder="COS 검색"
              value={searchText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
              style={{ width: 200 }}
            />
            <Button
              danger
              icon={<Trash2 className="size-3.5" />}
              onClick={handleBulkDelete}
              loading={isDeleting}
              disabled={selectedRows.length === 0}
              title={selectedRows.length === 0 ? '삭제할 COS를 선택하세요' : '선택한 COS 삭제'}
            >
              {selectedRows.length > 0 ? `삭제 (${selectedRows.length})` : '삭제'}
            </Button>
            <Button type="primary" icon={<Plus className="size-3.5" />} disabled={!selectedTenantId || selectedTenantId < 0} onClick={handleCreate}>
              등록
            </Button>
          </div>
        </div>
      </div>

      {/* ===== 박스 2: A타입 테넌트 카드슬라이더 (AdnList.tsx 패턴) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        {cardExpanded ? (
          /* 확장 카드 모드 */
          <div className="flex items-center h-[140px] px-4 py-3">
            <div className="relative flex items-center gap-2 w-full">
              <Button
                type="text"
                icon={<ChevronLeft className="size-5" />}
                onClick={() => cardScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                className="!flex-shrink-0 !w-8 !h-8 !p-0"
              />
              <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto py-2 px-1 flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {tenants.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 min-h-[100px]">
                    <Empty description={false} imageStyle={{ height: 40 }} />
                    <span className="text-sm">등록된 테넌트가 없습니다</span>
                  </div>
                ) : (
                  tenants.map((t) => (
                    <CosTenantCard
                      key={t.tenantId}
                      tenantId={t.tenantId}
                      tenantName={t.tenantName}
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
          /* Compact pill 모드 */
          <div className="flex items-center h-[44px] px-4">
            <div className="relative flex items-center gap-2 w-full">
              <div className="flex gap-2 overflow-x-auto flex-1 items-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {tenants.map((t) => (
                  <CompactTenantPill key={t.tenantId} name={t.tenantName} selected={selectedTenantId === t.tenantId} onClick={() => handleTenantSelect(t.tenantId)} />
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

      {/* ===== 박스 3: COS 그리드 ===== */}
      <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
        {selectedTenantId && selectedTenantId > 0 ? (
          <>
            {/* Grid header */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <span className="text-sm font-semibold text-gray-800">COS 설정 ({filteredCosList.length}건)</span>
            </div>

            {/* Grid */}
            <div className="flex-1">
              {filteredCosList.length === 0 && !isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                  <Empty description={false} />
                  <span className="text-sm">{searchText.trim() ? '검색 결과가 없습니다' : '등록된 COS가 없습니다'}</span>
                </div>
              ) : (
                <AgGridReact<Cos>
                  rowData={filteredCosList}
                  columnDefs={columnDefs}
                  gridOptions={{
                    ...gridOptions,
                    statusBar: undefined,
                    pagination: false,
                    sideBar: false,
                    rowSelection: { mode: 'multiRow', checkboxes: true, headerCheckbox: true },
                  }}
                  loading={isLoading}
                  getRowId={(params) => String(params.data.cosId)}
                  defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
                  onRowDoubleClicked={(e) => {
                    if (e.data) handleEdit(e.data);
                  }}
                  onSelectionChanged={(e) => setSelectedRows(e.api.getSelectedRows())}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 px-8">
            <Empty description={false} />
            <span className="text-sm">상단에서 테넌트를 선택하세요</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── A타입 테넌트 카드 (COS 전용) ──────────────────────────────────────────
interface CosTenantCardProps {
  tenantId: number;
  tenantName: string;
  selected: boolean;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function CosTenantCard({ tenantName, selected, onClick }: CosTenantCardProps) {
  return (
    <div
      className={`bg-white border rounded-lg p-3 cursor-pointer transition-all w-[200px] h-[80px] flex-shrink-0 flex flex-col justify-center ${
        selected ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]' : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5">
        <Building2 className={`size-3.5 flex-shrink-0 ${selected ? 'text-[#405189]' : 'text-gray-500'}`} />
        <span className={`text-[13px] font-semibold truncate ${selected ? 'text-[#405189]' : 'text-gray-800'}`} title={tenantName}>
          {tenantName}
        </span>
      </div>
    </div>
  );
}

// ─── Compact Pill (접힌 모드) ──────────────────────────────────────────────
interface CompactTenantPillProps {
  name: string;
  selected: boolean;
  onClick: () => void;
}

function CompactTenantPill({ name, selected, onClick }: CompactTenantPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={name}
      className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition ${
        selected
          ? 'border-[#405189] bg-[#405189] text-white shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
          : 'border-gray-200 bg-white text-gray-700 hover:border-[#c5cbe0] hover:text-[#405189]'
      }`}
    >
      <span className="font-medium truncate max-w-[120px]">{name}</span>
    </button>
  );
}
