/**
 * 대표번호별 DNIS 관리 페이지 (IPR20S6043).
 *
 * 레이아웃 (회선관리 Full Grid + Tabbar 패턴):
 *  - 상단 박스: 테넌트 탭 바 (h-[56px]) + 우측 [검색 / 내보내기 / 가져오기 / 추가]
 *  - 하단 박스: ag-Grid (그리드 헤더에 건수 표시)
 *
 * 더블클릭 → 수정 Drawer / [+ 추가] → 등록 Drawer (선택 테넌트 자동 주입)
 * 엑셀 내보내기/가져오기는 백엔드 위임 — 클라이언트는 multipart 업로드만 담당.
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Empty, Input } from 'antd';
import { Building2, Download, Phone, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import IvrAinDnisImportResultModal, { type IvrAinDnisImportResultModalRef } from '../../features/ivr-ain-dnis/components/IvrAinDnisImportResultModal';
import IvrAinDnisSheet, { type IvrAinDnisSheetRef } from '../../features/ivr-ain-dnis/components/IvrAinDnisSheet';
import { ivrAinDnisQueryKeys, useDeleteAin, useExportAinDnis, useGetAinList, useGetTenants, useImportAinDnis } from '../../features/ivr-ain-dnis/hooks/useIvrAinDnisQueries';
import { type ExcelImportResult, type IrAinMaster, TELCO_KIND_LABELS, type TelcoKindCode } from '../../features/ivr-ain-dnis/types';
import FileImportModal, { type FileImportModalRef } from '@/components/custom/FileImportModal';
import TabBar, { type TabBarItem } from '@/components/custom/TabBar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';
import { codeFilter } from '@/libs/shared-ui/src/lib/aggridCodeColumn';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '회선관리' }, { title: '대표번호별 DNIS관리', path: '/ivr/line/ain-dnis' }];

/** 통신사 배지 색상 — 그리드 안 상태값 배지 표준(add-grid 스킬 참조). */
const TELCO_KIND_BADGE_CLASS: Record<TelcoKindCode, string> = {
  '0': 'text-gray-600 bg-gray-100', // 공통
  '1': 'text-amber-700 bg-amber-50', // KT
  '2': 'text-purple-600 bg-purple-50', // SKT
  '3': 'text-red-600 bg-red-50', // LGU+
};
const DEFAULT_BADGE_CLASS = 'text-gray-500 bg-gray-100';
const BADGE_CLASS = 'text-[13px] leading-[13px] font-medium !h-6';

