/**
 * IVR 멘트파일 목록 페이지 (AS-IS IPR30S3020).
 *
 * <p>레이아웃 — IvrAinDnis 패턴 복제 (테넌트 탭 제거, 다중선택 + 일괄적용 추가).</p>
 * <ul>
 *   <li>상단 박스: 제목 + 검색 + 일괄적용 + 추가</li>
 *   <li>하단 박스: ag-Grid (다중선택 체크박스 + 작업일시 + 액션 컬럼)</li>
 * </ul>
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, SelectionChangedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Input, Tag } from 'antd';
import { CheckCircle, Download, FilePlus2, History, Pause, Play, Plus, Search, Upload as UploadIcon, XCircle } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import MentFileApplyModal, { type MentFileApplyModalRef } from '../../features/mentfile/components/MentFileApplyModal';
import MentFileBatchSheet, { type MentFileBatchSheetRef } from '../../features/mentfile/components/MentFileBatchSheet';
import MentFileHistoryModal, { type MentFileHistoryModalRef } from '../../features/mentfile/components/MentFileHistoryModal';
import MentFileSheet, { type MentFileSheetRef } from '../../features/mentfile/components/MentFileSheet';
import { useMentFilePlayer } from '../../features/mentfile/hooks/useMentFilePlayer';
import { mentFileQueryKeys, useDeleteMentFile, useExportMentFiles, useGetMentFiles } from '../../features/mentfile/hooks/useMentFileQueries';
import type { MentFile } from '../../features/mentfile/types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '시나리오 관리' }, { title: '멘트파일', path: '/ivr/scenario/mentfile' }];

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
  const [searchText, setSearchText] = useState('');
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

  // ─── Derived ────────────────────────────────────────────────────────────
  const isSearching = searchText.trim().length > 0;

  const filteredRows = useMemo(() => {
    if (!isSearching) return rows;
    const kw = searchText.trim().toLowerCase();
    return rows.filter((r) => r.mentFile?.toLowerCase().includes(kw) || r.mentName?.toLowerCase().includes(kw) || (r.mentDesc ?? '').toLowerCase().includes(kw));
  }, [rows, isSearching, searchText]);

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
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value);

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
        headerName: '재생',
        colId: 'play',
        width: 60,
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
              className={`flex items-center justify-center w-6 h-6 rounded-full border ${
                isPlaying ? 'border-[#405189] bg-[#405189] text-white' : 'border-slate-300 text-slate-600 hover:border-[#405189] hover:text-[#405189]'
              }`}
              aria-label={isPlaying ? '정지' : '재생'}
            >
              {isPlaying ? <Pause className="size-3" /> : <Play className="size-3 ml-[1px]" />}
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
        flex: 1.5,
        minWidth: 180,
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
        cellRenderer: (params: ICellRendererParams<MentFile>) =>
          params.data?.fileApplyYn === 1 ? (
            <Tag color="green" icon={<CheckCircle className="size-3 inline" />}>
              적용
            </Tag>
          ) : (
            <Tag color="default" icon={<XCircle className="size-3 inline" />}>
              미적용
            </Tag>
          ),
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
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(params.data!);
              }}
              aria-label="삭제"
            >
              <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
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
        {/* ===== 상단 박스: 제목 + 검색 + 일괄적용 + 추가 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-stretch bg-white pr-3 flex-shrink-0 h-[56px]">
            <div className="flex items-center px-5">
              <span className="text-[14px] font-semibold text-slate-800">
                멘트파일
                <span className="text-[11px] text-slate-400 ml-1.5 font-normal">{rows.length}개</span>
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2 flex-shrink-0 pl-3 self-center">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="멘트명/파일명/설명 검색"
                value={searchText}
                onChange={handleSearchChange}
                style={{ width: 240 }}
              />
              <Button color="purple" variant="solid" icon={<UploadIcon className="size-3.5" />} disabled={checkedIds.length === 0} onClick={handleApply}>
                일괄적용{checkedIds.length > 0 ? ` (${checkedIds.length})` : ''}
              </Button>
              <Button color="blue" variant="filled" icon={<History className="size-3.5" />} onClick={() => historyModalRef.current?.open({ checkedMentfileIds: checkedIds })}>
                이력{checkedIds.length > 0 ? ` (${checkedIds.length}건 선택)` : ''}
              </Button>
              <Button color="cyan" variant="solid" icon={<Download className="size-3.5" />} loading={isExporting} onClick={handleExport}>
                Excel
              </Button>
              <Button variant="solid" icon={<FilePlus2 className="size-3.5" />} onClick={handleBatchCreate}>
                다량추가
              </Button>
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
                추가
              </Button>
            </div>
          </div>
        </div>

        {/* ===== 하단 박스: ag-Grid ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <span className="text-sm font-semibold text-gray-800">
              멘트파일 목록
              <span className="text-gray-400 font-normal ml-1.5">({filteredRows.length}건)</span>
            </span>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <AgGridReact<MentFile>
              rowData={filteredRows}
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
