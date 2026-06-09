/**
 * 환경변수 백업 비교/복구 Drawer (AS-IS IPR30S3030SA + IPR30S3030RA 통합).
 *
 * <p>흐름:</p>
 * <ol>
 *   <li>{@code open(payload)} → 해당 백업의 USERCONFIG 현재값 vs BK_DATA 비교</li>
 *   <li>ag-Grid 에 category/property/현재값/백업값/변경 태그 표시 (변경된 row 강조)</li>
 *   <li>[복구] 버튼 → confirm → restore mutation → onSuccess 시 호출자 invalidate</li>
 * </ol>
 *
 * <p>권한: 복구는 ivr:ivr-slee-config:apply (BE 가 강제 — 클라이언트 차단 없음).</p>
 */
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Drawer, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { Undo2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetBackupCompare, useRestoreBackup } from '../hooks/useSleeConfigQueries';
import type { SleeConfigBackupCompareRow } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface OpenPayload {
  tenantId: number;
  configFile: string;
  backupListId: number;
  workTime: string | null;
  workUserName: string | null;
}

export interface BackupCompareDrawerRef {
  open: (payload: OpenPayload) => void;
  close: () => void;
}

interface Props {
  /** 복구 성공 후 호출 — 호출자가 환경파일/카테고리/속성/백업헤더 invalidate */
  onRestoreSuccess?: () => void;
}

const BackupCompareDrawer = forwardRef<BackupCompareDrawerRef, Props>(({ onRestoreSuccess }, ref) => {
  const { gridOptions } = useAggridOptions();
  const modal = useModal();

  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<OpenPayload | null>(null);

  // ─── 비교 데이터 ────────────────────────────────────────────────────────
  const compareParams = useMemo(() => (payload ? { backupListId: payload.backupListId, tenantId: payload.tenantId, configFile: payload.configFile } : undefined), [payload]);

  const { data: rows = [], isFetching } = useGetBackupCompare({
    params: compareParams,
    queryOptions: { enabled: visible && !!payload },
  });

  const changedCount = useMemo(() => rows.filter((r) => r.changed).length, [rows]);

  // ─── 복구 mutation ─────────────────────────────────────────────────────
  const { mutate: restoreMutate, isPending: isRestoring } = useRestoreBackup({
    mutationOptions: {
      onSuccess: (data) => {
        toast.success(`백업 복구 완료 — USERCONFIG ${data.deletedRows}건 삭제 → ${data.restoredRows}건 복원`);
        onRestoreSuccess?.();
        setVisible(false);
      },
      onError: (err: unknown) => {
        const msg = (err as { message?: string })?.message ?? '백업 복구에 실패했습니다.';
        toast.error(msg);
      },
    },
  });

  useImperativeHandle(ref, () => ({
    open: (p) => {
      setPayload(p);
      setVisible(true);
    },
    close: () => setVisible(false),
  }));

  const handleRestore = () => {
    if (!payload) return;
    modal.confirm.execute({
      options: {
        title: '백업으로 복구',
        content: (
          <div>
            <p>
              현재 환경파일 <b>"{payload.configFile}"</b> 의 USERCONFIG 를 전체 삭제하고
              <br />이 백업 시점의 데이터로 덮어씁니다.
            </p>
            <p className="text-[12px] text-slate-500 mt-2">※ 적용(apply) 권한이 필요합니다. 변경 사항이 있는 row {changedCount}건.</p>
          </div>
        ),
      },
      onOk: () =>
        restoreMutate({
          backupListId: payload.backupListId,
          tenantId: payload.tenantId,
          configFile: payload.configFile,
        }),
    });
  };

  // ─── ag-Grid columns ───────────────────────────────────────────────────
  const columnDefs: ColDef<SleeConfigBackupCompareRow>[] = useMemo(
    () => [
      {
        headerName: '변경',
        field: 'changed',
        width: 70,
        cellRenderer: (p: ICellRendererParams<SleeConfigBackupCompareRow>) => (p.data?.changed ? <Tag color="orange">변경</Tag> : <Tag>동일</Tag>),
      },
      { headerName: '카테고리', field: 'category', flex: 1, minWidth: 120 },
      { headerName: '속성', field: 'property', flex: 1, minWidth: 120 },
      {
        headerName: '현재값',
        field: 'currentValue',
        flex: 1.5,
        minWidth: 160,
        tooltipField: 'currentValue',
        cellRenderer: (p: ICellRendererParams<SleeConfigBackupCompareRow>) => p.data?.currentValue ?? <span className="text-gray-400">(없음)</span>,
      },
      {
        headerName: '백업값',
        field: 'backupValue',
        flex: 1.5,
        minWidth: 160,
        tooltipField: 'backupValue',
        cellRenderer: (p: ICellRendererParams<SleeConfigBackupCompareRow>) => p.data?.backupValue ?? <span className="text-gray-400">(없음)</span>,
      },
    ],
    [],
  );

  return (
    <Drawer
      open={visible}
      onClose={() => setVisible(false)}
      title="백업 비교"
      width={720}
      destroyOnClose
      extra={
        <Tooltip title="현재 USERCONFIG 를 이 백업으로 덮어씁니다">
          <Button type="primary" danger icon={<Undo2 className="size-3.5" />} loading={isRestoring} disabled={!payload || isFetching} onClick={handleRestore}>
            이 백업으로 복구
          </Button>
        </Tooltip>
      }
    >
      {/* 백업 정보 헤더 */}
      <div className="bg-slate-50 border border-slate-200 rounded-md p-3 mb-3 text-[12px]">
        <div className="flex items-center gap-4">
          <span>
            <span className="text-slate-500">백업 ID:</span> <b>{payload?.backupListId ?? '-'}</b>
          </span>
          <span>
            <span className="text-slate-500">백업 일시:</span> <b>{payload?.workTime ? dayjs(payload.workTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</b>
          </span>
          <span>
            <span className="text-slate-500">작업자:</span> <b>{payload?.workUserName ?? '-'}</b>
          </span>
          <span className="ml-auto">
            <span className="text-slate-500">변경된 항목:</span> <b className="text-orange-600">{changedCount}</b> / {rows.length}건
          </span>
        </div>
      </div>

      {/* 비교 그리드 */}
      <div style={{ height: 'calc(100vh - 220px)' }}>
        <AgGridReact<SleeConfigBackupCompareRow>
          rowData={rows}
          columnDefs={columnDefs}
          gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
          loading={isFetching}
          getRowId={(p) => `${p.data.category}::${p.data.property}`}
          defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true, resizable: true }}
          rowClassRules={{
            'bg-orange-50': (p) => Boolean(p.data?.changed),
          }}
        />
      </div>
    </Drawer>
  );
});

BackupCompareDrawer.displayName = 'BackupCompareDrawer';
export default BackupCompareDrawer;