export default function IvrAinDnis() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const initTenantId = searchParams.get('tenantId') ? Number(searchParams.get('tenantId')) : null;

  // ─── State ──────────────────────────────────────────────────────────────
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(initTenantId);
  const [searchText, setSearchText] = useState('');

  // ─── Refs (Drawers/Dialogs) ─────────────────────────────────────────────
  const sheetRef = useRef<IvrAinDnisSheetRef>(null);
  const importModalRef = useRef<FileImportModalRef>(null);
  const importResultModalRef = useRef<IvrAinDnisImportResultModalRef>(null);
  const gridRef = useRef<AgGridReact<IrAinMaster>>(null);
  // 신규 등록 직후 그 행으로 스크롤/선택하기 위한 대기 rowId (getRowId 키와 동일 포맷)
  const pendingFocusRowIdRef = useRef<string | null>(null);

  // ─── Queries ────────────────────────────────────────────────────────────
  const { data: tenants = [] } = useGetTenants();

  const { data: rows = [], isLoading: isListLoading } = useGetAinList({
    params: selectedTenantId !== null ? { tenantId: selectedTenantId } : undefined,
    queryOptions: { enabled: selectedTenantId !== null },
  });

  // ─── Derived ────────────────────────────────────────────────────────────
  const isSearching = searchText.trim().length > 0;

  const selectedTenant = useMemo(() => tenants.find((t) => t.tenantId === selectedTenantId) ?? null, [tenants, selectedTenantId]);

  // 테넌트별 건수를 한 번에 집계하는 API가 없어(선택된 테넌트 것만 조회) count 없이 표시.
  const tenantTabItems: TabBarItem<number>[] = useMemo(() => tenants.map((tenant) => ({ id: tenant.tenantId, label: tenant.tenantName, icon: Building2 })), [tenants]);

  const filteredRows = useMemo(() => {
    if (!isSearching) return rows;
    const kw = searchText.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.ainNo.toLowerCase().includes(kw) ||
        r.originDnis.toLowerCase().includes(kw) ||
        r.originDnisName.toLowerCase().includes(kw) ||
        (r.dnisDesc ?? '').toLowerCase().includes(kw),
    );
  }, [rows, isSearching, searchText]);

  // 진입 시 첫 테넌트 자동 선택
  useEffect(() => {
    if (selectedTenantId === null && tenants.length > 0) {
      setSelectedTenantId(tenants[0].tenantId);
    }
  }, [tenants, selectedTenantId]);

  // ─── Invalidation ──────────────────────────────────────────────────────
  const invalidateList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ivrAinDnisQueryKeys.getList._def });
  }, [queryClient]);

  // 신규 등록 성공: 목록 갱신 + 새 행을 선택/스크롤(SkillAssignList ensureNodeVisible 패턴)
  const handleSheetSuccess = useCallback(
    (created?: IrAinMaster) => {
      invalidateList();
      if (created) {
        setSelectedTenantId(created.tenantId); // 다른 테넌트에 등록됐어도 그 목록으로 전환
        setSearchText(''); // 검색 필터에 가려지지 않도록 해제
        pendingFocusRowIdRef.current = `${created.tenantId}__${created.ainNo}__${created.originDnis}`;
      }
    },
    [invalidateList],
  );

  // 목록이 갱신되어 새 행이 그리드에 반영되면 그 행으로 스크롤/선택(1회)
  useEffect(() => {
    const rowId = pendingFocusRowIdRef.current;
    if (rowId == null) return;
    if (!filteredRows.some((r) => `${r.tenantId}__${r.ainNo}__${r.originDnis}` === rowId)) return;
    pendingFocusRowIdRef.current = null;
    setTimeout(() => {
      const api = gridRef.current?.api;
      const node = api?.getRowNode(rowId);
      if (api && node) {
        api.ensureNodeVisible(node, 'middle'); // 새 행으로 스크롤
        api.flashCells({ rowNodes: [node] }); // 선택 상태 변경 없이 잠깐 강조(기존 동작 무영향)
      }
    }, 100);
  }, [filteredRows]);

  // ─── Mutations ─────────────────────────────────────────────────────────
  const { mutate: deleteAin } = useDeleteAin({
    mutationOptions: {
      onSuccess: () => {
        toast.success('대표번호 DNIS가 삭제되었습니다.');
        invalidateList();
      },
      onError: (err: unknown) => {
        const msg = (err as { message?: string })?.message ?? '삭제에 실패했습니다.';
        toast.error(msg);
      },
    },
  });

  const { mutate: exportAinDnis, isPending: isExporting } = useExportAinDnis();

  const { mutate: importAinDnis, isPending: isImporting } = useImportAinDnis({
    mutationOptions: {
      onSuccess: (result) => {
        importModalRef.current?.close();
        importResultModalRef.current?.open(result as ExcelImportResult);
        invalidateList();
      },
      onError: (err: unknown) => {
        const msg = (err as { message?: string })?.message ?? '가져오기에 실패했습니다.';
        toast.error(msg);
      },
    },
  });

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleTenantSelect = (tenantId: number) => {
    setSelectedTenantId(tenantId);
    setSearchText('');
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const handleCreate = () => {
    if (!selectedTenant) {
      toast.warning('테넌트를 먼저 선택해주세요.');
      return;
    }
    sheetRef.current?.open(undefined, {
      tenantId: selectedTenant.tenantId,
      tenantName: selectedTenant.tenantName,
    });
  };

  const handleEdit = useCallback((row: IrAinMaster) => {
    sheetRef.current?.open({
      ...row,
      tenantName: row.tenantName ?? '',
    });
  }, []);

  const handleDelete = useCallback(
    (row: IrAinMaster) => {
      modal.confirm.execute({
        onOk: () =>
          deleteAin({
            tenantId: row.tenantId,
            ainNo: row.ainNo,
            originDnis: row.originDnis,
          }),
        options: {
          title: '대표번호 DNIS 삭제',
          content: `대표번호 "${row.ainNo}" / DNIS "${row.originDnis}" 행을 삭제하시겠습니까?`,
        },
      });
    },
    [modal, deleteAin],
  );

  const handleExport = () => {
    if (!selectedTenant) {
      toast.warning('테넌트를 먼저 선택해주세요.');
      return;
    }
    exportAinDnis({ tenantId: selectedTenant.tenantId });
  };

  const handleImport = () => {
    if (!selectedTenant) {
      toast.warning('테넌트를 먼저 선택해주세요.');
      return;
    }
    importModalRef.current?.open();
  };

  const handleImportConfirm = (files: File[]) => {
    if (!selectedTenant) return;
    const file = files[0];
    if (!file) return;
    importAinDnis({ params: { tenantId: selectedTenant.tenantId }, data: file });
  };

  // ─── ag-Grid columns ───────────────────────────────────────────────────
  const columnDefs: ColDef<IrAinMaster>[] = useMemo(
    () => [
      {
        headerName: '통신사',
        field: 'telcoKind',
        width: 100,
        cellRenderer: (params: ICellRendererParams<IrAinMaster>) => {
          const code = params.data?.telcoKind as TelcoKindCode | undefined;
          if (!code) return '-';
          return <Badge className={cn(BADGE_CLASS, TELCO_KIND_BADGE_CLASS[code] ?? DEFAULT_BADGE_CLASS)}>{TELCO_KIND_LABELS[code]}</Badge>;
        },
        ...codeFilter<IrAinMaster>('telcoKind', TELCO_KIND_LABELS),
      },
      {
        headerName: '지능망 대표번호',
        field: 'ainNo',
        flex: 1.5,
        minWidth: 160,
      },
      {
        headerName: 'DNIS',
        field: 'originDnis',
        width: 140,
      },
      {
        headerName: 'DNIS명',
        field: 'originDnisName',
        flex: 2,
        minWidth: 180,
      },
      {
        headerName: '설명',
        field: 'dnisDesc',
        flex: 2.5,
        minWidth: 220,
        cellRenderer: (params: ICellRendererParams<IrAinMaster>) => params.data?.dnisDesc ?? '-',
      },
      {
        headerName: '작업일시',
        field: 'workTime',
        width: 160,
        cellRenderer: (params: ICellRendererParams<IrAinMaster>) => {
          const t = params.data?.workTime;
          if (!t) return '-';
          // ISO를 보기 좋게 변환 (YYYY-MM-DD HH:mm)
          return t.replace('T', ' ').slice(0, 16);
        },
      },
      {
        headerName: '',
        colId: 'actions',
        maxWidth: 50,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams<IrAinMaster>) => {
          if (!params.data) return null;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(params.data!);
              }}
            >
              <Trash2 className="size-4 text-red-500 hover:cursor-pointer" />
            </button>
          );
        },
      },
    ],
    [handleDelete],
  );

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단 박스: 테넌트 탭 바 + 4버튼 ===== */}
        <TabBar<number>
          items={tenantTabItems}
          selectedId={selectedTenantId}
          onSelect={handleTenantSelect}
          rightContent={
            <>
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="대표번호/DNIS/이름 검색"
                value={searchText}
                onChange={handleSearchChange}
                style={{ width: 220 }}
              />
              <Button color="cyan" variant="solid" icon={<Download className="size-3.5" />} onClick={handleExport} loading={isExporting}>
                내보내기
              </Button>
              <Button variant="solid" icon={<Upload className="size-3.5" />} onClick={handleImport}>
                가져오기
              </Button>
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
                추가
              </Button>
            </>
          }
        />

        {/* ===== 하단 박스: ag-Grid ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-[#405189]" />
              <h3 className="text-sm font-semibold text-gray-800">대표번호별 DNIS관리{selectedTenant && <span className="text-[#405189]"> — {selectedTenant.tenantName}</span>}</h3>
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">{filteredRows.length}건</span>
            </div>
          </div>
          <div className="border-t border-gray-200" />

          <div className="flex-1 flex flex-col min-h-0 p-5">
            {selectedTenant === null ? (
              <div className="flex flex-1 flex-col items-center justify-center text-gray-400 gap-3">
                <Empty description={false} />
                <span className="text-sm">테넌트를 선택하면 대표번호 DNIS 목록을 확인할 수 있습니다</span>
              </div>
            ) : (
              <AgGridReact<IrAinMaster>
                ref={gridRef}
                rowData={filteredRows}
                columnDefs={columnDefs}
                gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                loading={isListLoading}
                getRowId={(p) => `${p.data.tenantId}__${p.data.ainNo}__${p.data.originDnis}`}
                defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
                onRowDoubleClicked={(e) => {
                  if (e.data) handleEdit(e.data);
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ===== Drawer / Modal ===== */}
      <IvrAinDnisSheet ref={sheetRef} onSuccess={handleSheetSuccess} />
      <FileImportModal ref={importModalRef} title="대표번호별 DNIS 엑셀 가져오기" accept=".xlsx,.xls" onConfirm={handleImportConfirm} confirmLoading={isImporting} />
      <IvrAinDnisImportResultModal ref={importResultModalRef} />
    </div>
  );
}
