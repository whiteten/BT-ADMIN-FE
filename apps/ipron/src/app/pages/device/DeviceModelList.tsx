/**
 * 단말모델관리 목록 페이지 (IPR20S2120)
 * Pattern: 단일 ag-Grid (카드 슬라이더 없음 — 모델은 노드·테넌트 무관 글로벌 자원)
 *
 * Layout (승인 목업 device-model.html 정합):
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │ 단말모델 목록 (N건)        [검색][삭제(danger)][등록(primary)]│
 *  │ ag-Grid (체크박스 다중선택, 더블클릭=수정 드로어)            │
 *  └──────────────────────────────────────────────────────────────┘
 *
 * 삭제 차단: 해당 모델을 쓰는 단말기(usedDeviceCount>0) 있으면 차단 (SWAT TB_IE_DEV_MASTER 참조 체크)
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, GridReadyEvent, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Modal, Tag } from 'antd';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { deviceQueryKeys } from '../../features/device/hooks/useDeviceQueries';
import DeviceModelFormDrawer, { type DeviceModelFormDrawerRef } from '../../features/device-model/components/DeviceModelFormDrawer';
import { deviceModelQueryKeys, useDeleteDeviceModel, useGetDeviceModels } from '../../features/device-model/hooks/useDeviceModelQueries';
import type { DeviceModelResponse } from '../../features/device-model/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: '단말관리', path: '/ipron/device/model' },
  { title: '단말모델관리', path: '/ipron/device/model' },
];

export default function DeviceModelList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState<DeviceModelResponse[]>([]);
  const drawerRef = useRef<DeviceModelFormDrawerRef>(null);
  const gridRef = useRef<AgGridReact<DeviceModelResponse>>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: models = [], isLoading, isError } = useGetDeviceModels();

  // 텍스트 검색 — 상단 Input + searchText state + useMemo 사전필터 (모델명/제조사/단말이름)
  const modelsForGrid = useMemo(() => {
    const kw = searchText.trim().toLowerCase();
    if (!kw) return models;
    return models.filter((m) => [m.modelName, m.vendorName, m.deviceName].some((f) => f != null && String(f).toLowerCase().includes(kw)));
  }, [models, searchText]);

  const invalidateModels = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: deviceModelQueryKeys.list.queryKey });
    queryClient.invalidateQueries({ queryKey: deviceModelQueryKeys.detail._def });
    // 단말기관리 화면의 단말기유형 콤보 캐시도 갱신
    queryClient.invalidateQueries({ queryKey: deviceQueryKeys.deviceTypes.queryKey });
  }, [queryClient]);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: deleteModel, isPending: isDeleting } = useDeleteDeviceModel({
    mutationOptions: {
      onSuccess: () => {
        toast.success('단말모델이 삭제되었습니다');
        setSelectedRows([]);
        invalidateModels();
      },
      onError: (e: unknown) => {
        const err = e as { response?: { data?: { message?: string } } };
        toast.error(err?.response?.data?.message ?? '단말모델 삭제에 실패했습니다.');
      },
    },
  });

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleCreate = useCallback(() => drawerRef.current?.openCreate(), []);
  const handleEdit = useCallback((data: DeviceModelResponse) => drawerRef.current?.openEdit(data), []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedRows.length === 0) return;
    // 삭제 차단: 참조 단말기(usedDeviceCount>0) 있으면 차단 (SWAT: TB_IE_DEV_MASTER.DEVICE_TYPE 참조 체크)
    const blocked = selectedRows.filter((r) => (r.usedDeviceCount ?? 0) > 0);
    if (blocked.length > 0) {
      Modal.warning({
        title: '삭제 불가',
        content: (
          <div className="text-sm">
            <p>해당 단말유형으로 설정된 단말기 정보가 있습니다.</p>
            <ul className="mt-2 mb-0 list-disc pl-5">
              {blocked.map((r) => (
                <li key={r.deviceType}>
                  {r.modelName ?? r.deviceName} ({(r.usedDeviceCount ?? 0).toLocaleString()}대 사용중)
                </li>
              ))}
            </ul>
            <p className="mt-2 text-gray-500">사용중인 단말기를 먼저 정리한 뒤 삭제할 수 있습니다.</p>
          </div>
        ),
      });
      return;
    }
    modal.confirm.execute({
      onOk: () => selectedRows.forEach((r) => deleteModel(r.deviceType)),
      options: {
        title: '단말모델 삭제',
        content: `선택한 단말모델 ${selectedRows.length}건을 삭제하시겠습니까?`,
      },
    });
  }, [selectedRows, modal.confirm, deleteModel]);

  // ─── Grid Columns (승인 목업 컬럼 정합) ─────────────────────────────────────
  const columnDefs: ColDef<DeviceModelResponse>[] = useMemo(
    () => [
      { field: 'vendorName', headerName: '제조사', flex: 0.9, minWidth: 110, tooltipField: 'vendorName' },
      { field: 'modelName', headerName: '모델명', flex: 1.1, minWidth: 130, tooltipField: 'modelName' },
      { field: 'feature', headerName: '기능', flex: 0.9, minWidth: 100, tooltipField: 'feature' },
      { field: 'lineNum', headerName: '단말라인', width: 100, flex: 0, type: 'numericColumn' },
      { field: 'buttonNum', headerName: '단말버튼', width: 100, flex: 0, type: 'numericColumn' },
      {
        colId: 'firmware',
        headerName: '펌웨어',
        flex: 1.3,
        minWidth: 160,
        sortable: false,
        valueGetter: (p) => [p.data?.firmName, p.data?.firmVersion].filter(Boolean).join(' · '),
        tooltipValueGetter: (p) => [p.data?.firmName, p.data?.firmVersion].filter(Boolean).join(' · ') || '-',
        cellRenderer: (params: ICellRendererParams<DeviceModelResponse>) => {
          const d = params.data;
          if (!d?.firmName && !d?.firmVersion) return <span className="text-gray-300">-</span>;
          return (
            <span>
              {d?.firmName ?? ''}
              {d?.firmVersion && <span className="text-gray-400"> · {d.firmVersion}</span>}
            </span>
          );
        },
      },
      {
        field: 'usedDeviceCount',
        headerName: '사용 단말기',
        width: 120,
        flex: 0,
        cellRenderer: ({ value }: { value: number | null | undefined }) =>
          (value ?? 0) > 0 ? <Tag color="blue">{(value ?? 0).toLocaleString()}대 사용중</Tag> : <Tag>미사용</Tag>,
      },
    ],
    [],
  );

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 단일 그리드 박스 (카드 슬라이더 없음 — 글로벌 자원) ===== */}
      <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 h-[44px] flex-shrink-0">
          <span className="text-sm font-semibold text-gray-800">단말모델 목록 ({modelsForGrid.length.toLocaleString()}건)</span>
          {selectedRows.length > 0 && (
            <span className="text-xs text-gray-500">
              {modelsForGrid.length.toLocaleString()}건 중 {selectedRows.length}건 선택
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Input
              allowClear
              prefix={<Search className="size-3.5 text-gray-400" />}
              placeholder="모델명 / 제조사 검색"
              value={searchText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
              style={{ width: 200 }}
            />
            <Button danger icon={<Trash2 className="size-3.5" />} onClick={handleDeleteSelected} loading={isDeleting} disabled={selectedRows.length === 0}>
              삭제
            </Button>
            <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
              등록
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 ag-theme-quartz" style={{ width: '100%', height: '100%' }}>
          {isError ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-red-500">
              <span className="text-sm font-medium">단말모델 목록 조회에 실패했습니다.</span>
              <span className="text-xs text-gray-400">서버 오류가 발생했습니다. 잠시 후 다시 시도하세요.</span>
            </div>
          ) : (
            <AgGridReact<DeviceModelResponse>
              ref={gridRef}
              rowData={modelsForGrid}
              columnDefs={columnDefs}
              loading={isLoading}
              gridOptions={{
                ...gridOptions,
                pagination: false,
                statusBar: undefined,
                sideBar: false,
                rowSelection: { mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: false },
              }}
              onSelectionChanged={(e) => setSelectedRows(e.api.getSelectedRows())}
              onGridReady={onGridReady}
              onRowDoubleClicked={(e) => e.data && handleEdit(e.data)}
            />
          )}
        </div>
      </div>

      {/* 등록/수정 Drawer */}
      <DeviceModelFormDrawer ref={drawerRef} models={models} onSuccess={invalidateModels} />
    </div>
  );
}
