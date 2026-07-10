/**
 * IVR 멘트파일 목록 페이지 (AS-IS IPR30S3020).
 *
 * <p>레이아웃 — 별도 검색 UI 없이 그리드 자체 컬럼 filter로 대체. 박스 하나로 통합
 * (3단 목록 화면 하단 그리드 표준 — add-grid 스킬 5-1): 헤더 좌측에 아이콘+제목+카운트 배지,
 * 우측에 이력/추가/다량추가/일괄적용/Export 액션, border-t 구분선, 그리드 래퍼 p-5.</p>
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, SelectionChangedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button } from 'antd';
import { Download, FilePlus2, History, PlayCircle, Plus, StopCircle, Trash2, Upload as UploadIcon, Volume2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import MentFileApplyModal, { type MentFileApplyModalRef } from '../../features/mentfile/components/MentFileApplyModal';
import MentFileBatchSheet, { type MentFileBatchSheetRef } from '../../features/mentfile/components/MentFileBatchSheet';
import MentFileHistoryModal, { type MentFileHistoryModalRef } from '../../features/mentfile/components/MentFileHistoryModal';
import MentFileSheet, { type MentFileSheetRef } from '../../features/mentfile/components/MentFileSheet';
import { useMentFilePlayer } from '../../features/mentfile/hooks/useMentFilePlayer';
import { mentFileQueryKeys, useDeleteMentFile, useExportMentFiles, useGetMentFiles } from '../../features/mentfile/hooks/useMentFileQueries';
import type { MentFile } from '../../features/mentfile/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '시나리오 관리' }, { title: '멘트파일', path: '/ivr/scenario/mentfile' }];

/** 그리드 안 상태값 배지 표준(add-grid 스킬 참조) — Record 색상 맵 + shadcn Badge. */
const FILE_APPLY_BADGE_CLASS: Record<number, string> = {
  1: 'text-emerald-600 bg-emerald-50',
};
const DEFAULT_BADGE_CLASS = 'text-gray-500 bg-gray-100';
const BADGE_CLASS = 'text-[13px] leading-[13px] font-medium !h-6';

