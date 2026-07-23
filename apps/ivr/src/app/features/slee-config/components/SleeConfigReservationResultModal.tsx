/**
 * 예약 적용 결과 모달 (AS-IS IPR30S3030L3 / selectApplyList).
 *
 * <p>(tenant, configFile) 의 CONFIGSYSTEM 을 시스템별로 그룹핑한 예약 적용 상태/결과를 보여준다.</p>
 * <ul>
 *   <li>상태 — IR_APPLY_STATUS 코드 라벨. 예약취소(canceled)면 "예약취소" 표시(상태코드 아님).</li>
 *   <li>결과 — IR_APPLY_RESULT 코드 라벨. 예약 도래 후 2h 초과 미실행은 BE 가 "미처리(9)"로 파생.</li>
 * </ul>
 *
 * <p>공통코드명은 BE 조인 대신 코드로 내려받아 FE 가 라벨 매핑(멘트파일 이력 패턴 동일).</p>
 */
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Modal } from 'antd';
import dayjs from 'dayjs';
import { useGetApplyResults } from '../hooks/useSleeConfigQueries';
import { RT_RESV_KIND_LABELS, SLEE_APPLY_RESULT_LABELS, SLEE_APPLY_RESULT_STATUS_LABELS, type SleeConfigApplyResultRow } from '../types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { codeFilter } from '@/libs/shared-ui/src/lib/aggridCodeColumn';

const BADGE_CLASS = 'text-[13px] leading-[13px] font-medium !h-6';
const CENTER_CELL = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
const StatusBadge = ({ className, children }: { className: string; children: React.ReactNode }) => (
  <Badge variant="secondary" className={cn(BADGE_CLASS, className)}>
    {children}
  </Badge>
);

interface OpenPayload {
  tenantId: number;
  configFile: string;
}

export interface SleeConfigReservationResultModalRef {
  open: (payload: OpenPayload) => void;
  close: () => void;
}

const SleeConfigReservationResultModal = forwardRef<SleeConfigReservationResultModalRef>((_, ref) => {
  const { gridOptions } = useAggridOptions();
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<OpenPayload | null>(null);

  useImperativeHandle(ref, () => ({
    open: (p) => {
      setPayload(p);
      setVisible(true);
    },
    close: () => setVisible(false),
  }));

  const { data: rows = [], isFetching } = useGetApplyResults({
    params: payload ?? undefined,
    queryOptions: { enabled: visible && !!payload },
  });

  const columnDefs: ColDef<SleeConfigApplyResultRow>[] = useMemo(
    () => [
      { headerName: '시스템', field: 'systemName', flex: 1, minWidth: 150, valueFormatter: (p) => p.value ?? `시스템 ${p.data?.systemId ?? ''}` },
      {
        headerName: '구분',
        field: 'rtResvKind',
        width: 80,
        cellStyle: CENTER_CELL,
        cellRenderer: (p: ICellRendererParams<SleeConfigApplyResultRow>) => {
          const k = p.data?.rtResvKind;
          if (k == null) return '-';
          return <StatusBadge className={k === 1 ? 'text-blue-600 bg-blue-50' : 'text-purple-600 bg-purple-50'}>{RT_RESV_KIND_LABELS[k] ?? k}</StatusBadge>;
        },
        ...codeFilter<SleeConfigApplyResultRow>('rtResvKind', RT_RESV_KIND_LABELS),
      },
      {
        headerName: '상태',
        field: 'applyStatusCode',
        width: 120,
        cellStyle: CENTER_CELL,
        cellRenderer: (p: ICellRendererParams<SleeConfigApplyResultRow>) => {
          // 예약취소는 상태코드가 아니라 플래그 — 우선 표시 (AS-IS 동일).
          if (p.data?.canceled) return <StatusBadge className="text-gray-500 bg-gray-100">예약취소</StatusBadge>;
          const s = p.data?.applyStatusCode;
          if (s == null) return '-';
          const cls =
            s === 50
              ? 'text-emerald-600 bg-emerald-50'
              : s === 55 || s === 25 || s === 35
                ? 'text-red-500 bg-red-50'
                : s === 10
                  ? 'text-amber-600 bg-amber-50'
                  : 'text-blue-600 bg-blue-50';
          return <StatusBadge className={cls}>{SLEE_APPLY_RESULT_STATUS_LABELS[s] ?? s}</StatusBadge>;
        },
        ...codeFilter<SleeConfigApplyResultRow>('applyStatusCode', SLEE_APPLY_RESULT_STATUS_LABELS),
      },
      {
        headerName: '결과',
        field: 'applyResultCode',
        width: 100,
        cellStyle: CENTER_CELL,
        cellRenderer: (p: ICellRendererParams<SleeConfigApplyResultRow>) => {
          const r = p.data?.applyResultCode;
          if (r == null) return '-';
          const cls = r === 1 ? 'text-emerald-600 bg-emerald-50' : r === 2 ? 'text-red-500 bg-red-50' : 'text-gray-500 bg-gray-100';
          return <StatusBadge className={cls}>{SLEE_APPLY_RESULT_LABELS[r] ?? r}</StatusBadge>;
        },
        ...codeFilter<SleeConfigApplyResultRow>('applyResultCode', SLEE_APPLY_RESULT_LABELS),
      },
      {
        headerName: '예약일시',
        field: 'applyDatetime',
        width: 160,
        valueFormatter: (p) => (p.value ? dayjs(p.value).format('YYYY-MM-DD HH:mm') : '-'),
      },
      { headerName: '예약ID', field: 'svcResvId', width: 130, valueFormatter: (p) => p.value ?? '-' },
      { headerName: '작업자', field: 'workUserName', width: 110, valueFormatter: (p) => p.value ?? '-' },
    ],
    [],
  );

  return (
    <Modal
      open={visible}
      onCancel={() => setVisible(false)}
      title={
        <span>
          예약 적용 결과 — <span className="text-blue-700">{payload?.configFile ?? '-'}</span>
        </span>
      }
      width={920}
      footer={[
        <Button key="close" onClick={() => setVisible(false)}>
          닫기
        </Button>,
      ]}
      destroyOnHidden
    >
      <div className="text-[12px] text-slate-500 mb-2">
        조회 결과 <b>{rows.length}</b>건 — 시스템별 예약 적용 상태/결과. 예약 도래 후 2시간 초과 미실행은 <b>미처리</b>로 표시됩니다.
      </div>
      <div style={{ height: 440 }}>
        <AgGridReact<SleeConfigApplyResultRow>
          rowData={rows}
          columnDefs={columnDefs}
          gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
          loading={isFetching}
          getRowId={(p) => String(p.data.systemId)}
          defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true, resizable: true }}
        />
      </div>
    </Modal>
  );
});

SleeConfigReservationResultModal.displayName = 'SleeConfigReservationResultModal';
export default SleeConfigReservationResultModal;
