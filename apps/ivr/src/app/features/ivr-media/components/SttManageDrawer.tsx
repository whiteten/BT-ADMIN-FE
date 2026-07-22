/**
 * STT Master 관리 Drawer (IPR20S6041) — 시스템 선택과 무관한 전역 마스터 목록 + 진입점.
 *
 * 목록은 STT명/기본서버 여부/IP/PORT만 간략 표시(상세 항목은 등록/수정 Drawer에서 확인).
 * [추가] 또는 행 더블클릭 시 SttMasterSheet(등록/수정 Drawer)가 중첩되어 열린다.
 */
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Drawer } from 'antd';
import { Plus, Star, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { ivrMediaQueryKeys, useDeleteStt, useGetSttMasters } from '../hooks/useIvrMediaQueries';
import type { IrSttMaster } from '../types';
import SttMasterSheet, { type SttMasterSheetRef } from './SttMasterSheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

/** 그리드 안 상태값 배지 표준(add-grid 스킬 참조). */
const DEFAULT_MARK_BADGE_CLASS = 'text-amber-700 bg-amber-50';
const BADGE_CLASS = 'text-[13px] leading-[13px] font-medium !h-6';

export interface SttManageDrawerRef {
  open: () => void;
  close: () => void;
}

const SttManageDrawer = forwardRef<SttManageDrawerRef>((_, ref) => {
  const [visible, setVisible] = useState(false);
  const { gridOptions } = useAggridOptions();
  const queryClient = useQueryClient();
  const modal = useModal();
  const sheetRef = useRef<SttMasterSheetRef>(null);

  const handleClose = () => setVisible(false);

  useImperativeHandle(ref, () => ({
    open: () => setVisible(true),
    close: handleClose,
  }));

  const { data: sttMasters = [], isLoading } = useGetSttMasters({ queryOptions: { enabled: visible } });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ivrMediaQueryKeys.getSttMasters.queryKey });

  const { mutate: deleteStt } = useDeleteStt({
    mutationOptions: {
      onSuccess: () => {
        toast.success('STT Master가 삭제되었습니다.');
        invalidate();
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
        headerName: 'STT 명',
        field: 'sttName',
        flex: 2,
        minWidth: 140,
        cellRenderer: (p: ICellRendererParams<IrSttMaster>) =>
          p.data ? (
            <span className="flex items-center gap-1.5">
              <span>{p.data.sttName}</span>
              {p.data.sttServer === 1 && <Star className="size-3.5" style={{ color: '#faad14', fill: '#faad14' }} aria-label="기본 STT" />}
            </span>
          ) : null,
      },
      {
        headerName: '기본서버',
        field: 'sttServer',
        width: 90,
        sortable: false,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (p: ICellRendererParams<IrSttMaster>) =>
          p.data?.sttServer === 1 ? <Badge className={cn(BADGE_CLASS, DEFAULT_MARK_BADGE_CLASS)}>기본</Badge> : <span className="text-gray-300">-</span>,
      },
      { headerName: 'IP', field: 'sttIp', flex: 1.5, minWidth: 120 },
      { headerName: 'PORT', field: 'sttPort', width: 90 },
      {
        headerName: '',
        colId: 'actions',
        width: 56,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (p: ICellRendererParams<IrSttMaster>) =>
          p.data ? (
            <button
              type="button"
              title="삭제"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(p.data!);
              }}
            >
              <Trash2 className="size-4 text-red-500 hover:cursor-pointer" />
            </button>
          ) : null,
      },
    ],
    [handleDelete],
  );

  return (
    <>
      <Drawer
        title="STT 관리"
        closable={{ placement: 'end' }}
        open={visible}
        onClose={handleClose}
        styles={{ wrapper: { width: 600 } }}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button onClick={handleClose}>취소</Button>
            <Button type="primary" icon={<Plus className="size-3.5" />} onClick={() => sheetRef.current?.open()}>
              추가
            </Button>
          </div>
        }
      >
        <div className="h-full">
          <AgGridReact<IrSttMaster>
            rowData={sttMasters}
            columnDefs={columnDefs}
            gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
            loading={isLoading}
            getRowId={(p) => String(p.data.sttId)}
            defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
            onRowDoubleClicked={(e) => e.data && sheetRef.current?.open(e.data)}
          />
        </div>
      </Drawer>
      <SttMasterSheet ref={sheetRef} onSuccess={invalidate} />
    </>
  );
});
SttManageDrawer.displayName = 'SttManageDrawer';
export default SttManageDrawer;
