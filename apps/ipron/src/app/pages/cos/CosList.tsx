/**
 * COS 설정 목록 페이지
 *
 * 멀티테넌트 개편(상담사 관리 정합): 상단 테넌트 카드 슬라이더 제거.
 *   - 일반 콘솔: 테넌트 선택기 없음(토큰=활성 테넌트 스코프). 헤더에 요약(총/기본 COS)만.
 *   - 운영자 모드: 헤더에 대행 테넌트 ScopeSelect(공통) + 그 옆에 요약.
 * 하단: ag-Grid (COS 목록, 서비스 플래그 설정/해제 배지)
 *
 * Layout:
 * +----------------------------------------------------------+
 * | 박스 1: 헤더 (스코프 선택 + 요약 + 검색 + 등록 버튼)       |
 * +----------------------------------------------------------+
 * | 박스 2: ag-Grid (COS 목록)                                |
 * +----------------------------------------------------------+
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Empty, Input, Modal } from 'antd';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { cosQueryKeys, useDeleteCosBatch, useGetCosList } from '../../features/cos/hooks/useCosQueries';
import type { Cos } from '../../features/cos/types';
import { useGetNodeTenants } from '../../features/node-scope/hooks/useNodeScope';
import ScopeSelect from '@/components/custom/ScopeSelect';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '번호자원관리' }, { title: '교환기 번호관리' }, { title: 'COS 설정', path: '/ipron/cos' }];

const BADGE_CLASS = 'text-[13px] leading-[13px] font-medium !h-6';
const CENTER_CELL = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

/** 0/1 서비스 플래그를 설정/해제 배지로 표시 */
const StatusBadgeRenderer = (params: ICellRendererParams) => {
  const value = params.value;
  return (
    <Badge variant="secondary" className={cn(BADGE_CLASS, value === 1 ? 'text-blue-600 bg-blue-50' : 'text-gray-500 bg-gray-100')}>
      {value === 1 ? '설정' : '해제'}
    </Badge>
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

  // ctx 테넌트 (JWT — 사용자 본인 테넌트)
  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // 운영자 모드(통합운영) — 시스템 관리자가 헤더 TenantChip 에서 진입.
  //  - 전체(actAsTenantId=null): 대행 테넌트 미선택 → 등록 불가, 테넌트 선택 유도
  //  - 대행(actAsTenantId=X): tenantId=X 로 조회 스코프 + apiClient 가 X-Act-As-Tenant 주입 → X 대행 CUD
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const actAsTenantId = useOperatorScopeStore((s) => s.actAsTenantId);
  const setActAsTenant = useOperatorScopeStore((s) => s.setActAsTenant);
  const opTenantId = actAsTenantId ? Number(actAsTenantId) : null;
  // 조회/등록 스코프: 일반=활성테넌트 / 운영자=대행테넌트(null=전체).
  const selectedTenantId = operatorMode ? opTenantId : ctxTenantId;

  // ─── State ──────────────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState<Cos[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: nodeTenants = [] } = useGetNodeTenants();

  // 테넌트 목록 (중복 제거) — 운영자 대행 선택기 옵션 소스
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

  // COS 목록 조회 — 특정 테넌트면 tenantId 전달, 운영자 전체면 미전달(view-all).
  const listParams = useMemo(() => (selectedTenantId && selectedTenantId > 0 ? { tenantId: selectedTenantId } : undefined), [selectedTenantId]);
  const { data: cosList = [], isLoading } = useGetCosList({
    params: listParams,
    // 운영자 모드면 전체(파라미터 없이 view-all)도 조회. 일반 콘솔은 활성 테넌트가 있을 때만.
    queryOptions: { enabled: operatorMode || !!listParams },
  });

  // tenantId → 이름 매핑 (그리드 테넌트 컬럼 · 운영자 전체 보기용)
  const tenantNameById = useMemo(() => new Map(tenants.map((t) => [t.tenantId, t.tenantName] as const)), [tenants]);

  // 검색 필터
  const filteredCosList = useMemo(() => {
    if (!searchText.trim()) return cosList;
    const kw = searchText.trim().toLowerCase();
    return cosList.filter((cos) => cos.cosName?.toLowerCase().includes(kw) || String(cos.cosId).includes(kw));
  }, [cosList, searchText]);

  // 헤더 요약 — 현재 스코프(선택 테넌트)의 총 COS / 기본 COS(tenantId===cosId).
  const summary = useMemo(
    () => ({
      total: cosList.length,
      base: cosList.filter((c) => c.tenantId === c.cosId).length,
    }),
    [cosList],
  );

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutateAsync: deleteCosBatchAsync } = useDeleteCosBatch({
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

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleCreate = useCallback(() => {
    // 전체 보기에서도 등록 허용 — 테넌트 미지정으로 등록 페이지 진입 후 CosForm 의 "테넌트" 필드에서 선택.
    const q = selectedTenantId && selectedTenantId > 0 ? `?tenantId=${selectedTenantId}` : '';
    navigate(`/ipron/cos/create${q}`);
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
          await deleteCosBatchAsync(selectedRows.map((c) => c.cosId));
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
  }, [modal, deleteCosBatchAsync, selectedRows]);

  // ag-Grid 34: rowSelection 은 gridOptions 밖 직접 prop 으로 (초기 마운트 1회 제한 우회)
  const rowSelection = useMemo(() => ({ mode: 'multiRow' as const, checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }), []);

  // ─── ag-Grid Column Defs ──────────────────────────────────────────────────
  const cosStatusFilterGetter = useCallback((field: keyof Cos) => (p: import('ag-grid-community').ValueGetterParams<Cos>) => (p.data?.[field] === 1 ? '설정' : '해제'), []);

  const columnDefs: ColDef<Cos>[] = useMemo(
    () => [
      ...(operatorMode
        ? [
            {
              headerName: '테넌트',
              field: 'tenantId' as const,
              width: 140,
              valueGetter: (p: import('ag-grid-community').ValueGetterParams<Cos>) =>
                tenantNameById.get(p.data?.tenantId ?? -1) ?? (p.data?.tenantId != null ? `테넌트 ${p.data.tenantId}` : '-'),
            },
          ]
        : []),
      { headerName: 'COS 이름', field: 'cosName', flex: 1, minWidth: 160, tooltipField: 'cosName' },
      { headerName: '착신금지', field: 'dnTblSvc', width: 100, cellStyle: CENTER_CELL, filterValueGetter: cosStatusFilterGetter('dnTblSvc'), cellRenderer: StatusBadgeRenderer },
      { headerName: '발신금지', field: 'dnOblSvc', width: 100, cellStyle: CENTER_CELL, filterValueGetter: cosStatusFilterGetter('dnOblSvc'), cellRenderer: StatusBadgeRenderer },
      { headerName: '픽업사용', field: 'pickupSvc', width: 100, cellStyle: CENTER_CELL, filterValueGetter: cosStatusFilterGetter('pickupSvc'), cellRenderer: StatusBadgeRenderer },
      {
        headerName: '코칭사용',
        field: 'coachingSvc',
        width: 100,
        cellStyle: CENTER_CELL,
        filterValueGetter: cosStatusFilterGetter('coachingSvc'),
        cellRenderer: StatusBadgeRenderer,
      },
      {
        headerName: '감청사용',
        field: 'monitorSvc',
        width: 100,
        cellStyle: CENTER_CELL,
        filterValueGetter: cosStatusFilterGetter('monitorSvc'),
        cellRenderer: StatusBadgeRenderer,
      },
      {
        headerName: '피감청/피코칭',
        field: 'ignoreBugsCoaching',
        width: 120,
        cellStyle: CENTER_CELL,
        filterValueGetter: cosStatusFilterGetter('ignoreBugsCoaching'),
        cellRenderer: StatusBadgeRenderer,
      },
      {
        headerName: '특정번호발신허용',
        field: 'dodNumAllow',
        width: 140,
        cellStyle: CENTER_CELL,
        filterValueGetter: cosStatusFilterGetter('dodNumAllow'),
        cellRenderer: StatusBadgeRenderer,
      },
      {
        headerName: '특정번호착신금지',
        field: 'callScreenSvc',
        width: 140,
        cellStyle: CENTER_CELL,
        filterValueGetter: cosStatusFilterGetter('callScreenSvc'),
        cellRenderer: StatusBadgeRenderer,
      },
    ],
    [cosStatusFilterGetter, operatorMode, tenantNameById],
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 박스 1: 헤더 (스코프 선택 + 요약 + 검색 + 등록 버튼) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px] gap-3">
          {/* 운영자 모드: 대행 테넌트 선택(공통 ScopeSelect). 일반 콘솔은 브레드크럼이 화면명 표기. */}
          {operatorMode && (
            <ScopeSelect
              kind="tenant"
              options={tenants.map((t) => ({ id: t.tenantId, name: t.tenantName ?? `테넌트 ${t.tenantId}` }))}
              value={actAsTenantId}
              onChange={(id) => {
                setActAsTenant(id);
                setSearchText('');
                setSelectedRows([]);
              }}
            />
          )}
          {/* 요약 — 총/기본 COS (운영자는 선택 뒤, 일반은 좌측). */}
          <div className={`flex items-center gap-4 text-[13px] ${operatorMode ? 'ml-3 pl-3 border-l border-gray-200' : ''}`}>
            <span className="text-gray-500">
              총 COS <b className="text-gray-800 font-semibold">{summary.total.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              기본 COS <b className="text-[#405189] font-semibold">{summary.base.toLocaleString()}</b>
            </span>
          </div>
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
              삭제
            </Button>
            <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
              등록
            </Button>
          </div>
        </div>
      </div>

      {/* ===== 박스 2: COS 그리드 ===== */}
      <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
        {operatorMode || (selectedTenantId && selectedTenantId > 0) ? (
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
                  }}
                  rowSelection={rowSelection}
                  loading={isLoading}
                  getRowId={(params) => String(params.data.cosId)}
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
