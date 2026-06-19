/**
 * 시스템별 시나리오 할당 현황 모달 (AS-IS IPR20S6020 '시스템별 시나리오 할당 현황' 팝업).
 *
 * <p>전체(테넌트) 범위 — 현재 상태(TB_IR_DNIS_SERVICE) / 적용 이력(TB_IR_SERVICE_HISTORY) 토글.
 * 레거시 chkHistory 토글 동등.</p>
 */
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Modal, Segmented, Tag } from 'antd';
import dayjs from 'dayjs';
import { useGetScenarioAssignedHistory, useGetScenarioAssignedStatus } from '../hooks/useScenarioQueries';
import { APPLY_RESULT_LABELS, APPLY_STATUS_LABELS, RT_RESV_KIND_LABELS, type ScenarioAssignedStatusRow } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { codeFilter } from '@/libs/shared-ui/src/lib/aggridCodeColumn';

export interface ScenarioAssignedStatusModalRef {
  open: () => void;
  close: () => void;
}

type StatusTab = 'current' | 'history';

const ScenarioAssignedStatusModal = forwardRef<ScenarioAssignedStatusModalRef>((_, ref) => {
  const { gridOptions } = useAggridOptions();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<StatusTab>('current');

  useImperativeHandle(ref, () => ({
    open: () => {
      setTab('current');
      setOpen(true);
    },
    close: () => setOpen(false),
  }));

  const isHistory = tab === 'history';
  const { data: current = [], isFetching: curLoading } = useGetScenarioAssignedStatus({ queryOptions: { enabled: open } });
  const { data: history = [], isFetching: hisLoading } = useGetScenarioAssignedHistory({ queryOptions: { enabled: open && isHistory } });

  const rows = isHistory ? history : current;
  const loading = isHistory ? hisLoading : curLoading;

  const columnDefs: ColDef<ScenarioAssignedStatusRow>[] = useMemo(
    () => [
      { headerName: '시스템', field: 'systemName', flex: 1, minWidth: 120, valueFormatter: (p) => p.value ?? (p.data?.systemId ? `시스템 ${p.data.systemId}` : '-') },
      { headerName: '시나리오', field: 'serviceName', flex: 1.2, minWidth: 140, tooltipField: 'serviceName', valueFormatter: (p) => p.value ?? `#${p.data?.serviceId ?? ''}` },
      { headerName: '적용버전', field: 'serviceVer', width: 100, valueFormatter: (p) => p.value ?? '-' },
      { headerName: '이전버전', field: 'priorVer', width: 100, valueFormatter: (p) => p.value ?? '-' },
      { headerName: '예약버전', field: 'applyVer', width: 100, valueFormatter: (p) => p.value ?? '-' },
      {
        headerName: '구분',
        field: 'rtResvKind',
        width: 80,
        cellRenderer: (p: ICellRendererParams<ScenarioAssignedStatusRow>) => {
          const k = p.data?.rtResvKind;
          return k == null ? '-' : <Tag color={k === 1 ? 'blue' : 'purple'}>{RT_RESV_KIND_LABELS[k] ?? k}</Tag>;
        },
        ...codeFilter<ScenarioAssignedStatusRow>('rtResvKind', RT_RESV_KIND_LABELS),
      },
      {
        headerName: '적용상태',
        field: 'applyStatus',
        width: 110,
        cellRenderer: (p: ICellRendererParams<ScenarioAssignedStatusRow>) => {
          const s = p.data?.applyStatus;
          if (s == null) return '-';
          const color = s === 50 ? 'green' : s === 55 || s === 25 || s === 35 ? 'red' : s === 10 ? 'gold' : 'blue';
          return <Tag color={color}>{APPLY_STATUS_LABELS[s] ?? s}</Tag>;
        },
        ...codeFilter<ScenarioAssignedStatusRow>('applyStatus', APPLY_STATUS_LABELS),
      },
      {
        headerName: '결과',
        field: 'applyResult',
        width: 90,
        cellRenderer: (p: ICellRendererParams<ScenarioAssignedStatusRow>) => {
          const r = p.data?.applyResult;
          if (r == null) return '-';
          return <Tag color={r === 1 ? 'green' : r === 9 ? 'red' : 'default'}>{APPLY_RESULT_LABELS[r] ?? r}</Tag>;
        },
        ...codeFilter<ScenarioAssignedStatusRow>('applyResult', APPLY_RESULT_LABELS),
      },
      { headerName: '예약/적용시간', field: 'applyDatetime', width: 150, valueFormatter: (p) => (p.value ? dayjs(p.value).format('YYYY-MM-DD HH:mm') : '-') },
      { headerName: '예약ID', field: 'svcResvId', width: 120, valueFormatter: (p) => p.value ?? '-' },
      { headerName: '작업시각', field: 'updateTime', width: 150, valueFormatter: (p) => (p.value ? dayjs(p.value).format('YYYY-MM-DD HH:mm:ss') : '-') },
      { headerName: '작업자', field: 'workUserName', width: 100, valueFormatter: (p) => p.value ?? '-' },
    ],
    [],
  );

  return (
    <Modal title="시스템별 시나리오 할당 현황" open={open} onCancel={() => setOpen(false)} footer={null} width={1120} destroyOnHidden>
      <div className="mb-3 flex items-center gap-3">
        <Segmented<StatusTab>
          value={tab}
          onChange={(v) => setTab(v)}
          options={[
            { label: '현재 상태', value: 'current' },
            { label: '적용 이력', value: 'history' },
          ]}
        />
        <span className="text-xs text-gray-400">
          총 <b>{rows.length}</b>건{isHistory ? ' (최근 500)' : ''}
        </span>
      </div>
      <div className="h-[520px]">
        <AgGridReact<ScenarioAssignedStatusRow>
          key={tab}
          rowData={rows}
          columnDefs={columnDefs}
          gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
          loading={loading}
          getRowId={(p) => `${p.data.serviceId}-${p.data.systemId}-${p.data.updateTime ?? ''}-${p.data.svcResvId ?? ''}`}
          defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true, resizable: true }}
        />
      </div>
    </Modal>
  );
});

ScenarioAssignedStatusModal.displayName = 'ScenarioAssignedStatusModal';
export default ScenarioAssignedStatusModal;