export default function MentFileList() {
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  // ─── State ──────────────────────────────────────────────────────────────
  const [checkedIds, setCheckedIds] = useState<number[]>([]);

  // ─── Refs ─────────────────────────────────────────────────────────────
  const sheetRef = useRef<MentFileSheetRef>(null);
  const batchSheetRef = useRef<MentFileBatchSheetRef>(null);
  const applyModalRef = useRef<MentFileApplyModalRef>(null);
  const historyModalRef = useRef<MentFileHistoryModalRef>(null);

  // ─── 재생 hook (단일 재생 보장) ─────────────────────────────────────────
  const { playingId, toggle: togglePlay } = useMentFilePlayer();

  // ─── Queries ────────────────────────────────────────────────────────────
  const { data: rows = [], isLoading: isListLoading } = useGetMentFiles();

  // ─── Invalidation ──────────────────────────────────────────────────────
  const invalidateList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: mentFileQueryKeys.list.queryKey });
  }, [queryClient]);

  // ─── Mutations ─────────────────────────────────────────────────────────
  const { mutate: deleteMentFile } = useDeleteMentFile({
    mutationOptions: {
      onSuccess: () => {
        toast.success('멘트파일이 삭제되었습니다.');
        invalidateList();
      },
      onError: (err: unknown) => {
        const msg = (err as { message?: string })?.message ?? '삭제에 실패했습니다.';
        toast.error(msg);
      },
    },
  });

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleCreate = () => sheetRef.current?.openCreate();
  const handleBatchCreate = () => batchSheetRef.current?.open();

  const { mutate: exportExcel, isPending: isExporting } = useExportMentFiles();
  const handleExport = () => {
    if (rows.length === 0) {
      toast.warning('내보낼 데이터가 없습니다.');
      return;
    }
    exportExcel(undefined);
  };

  const handleEdit = useCallback((row: MentFile) => {
    sheetRef.current?.openEdit(row);
  }, []);

  const handleDelete = useCallback(
    (row: MentFile) => {
      modal.confirm.delete({
        onOk: () => deleteMentFile({ mentfileId: row.mentfileId }),
        options: {
          title: '멘트파일 삭제',
          content: `"${row.mentName}" 멘트파일을 삭제하시겠습니까?`,
        },
      });
    },
    [modal, deleteMentFile],
  );

  const handleApply = () => {
    if (checkedIds.length === 0) {
      toast.warning('적용할 멘트파일을 선택하세요.');
      return;
    }
    applyModalRef.current?.open(checkedIds);
  };

  const handleSelectionChanged = useCallback((e: SelectionChangedEvent<MentFile>) => {
    const ids = e.api.getSelectedRows().map((r) => r.mentfileId);
    setCheckedIds(ids);
  }, []);

  // ─── ag-Grid columns ───────────────────────────────────────────────────
  // ※ 체크박스 컬럼은 rowSelection.checkboxes=true 가 자동 생성하므로 명시 X (중복 방지)
  const columnDefs: ColDef<MentFile>[] = useMemo(
    () => [
      {
        headerName: '',
        colId: 'play',
        width: 50,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        pinned: 'left',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams<MentFile>) => {
          const row = params.data;
          if (!row?.mentFile) return null;
          const isPlaying = playingId === row.mentfileId;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay(row.mentfileId);
              }}
              className={cn('flex items-center justify-center transition-colors', isPlaying ? 'text-red-500 hover:text-red-700' : 'text-blue-500 hover:text-blue-700')}
              aria-label={isPlaying ? '정지' : '재생'}
            >
              {isPlaying ? <StopCircle size={18} /> : <PlayCircle size={18} />}
            </button>
          );
        },
      },
      {
        headerName: '멘트명',
        field: 'mentName',
        flex: 1.5,
        minWidth: 160,
      },
      {
        headerName: '파일명',
        field: 'mentFile',
        flex: 1.5,
        minWidth: 180,
      },
      {
        headerName: '설명',
        field: 'mentDesc',
        flex: 2,
        minWidth: 200,
        cellRenderer: (params: ICellRendererParams<MentFile>) => params.data?.mentDesc ?? '-',
      },
      {
        headerName: 'EMS 경로',
        field: 'emsFilePath',
        minWidth: 160,
        tooltipField: 'emsFilePath',
      },
      {
        headerName: 'IR 경로',
        field: 'irFilePath',
        width: 160,
        tooltipField: 'irFilePath',
      },
      {
        headerName: '적용',
        field: 'fileApplyYn',
        width: 90,
        cellRenderer: (params: ICellRendererParams<MentFile>) => {
          const yn = params.data?.fileApplyYn ?? 0;
          return <Badge className={cn(BADGE_CLASS, FILE_APPLY_BADGE_CLASS[yn] ?? DEFAULT_BADGE_CLASS)}>{yn === 1 ? '적용' : '미적용'}</Badge>;
        },
      },
      {
        headerName: '작업자',
        field: 'workUserName',
        width: 110,
      },
      {
        headerName: '작업일시',
        field: 'workTime',
        width: 160,
        cellRenderer: (params: ICellRendererParams<MentFile>) => {
          const t = params.data?.workTime;
          if (!t) return '-';
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
        cellRenderer: (params: ICellRendererParams<MentFile>) => {
          if (!params.data) return null;
          return (
            <button
              type="button"
              title="삭제"
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
    [handleDelete, playingId, togglePlay],
  );

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== ag-Grid 박스 (3단 목록 화면 하단 그리드 표준 — add-grid 스킬 5-1) ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Volume2 className="size-4 text-[#405189]" />
              <h3 className="text-sm font-semibold text-gray-800">멘트파일 목록</h3>
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">{rows.length}개</span>
            </div>
            <div className="flex items-center gap-2">
              <Button color="blue" variant="filled" icon={<History className="size-3.5" />} onClick={() => historyModalRef.current?.open({ checkedMentfileIds: checkedIds })}>
                이력{checkedIds.length > 0 ? ` (${checkedIds.length}건 선택)` : ''}
              </Button>
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
                추가
              </Button>
              <Button variant="solid" icon={<FilePlus2 className="size-3.5" />} onClick={handleBatchCreate}>
                다량추가
              </Button>
              <Button color="purple" variant="solid" icon={<UploadIcon className="size-3.5" />} disabled={checkedIds.length === 0} onClick={handleApply}>
                일괄적용{checkedIds.length > 0 ? ` (${checkedIds.length})` : ''}
              </Button>
              <Button color="cyan" variant="solid" icon={<Download className="size-3.5" />} loading={isExporting} onClick={handleExport}>
                Export
              </Button>
            </div>
          </div>
          <div className="border-t border-gray-200" />

          <div className="flex-1 flex flex-col min-h-0 p-5">
            <AgGridReact<MentFile>
              rowData={rows}
              columnDefs={columnDefs}
              gridOptions={{
                ...gridOptions,
                statusBar: undefined,
                pagination: false,
                sideBar: false,
                rowSelection: { mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: false },
              }}
              loading={isListLoading}
              getRowId={(p) => String(p.data.mentfileId)}
              defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
              onSelectionChanged={handleSelectionChanged}
              onRowDoubleClicked={(e) => {
                if (e.data) handleEdit(e.data);
              }}
            />
          </div>
        </div>
      </div>

      {/* ===== Drawer / Modal ===== */}
      <MentFileSheet ref={sheetRef} />
      <MentFileBatchSheet ref={batchSheetRef} />
      <MentFileApplyModal ref={applyModalRef} />
      <MentFileHistoryModal ref={historyModalRef} />
    </div>
  );
}
