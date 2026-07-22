/**
 * 대표번호별 DNIS 관리 페이지 (IPR20S6043).
 *
 * 레이아웃 (회선관리 Full Grid 패턴, SleeConfigList/DnisPage 와 동일한 운영자모드 스코프 관례):
 *  - 상단 박스: 운영자모드 테넌트 스코프(ScopeSelect) + 우측 [검색 / 내보내기 / 가져오기 / 추가]
 *  - 하단 박스: ag-Grid (건수 표시 + "전체" 스코프에서만 테넌트 컬럼 노출)
 *
 * 테넌트 스코프:
 *  - 비운영자: 항상 자신의 테넌트로 스코프(선택 UI 없음, 서버가 JWT 테넌트로 판정)
 *  - 운영자·대행(actAsTenantId=X): 그 테넌트로 스코프
 *  - 운영자·전체(actAsTenantId=null): tenantId 파라미터 생략 — 서버가 TenantContext.isViewAllTenants() 로 전 테넌트 조회
 *  - 추가/내보내기/가져오기는 대상 테넌트가 하나로 확정돼야 하므로 "전체" 스코프에서는 비활성.
 *
 * 더블클릭 → 수정 Drawer / [+ 추가] → 등록 Drawer (선택 테넌트 자동 주입)
 * 엑셀 내보내기/가져오기는 백엔드 위임 — 클라이언트는 multipart 업로드만 담당.
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Input } from 'antd';
import { Download, Phone, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import IvrAinDnisImportResultModal, { type IvrAinDnisImportResultModalRef } from '../../features/ivr-ain-dnis/components/IvrAinDnisImportResultModal';
import IvrAinDnisSheet, { type IvrAinDnisSheetRef } from '../../features/ivr-ain-dnis/components/IvrAinDnisSheet';
import { ivrAinDnisQueryKeys, useDeleteAin, useExportAinDnis, useGetAinList, useImportAinDnis } from '../../features/ivr-ain-dnis/hooks/useIvrAinDnisQueries';
import { type ExcelImportResult, type IrAinMaster, TELCO_KIND_LABELS, type TelcoKindCode } from '../../features/ivr-ain-dnis/types';
import FileImportModal, { type FileImportModalRef } from '@/components/custom/FileImportModal';
import ScopeSelect from '@/components/custom/ScopeSelect';
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
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  // 운영자 모드(통합운영) — 시스템 관리자가 헤더 TenantChip 에서 진입. SleeConfigList/DnisPage 와 동일한 전역 스코프 관례.
  //  - 전체(actAsTenantId=null): tenantId 파라미터 생략 → 서버가 TenantContext.isViewAllTenants() 로 전 테넌트 조회
  //  - 대행(actAsTenantId=X): 그 테넌트로 스코프
  //  - 비운영자: 헤더 미주입 → 서버가 JWT 테넌트 기준으로 자신의 매핑만 반환
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const actAsTenantId = useOperatorScopeStore((s) => s.actAsTenantId);
  const setActAsTenant = useOperatorScopeStore((s) => s.setActAsTenant);
  const myTenantId = useAuthStore((s) => s.userInfo?.tenant ?? null);
  const myTenantName = useAuthStore((s) => s.userInfo?.tenantName ?? null);
  const availableTenants = useAuthStore((s) => s.userInfo?.availableTenants ?? []);

  // ─── State ──────────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');

  // ─── Refs (Drawers/Dialogs) ─────────────────────────────────────────────
  const sheetRef = useRef<IvrAinDnisSheetRef>(null);
  const importModalRef = useRef<FileImportModalRef>(null);
  const importResultModalRef = useRef<IvrAinDnisImportResultModalRef>(null);
  const gridRef = useRef<AgGridReact<IrAinMaster>>(null);
  // 신규 등록 직후 그 행으로 스크롤/선택하기 위한 대기 rowId (getRowId 키와 동일 포맷)
  const pendingFocusRowIdRef = useRef<string | null>(null);

  // "전체" 스코프 여부 — 운영자모드이면서 대행 테넌트를 지정하지 않은 상태.
  const isViewAll = operatorMode && actAsTenantId === null;
  // 조회 스코프 — 운영자: 대행 테넌트(없으면 전체=null) / 비운영자: 항상 내 테넌트(서버가 JWT로도 동일 판정하지만 명시).
  const scopedTenantId = operatorMode ? actAsTenantId : myTenantId;
  const queryTenantId = scopedTenantId ? Number(scopedTenantId) : null;
  // 추가/내보내기/가져오기 대상 테넌트 — "전체" 스코프에서는 대상이 모호해 null(버튼 비활성).
  const writeTargetTenantId = queryTenantId;
  const writeTargetTenantName = useMemo(() => {
    if (scopedTenantId === myTenantId) return myTenantName;
    return availableTenants.find((t) => String(t.tenantId) === scopedTenantId)?.tenantName ?? null;
  }, [scopedTenantId, myTenantId, myTenantName, availableTenants]);

  // ─── Queries ────────────────────────────────────────────────────────────
  const { data: rows = [], isLoading: isListLoading } = useGetAinList({
    params: queryTenantId !== null ? { tenantId: queryTenantId } : undefined,
  });

  // ─── Derived ────────────────────────────────────────────────────────────
  const isSearching = searchText.trim().length > 0;

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

  // ─── Invalidation ──────────────────────────────────────────────────────
  const invalidateList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ivrAinDnisQueryKeys.getList._def });
  }, [queryClient]);

  // 신규 등록 성공: 목록 갱신 + 새 행을 선택/스크롤(SkillAssignList ensureNodeVisible 패턴)
  // 등록은 항상 현재 선택된 테넌트에 반영되므로 테넌트 전환은 불필요.
  const handleSheetSuccess = useCallback(
    (created?: IrAinMaster) => {
      invalidateList();
      if (created) {
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
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const handleCreate = () => {
    if (!writeTargetTenantId || !writeTargetTenantName) {
      toast.warning('테넌트를 먼저 선택해주세요.');
      return;
    }
    sheetRef.current?.open(undefined, {
      tenantId: writeTargetTenantId,
      tenantName: writeTargetTenantName,
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
    if (!writeTargetTenantId) {
      toast.warning('테넌트를 먼저 선택해주세요.');
      return;
    }
    exportAinDnis({ tenantId: writeTargetTenantId });
  };

  const handleImport = () => {
    if (!writeTargetTenantId) {
      toast.warning('테넌트를 먼저 선택해주세요.');
      return;
    }
    importModalRef.current?.open();
  };

  const handleImportConfirm = (files: File[]) => {
    if (!writeTargetTenantId) return;
    const file = files[0];
    if (!file) return;
    importAinDnis({ params: { tenantId: writeTargetTenantId }, data: file });
  };

  // ─── ag-Grid columns ───────────────────────────────────────────────────
  const columnDefs: ColDef<IrAinMaster>[] = useMemo(
    () => [
      {
        headerName: '테넌트',
        field: 'tenantName',
        flex: 1.2,
        minWidth: 110,
        hide: !isViewAll,
        cellRenderer: (params: ICellRendererParams<IrAinMaster>) => params.data?.tenantName ?? '-',
      },
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
    [handleDelete, isViewAll],
  );

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단 박스: 운영자모드 테넌트 스코프 + 4버튼 ===== */}
        <div className="bg-white bt-shadow flex-shrink-0 px-5 h-[56px]">
          <header className="flex items-center gap-2 flex-wrap h-full">
            {operatorMode && (
              <ScopeSelect
                kind="tenant"
                options={availableTenants.map((t) => ({ id: t.tenantId, name: t.tenantName }))}
                value={actAsTenantId}
                onChange={(id) => {
                  setActAsTenant(id);
                  setSearchText('');
                }}
              />
            )}
            <div className="ml-auto flex items-center gap-2">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="대표번호/DNIS/이름 검색"
                value={searchText}
                onChange={handleSearchChange}
                style={{ width: 220 }}
              />
              <Button
                variant="solid"
                icon={<Upload className="size-3.5" />}
                onClick={handleImport}
                disabled={!writeTargetTenantId}
                title={isViewAll ? '테넌트를 선택하세요' : undefined}
              >
                Import
              </Button>
              <Button
                color="cyan"
                variant="solid"
                icon={<Download className="size-3.5" />}
                onClick={handleExport}
                loading={isExporting}
                disabled={!writeTargetTenantId}
                title={isViewAll ? '테넌트를 선택하세요' : undefined}
              >
                Export
              </Button>
              <Button
                type="primary"
                icon={<Plus className="size-3.5" />}
                onClick={handleCreate}
                disabled={!writeTargetTenantId}
                title={isViewAll ? '테넌트를 선택하세요' : undefined}
              >
                추가
              </Button>
            </div>
          </header>
        </div>

        {/* ===== 하단 박스: ag-Grid ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-[#405189]" />
              <h3 className="text-sm font-semibold text-gray-800">대표번호별 DNIS관리</h3>
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">{filteredRows.length}건</span>
            </div>
          </div>
          <div className="border-t border-gray-200" />

          <div className="flex-1 flex flex-col min-h-0 p-5">
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
