/**
 * 수신번호 차단 관리 목록 페이지
 *
 * 멀티테넌트 개편(상담사 관리 정합): 노드 개념 완전 제거 → 테넌트 전용 화면.
 *   - 이 화면은 노드를 실제로 쓰지 않음(테이블 NODE_ID 항상 0 고정). 노드 선택기/컬럼/폼 필드 없음.
 *   - 일반 콘솔: 테넌트 선택기 없음(토큰=활성 테넌트 스코프). 헤더에 요약(총 차단번호)만.
 *   - 운영자 모드: 헤더에 대행 테넌트 ScopeSelect(전체 포함) + 요약(총 차단번호 / 테넌트 수).
 *   - 하단: 차단번호 목록 ag-Grid.
 *
 * 데이터 흐름: tenantId(선택 스코프) 기준 서버 조회. 운영자 전체(null)면 tenantId 미전달 → BE view-all.
 *   번호패턴 검색은 서버사이드 LIKE(SWAT IPR20S1060L numPattern 대응) — tenantId 와 함께 전달.
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Empty, Input } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import CallScreenDrawer, { type CallScreenDrawerRef } from '../../features/call-screen/components/CallScreenDrawer';
import { callScreenQueryKeys, useDeleteCallScreenBatch, useGetCallScreenList } from '../../features/call-screen/hooks/useCallScreenQueries';
import type { CallScreen } from '../../features/call-screen/types';
import ScopeSelect from '@/components/custom/ScopeSelect';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '회선관리' }, { title: '번호 변환' }, { title: '수신번호차단관리', path: '/ipron/line/call-screen' }];

export default function CallScreenList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();
  const modal = useModal();

  // ─── 운영자/테넌트 스코프 ───────────────────────────────────────────────────
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });

  // ─── State ──────────────────────────────────────────────────────────────────
  // 운영자 전용 테넌트 필터(null=전체 테넌트 view-all). 일반 모드는 ctxTenantId 로 파생.
  const [tenantFilter, setTenantFilter] = useState<number | null>(null);
  const selectedTenantId = operatorMode ? tenantFilter : ctxTenantId;
  /** 번호패턴 서버사이드 LIKE 검색어 — SWAT IPR20S1060L numPattern 대응 */
  const [numPatternSearch, setNumPatternSearch] = useState('');
  const [selectedRows, setSelectedRows] = useState<CallScreen[]>([]);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const drawerRef = useRef<CallScreenDrawerRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const isNumPatternSearching = numPatternSearch.trim().length > 0;

  // 테넌트 스코프 + (검색 시) 번호패턴 LIKE 를 함께 서버로 전달.
  //  - 운영자 전체(selectedTenantId==null): tenantId 미전달 → apiClient 가 X-View-All-Tenants 주입 → 전체 조회.
  const listParams = useMemo(() => {
    const p: Record<string, unknown> = {};
    if (selectedTenantId != null) p.tenantId = selectedTenantId;
    if (isNumPatternSearching) p.numPattern = numPatternSearch.trim();
    return p;
  }, [selectedTenantId, isNumPatternSearching, numPatternSearch]);

  const { data: callScreens = [], isLoading } = useGetCallScreenList({ params: listParams });

  // ─── Derived data ───────────────────────────────────────────────────────────
  // 테넌트 옵션 — 공통 소스(토큰의 접근가능 테넌트). rows 에서 뽑으면 "데이터 있는 테넌트"만 나와
  // 데이터가 없는 테넌트로는 신규 등록조차 못 하므로, 접근 가능한 전체 테넌트를 노출하고 건수만 덧씌운다.
  const availableTenants = useAuthStore((s) => s.userInfo?.availableTenants);
  const tenantOptions = useMemo(() => {
    const counts = new Map<number, number>();
    for (const cs of callScreens) counts.set(cs.tenantId, (counts.get(cs.tenantId) ?? 0) + 1);
    return (availableTenants ?? [])
      .map((t) => ({ id: t.tenantId, name: t.tenantName ?? String(t.tenantId), count: counts.get(t.tenantId) ?? 0 }))
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }, [availableTenants, callScreens]);

  const selectedTenantName = useMemo(
    () =>
      selectedTenantId == null ? '' : (tenantOptions.find((t) => t.id === selectedTenantId)?.name ?? callScreens.find((c) => c.tenantId === selectedTenantId)?.tenantName ?? ''),
    [tenantOptions, callScreens, selectedTenantId],
  );

  // 헤더 요약 — 총 차단번호 / (운영자만) 테넌트 수
  // 테넌트 수는 "데이터가 있는 테넌트" 기준 (옵션 목록은 접근가능 전체라 별도 계산)
  const summary = useMemo(() => ({ total: callScreens.length, tenant: new Set(callScreens.map((c) => c.tenantId)).size }), [callScreens]);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const invalidateList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: callScreenQueryKeys.getList(listParams).queryKey });
  }, [queryClient, listParams]);

  const { mutate: deleteCallScreenBatch } = useDeleteCallScreenBatch({
    mutationOptions: {
      onSuccess: () => {
        toast.success('수신번호 차단이 삭제되었습니다');
        invalidateList();
        setSelectedRows([]);
      },
    },
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleCreate = useCallback(() => {
    // 운영자 전체(view-all) 모드에서도 추가 허용 — 테넌트 미지정 시 드로어 폼에서 필수 선택하게 강제.
    drawerRef.current?.open(undefined, selectedTenantId ?? undefined, selectedTenantName || undefined);
  }, [selectedTenantId, selectedTenantName]);

  const handleEdit = useCallback((item: CallScreen) => {
    drawerRef.current?.open(item);
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedRows.length === 0) return;
    modal.confirm.execute({
      onOk: () => deleteCallScreenBatch(selectedRows.map((item) => item.callscreenId)),
      options: {
        title: '수신번호 차단 삭제',
        content: `선택한 ${selectedRows.length}건의 차단번호를 삭제하시겠습니까?`,
      },
    });
  }, [modal, selectedRows, deleteCallScreenBatch]);

  const handleDrawerSuccess = useCallback(() => {
    invalidateList();
  }, [invalidateList]);

  // ─── ag-Grid Column Defs ──────────────────────────────────────────────────
  const columnDefs: ColDef<CallScreen>[] = useMemo(() => {
    const cols: ColDef<CallScreen>[] = [];
    // 테넌트명은 운영자 모드(다중 테넌트)일 때만 표시 — 일반 모드는 단일 테넌트라 숨김
    if (operatorMode) {
      cols.push({
        headerName: '테넌트명',
        field: 'tenantName',
        flex: 1,
        minWidth: 120,
      });
    }
    cols.push(
      {
        headerName: '차단번호패턴',
        field: 'numPattern',
        flex: 2,
        minWidth: 200,
        tooltipField: 'numPattern',
        cellStyle: { fontFamily: 'monospace' },
      },
      {
        headerName: '차단설명',
        field: 'screenDesc',
        flex: 1.5,
        minWidth: 160,
        tooltipField: 'screenDesc',
        valueFormatter: (params) => params.data?.screenDesc ?? '-',
      },
    );
    return cols;
  }, [operatorMode]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 박스A: 헤더 (테넌트 스코프 + 요약) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px] gap-3">
          {/* 테넌트 스코프 (전체 포함) — 운영자 모드에서만 노출. 일반 콘솔은 브레드크럼이 화면명 표기. */}
          {operatorMode && (
            <ScopeSelect
              kind="tenant"
              options={tenantOptions}
              value={tenantFilter == null ? null : String(tenantFilter)}
              onChange={(id) => {
                setTenantFilter(id == null ? null : Number(id));
                setSelectedRows([]);
              }}
            />
          )}
          {/* 요약 — 총 차단번호 / (운영자) 테넌트 수 */}
          <div className={`flex items-center gap-4 text-[13px] ${operatorMode ? 'ml-1 pl-3 border-l border-gray-200' : ''}`}>
            <span className="text-gray-500">
              총 차단번호 <b className="text-gray-800 font-semibold">{summary.total.toLocaleString()}</b>
            </span>
            {operatorMode && (
              <span className="text-gray-500">
                테넌트 <b className="text-[#405189] font-semibold">{summary.tenant.toLocaleString()}</b>
              </span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* 번호패턴 서버사이드 LIKE 검색 — SWAT "차단번호패턴" 검색란 대응 */}
            <Input.Search
              allowClear
              placeholder="차단번호패턴 검색"
              value={numPatternSearch}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNumPatternSearch(e.target.value)}
              onSearch={(val) => setNumPatternSearch(val)}
              style={{ width: 200 }}
            />
          </div>
        </div>
      </div>

      {/* ===== 박스B: 차단번호 목록 ag-Grid ===== */}
      <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="px-5 py-3 flex items-center gap-2 h-[44px] flex-shrink-0">
          <span className="text-sm font-semibold text-gray-800">
            {isNumPatternSearching
              ? `차단번호패턴 "${numPatternSearch.trim()}" 검색 결과`
              : operatorMode
                ? selectedTenantId == null
                  ? '전체 테넌트'
                  : selectedTenantName || '수신번호차단'
                : '수신번호차단'}
          </span>
          <span className="text-xs text-gray-500">
            총 {callScreens.length.toLocaleString()}건{selectedRows.length > 0 ? ` · 선택 ${selectedRows.length}건` : ''}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              danger
              icon={<Trash2 className="size-3.5" />}
              onClick={handleDeleteSelected}
              disabled={selectedRows.length === 0}
              title={selectedRows.length === 0 ? '삭제할 항목을 선택하세요' : `선택한 ${selectedRows.length}건 삭제`}
            >
              삭제
            </Button>
            <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
              추가
            </Button>
          </div>
        </div>
        <div className="border-t border-gray-200" />

        <div className="flex-1 min-h-0 p-5">
          {callScreens.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <Empty description={false} />
              <span className="text-sm">{isNumPatternSearching ? '검색 결과가 없습니다' : '등록된 차단번호가 없습니다'}</span>
            </div>
          ) : (
            <AgGridReact<CallScreen>
              rowData={callScreens}
              columnDefs={columnDefs}
              gridOptions={{
                ...gridOptions,
                statusBar: undefined,
                pagination: false,
                sideBar: false,
              }}
              rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }}
              loading={isLoading}
              getRowId={(params) => String(params.data.callscreenId)}
              defaultColDef={{ sortable: true, filter: true, suppressHeaderMenuButton: true }}
              onRowDoubleClicked={(e) => {
                if (e.data) handleEdit(e.data);
              }}
              onSelectionChanged={(e) => setSelectedRows(e.api.getSelectedRows())}
            />
          )}
        </div>
      </div>

      {/* ===== Drawer ===== */}
      <CallScreenDrawer ref={drawerRef} onSuccess={handleDrawerSuccess} />
    </div>
  );
}
