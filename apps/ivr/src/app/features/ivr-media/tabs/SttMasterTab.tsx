/**
 * STT Master 탭 (IPR20S6041).
 *
 * ag-Grid Enterprise — STT_SERVER=1 (기본) 행은 노란색 배경 + ⭐ + "기본" 배지.
 * 추가/수정 Drawer는 페이지(IvrMediaPage)가 관리한다.
 */
import { useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Star, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { ivrMediaQueryKeys, useDeleteStt, useGetSttMasters } from '../hooks/useIvrMediaQueries';
import type { IrSttMaster } from '../types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

/** 그리드 안 상태값 배지 표준(add-grid 스킬 참조). */
const DEFAULT_MARK_BADGE_CLASS = 'text-amber-700 bg-amber-50';
const BADGE_CLASS = 'text-[13px] leading-[13px] font-medium !h-6';

interface Props {
  onEdit: (row: IrSttMaster) => void;
  onCountChange?: (count: number) => void;
}

export default function SttMasterTab({ onEdit, onCountChange }: Props) {
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();

  const { data: sttMasters = [], isLoading } = useGetSttMasters();

  useEffect(() => {
    onCountChange?.(sttMasters.length);
  }, [sttMasters.length, onCountChange]);

  const { mutate: deleteStt } = useDeleteStt({
    mutationOptions: {
      onSuccess: () => {
        toast.success('STT Master가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: ivrMediaQueryKeys.getSttMasters.queryKey });
      },
      onError: (err: unknown) => {
        toast.error((err as { message?: string })?.message ?? '삭제에 실패했습니다.');
      },
    },
  });

  const handleDelete = useCallback(
    (row: IrSttMaster) => {
      modal.confirm.execute({
        onOk: () => deleteStt({ id: row.sttId }),
        options: {
          title: 'STT Master 삭제',
          content: `"${row.sttName}" STT Master를 삭제하시겠습니까?`,
        },
      });
    },
    [modal, deleteStt],
  );

  const columnDefs: ColDef<IrSttMaster>[] = useMemo(
    () => [
      {
        headerName: '',
        field: 'sttServer',
        maxWidth: 50,
        sortable: false,
        filter: false,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams<IrSttMaster>) => {
          if (params.data?.sttServer === 1) {
            return <Star className="size-4" style={{ color: '#faad14', fill: '#faad14' }} aria-label="기본 STT" />;
          }
          return null;
        },
      },
      {
        headerName: 'STT 명',
        field: 'sttName',
        flex: 2,
        minWidth: 160,
        cellRenderer: (params: ICellRendererParams<IrSttMaster>) => {
          if (!params.data) return null;
          const isDefault = params.data.sttServer === 1;
          return (
            <span className="flex items-center gap-1.5">
              <span>{params.data.sttName}</span>
              {isDefault && <Badge className={cn(BADGE_CLASS, DEFAULT_MARK_BADGE_CLASS)}>기본</Badge>}
            </span>
          );
        },
      },
      {
        headerName: '3rd Party',
        field: 'sttInterface',
        flex: 1,
        minWidth: 110,
        valueFormatter: (params) => (params.value === 1 ? '사용' : '미사용'),
        filterValueGetter: (params) => (params.data?.sttInterface === 1 ? '사용' : '미사용'),
      },
      { headerName: 'IP', field: 'sttIp', flex: 1, minWidth: 120 },
      { headerName: 'PORT', field: 'sttPort', maxWidth: 90 },
      { headerName: 'Backup IP', field: 'sttBackupIp', flex: 1, minWidth: 120 },
      { headerName: 'Backup PORT', field: 'sttBackupPort', maxWidth: 110 },
      { headerName: 'Grammar Path', field: 'sttGrammarPath', flex: 2, minWidth: 160 },
      {
        headerName: '작업일시',
        field: 'workTime',
        flex: 1,
        minWidth: 140,
        cellRenderer: (params: ICellRendererParams<IrSttMaster>) => params.data?.workTime ?? '-',
      },
      {
        headerName: '',
        colId: 'actions',
        maxWidth: 60,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams<IrSttMaster>) => {
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
              <Trash2 className="size-4 text-red-500 hover:cursor-pointer" />
            </button>
          );
        },
      },
    ],
    [handleDelete],
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5">
      <AgGridReact<IrSttMaster>
        rowData={sttMasters}
        columnDefs={columnDefs}
        gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
        loading={isLoading}
        getRowId={(params) => String(params.data.sttId)}
        defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
        rowClassRules={{
          'bg-yellow-50': (params) => (params.data as IrSttMaster | undefined)?.sttServer === 1,
        }}
        onRowDoubleClicked={(e) => {
          if (e.data) onEdit(e.data);
        }}
      />
    </div>
  );
}
