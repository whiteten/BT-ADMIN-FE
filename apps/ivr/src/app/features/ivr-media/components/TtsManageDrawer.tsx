/**
 * TTS Master 관리 Drawer (IPR20S6041) — 시스템 선택과 무관한 전역 마스터 목록 + 진입점.
 *
 * 목록은 TTS명/기본서버 여부/IP/PORT만 간략 표시(상세 항목은 등록/수정 Drawer에서 확인).
 * [추가] 또는 행 더블클릭 시 TtsMasterSheet(등록/수정 Drawer)가 중첩되어 열린다.
 */
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Drawer } from 'antd';
import { Plus, Star, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { ivrMediaQueryKeys, useDeleteTts, useGetTtsMasters } from '../hooks/useIvrMediaQueries';
import type { IrTtsMaster } from '../types';
import TtsMasterSheet, { type TtsMasterSheetRef } from './TtsMasterSheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

/** 그리드 안 상태값 배지 표준(add-grid 스킬 참조). */
const DEFAULT_MARK_BADGE_CLASS = 'text-amber-700 bg-amber-50';
const BADGE_CLASS = 'text-[13px] leading-[13px] font-medium !h-6';

export interface TtsManageDrawerRef {
  open: () => void;
  close: () => void;
}

const TtsManageDrawer = forwardRef<TtsManageDrawerRef>((_, ref) => {
  const [visible, setVisible] = useState(false);
  const { gridOptions } = useAggridOptions();
  const queryClient = useQueryClient();
  const modal = useModal();
  const sheetRef = useRef<TtsMasterSheetRef>(null);

  const handleClose = () => setVisible(false);

  useImperativeHandle(ref, () => ({
    open: () => setVisible(true),
    close: handleClose,
  }));

  const { data: ttsMasters = [], isLoading } = useGetTtsMasters({ queryOptions: { enabled: visible } });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ivrMediaQueryKeys.getTtsMasters.queryKey });

  const { mutate: deleteTts } = useDeleteTts({
    mutationOptions: {
      onSuccess: () => {
        toast.success('TTS Master가 삭제되었습니다.');
        invalidate();
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
        headerName: 'TTS 명',
        field: 'ttsName',
        flex: 2,
        minWidth: 140,
        cellRenderer: (p: ICellRendererParams<IrTtsMaster>) =>
          p.data ? (
            <span className="flex items-center gap-1.5">
              <span>{p.data.ttsName}</span>
              {p.data.ttsServer === 1 && <Star className="size-3.5" style={{ color: '#faad14', fill: '#faad14' }} aria-label="기본 TTS" />}
            </span>
          ) : null,
      },
      {
        headerName: '기본서버',
        field: 'ttsServer',
        width: 90,
        sortable: false,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (p: ICellRendererParams<IrTtsMaster>) =>
          p.data?.ttsServer === 1 ? <Badge className={cn(BADGE_CLASS, DEFAULT_MARK_BADGE_CLASS)}>기본</Badge> : <span className="text-gray-300">-</span>,
      },
      { headerName: 'IP', field: 'ttsIp', flex: 1.5, minWidth: 120 },
      { headerName: 'PORT', field: 'ttsPort', width: 90 },
      {
        headerName: '',
        colId: 'actions',
        width: 56,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (p: ICellRendererParams<IrTtsMaster>) =>
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
        title="TTS 관리"
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
          <AgGridReact<IrTtsMaster>
            rowData={ttsMasters}
            columnDefs={columnDefs}
            gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
            loading={isLoading}
            getRowId={(p) => String(p.data.ttsId)}
            defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
            onRowDoubleClicked={(e) => e.data && sheetRef.current?.open(e.data)}
          />
        </div>
      </Drawer>
      <TtsMasterSheet ref={sheetRef} onSuccess={invalidate} />
    </>
  );
});
TtsManageDrawer.displayName = 'TtsManageDrawer';
export default TtsManageDrawer;
