/**
 * TTS Master 탭 (IPR20S6041).
 *
 * ag-Grid Enterprise — TTS_SERVER=1 (기본) 행은 노란색 배경 + ⭐ + "기본" 배지.
 *
 * 추가/수정 Drawer는 페이지(IvrMediaPage)가 관리한다 — 본 컴포넌트는 그리드만 책임.
 * 행 더블클릭 시 `onEdit(row)` 콜백으로 페이지에 위임.
 */
import { useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Star } from 'lucide-react';
import { toast } from '@/shared-util';
import { ivrMediaQueryKeys, useDeleteTts, useGetTtsMasters } from '../hooks/useIvrMediaQueries';
import { type IrTtsMaster, TTS_TEXT_FORMAT_LABELS, TTS_VENDOR_LABELS, TTS_VOICE_FORMAT_LABELS } from '../types/ivrMedia.types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface Props {
  onEdit: (row: IrTtsMaster) => void;
  onCountChange?: (count: number) => void;
}

export default function TtsMasterTab({ onEdit, onCountChange }: Props) {
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();

  const { data: ttsMasters = [], isLoading } = useGetTtsMasters();

  useEffect(() => {
    onCountChange?.(ttsMasters.length);
  }, [ttsMasters.length, onCountChange]);

  const { mutate: deleteTts } = useDeleteTts({
    mutationOptions: {
      onSuccess: () => {
        toast.success('TTS Master가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: ivrMediaQueryKeys.getTtsMasters.queryKey });
      },
      onError: (err: unknown) => {
        toast.error((err as { message?: string })?.message ?? '삭제에 실패했습니다.');
      },
    },
  });

  const handleDelete = useCallback(
    (row: IrTtsMaster) => {
      modal.confirm.execute({
        onOk: () => deleteTts({ id: row.ttsId }),
        options: {
          title: 'TTS Master 삭제',
          content: `"${row.ttsName}" TTS Master를 삭제하시겠습니까?`,
        },
      });
    },
    [modal, deleteTts],
  );

  const columnDefs: ColDef<IrTtsMaster>[] = useMemo(
    () => [
      {
        headerName: '',
        field: 'ttsServer',
        maxWidth: 50,
        sortable: false,
        filter: false,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams<IrTtsMaster>) => {
          if (params.data?.ttsServer === 1) {
            return <Star className="size-4" style={{ color: '#faad14', fill: '#faad14' }} aria-label="기본 TTS" />;
          }
          return null;
        },
      },
      {
        headerName: 'TTS 명',
        field: 'ttsName',
        flex: 2,
        minWidth: 160,
        cellRenderer: (params: ICellRendererParams<IrTtsMaster>) => {
          if (!params.data) return null;
          const isDefault = params.data.ttsServer === 1;
          return (
            <span className="flex items-center gap-1.5">
              <span>{params.data.ttsName}</span>
              {isDefault && (
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border"
                  style={{ background: '#fffbe6', color: '#ad6800', borderColor: '#ffe58f' }}
                >
                  기본
                </span>
              )}
            </span>
          );
        },
      },
      {
        headerName: 'Vendor',
        field: 'ttsVendor',
        flex: 1,
        minWidth: 110,
        cellRenderer: (params: ICellRendererParams<IrTtsMaster>) => {
          const code = params.data?.ttsVendor;
          return code ? (TTS_VENDOR_LABELS[code] ?? code) : '-';
        },
      },
      { headerName: 'IP', field: 'ttsIp', flex: 1, minWidth: 120 },
      { headerName: 'PORT', field: 'ttsPort', maxWidth: 90 },
      { headerName: 'Backup IP', field: 'ttsBackupIp', flex: 1, minWidth: 120 },
      { headerName: 'Backup PORT', field: 'ttsBackupPort', maxWidth: 110 },
      { headerName: '기본성우ID', field: 'ttsSpkId', maxWidth: 110 },
      {
        headerName: '음성 포맷',
        field: 'ttsVoiceFormat',
        maxWidth: 100,
        cellRenderer: (params: ICellRendererParams<IrTtsMaster>) => {
          const code = params.data?.ttsVoiceFormat;
          return code ? (TTS_VOICE_FORMAT_LABELS[code] ?? code) : '-';
        },
      },
      {
        headerName: 'TEXT 포맷',
        field: 'ttsTextFormat',
        maxWidth: 100,
        cellRenderer: (params: ICellRendererParams<IrTtsMaster>) => {
          const code = params.data?.ttsTextFormat;
          return code ? (TTS_TEXT_FORMAT_LABELS[code] ?? code) : '-';
        },
      },
      {
        headerName: '작업일시',
        field: 'workTime',
        flex: 1,
        minWidth: 140,
        cellRenderer: (params: ICellRendererParams<IrTtsMaster>) => params.data?.workTime ?? '-',
      },
      {
        headerName: '',
        colId: 'actions',
        maxWidth: 60,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams<IrTtsMaster>) => {
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
    [handleDelete],
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <AgGridReact<IrTtsMaster>
        rowData={ttsMasters}
        columnDefs={columnDefs}
        gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
        loading={isLoading}
        getRowId={(params) => String(params.data.ttsId)}
        defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
        rowClassRules={{
          'bg-yellow-50': (params) => (params.data as IrTtsMaster | undefined)?.ttsServer === 1,
        }}
        onRowDoubleClicked={(e) => {
          if (e.data) onEdit(e.data);
        }}
      />
    </div>
  );
}
