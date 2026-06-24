/**
 * 시스템별 시나리오 할당 현황 모달 (AS-IS IPR20S6020 '시스템별 시나리오 할당 현황' 팝업).
 *
 * <p>전체(테넌트) 범위 — 현재 상태(TB_IR_DNIS_SERVICE) / 적용 이력(TB_IR_SERVICE_HISTORY) 토글.
 * 카드 "더보기"로 열면 시나리오 컬럼 필터를 해당 시나리오로 <b>미리 선택</b>해 보여준다(필터에서 전체 선택 시 전체 표시).</p>
 */
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { ColDef, FirstDataRenderedEvent, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Modal, Segmented, Tag } from 'antd';
import dayjs from 'dayjs';
import { useGetScenarioAssignedHistory, useGetScenarioAssignedStatus } from '../hooks/useScenarioQueries';
import { APPLY_RESULT_LABELS, APPLY_STATUS_LABELS, RT_RESV_KIND_LABELS, type ScenarioAssignedStatusRow } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { codeFilter } from '@/libs/shared-ui/src/lib/aggridCodeColumn';

export interface ScenarioAssignedStatusModalRef {
  /** serviceId 전달 시 시나리오 컬럼 필터를 그 시나리오로 미리 선택(카드 더보기). 미전달 시 전체(헤더 버튼). */
  open: (serviceId?: number) => void;
  close: () => void;
}

type StatusTab = 'current' | 'history';

const ScenarioAssignedStatusModal = forwardRef<ScenarioAssignedStatusModalRef>((_, ref) => {
  const { gridOptions } = useAggridOptions();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<StatusTab>('current');
  // 미리 선택할 시나리오 id (그리드 컬럼 필터 적용용) — 리렌더와 무관히 콜백에서 읽으려 ref 보관
  const filterServiceIdRef = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    open: (serviceId?: number) => {
      setTab('current');
      filterServiceIdRef.current = serviceId ?? null;
      setOpen(true);
    },
    close: () => setOpen(false),
  }));

  const isHistory = tab === 'history';
  // 데이터는 항상 테넌트 전체 — 시나리오 한정은 그리드 컬럼 필터로 처리(사용자가 '전체'로 풀 수 있게).
  const { data: current = [], isFetching: curLoading } = useGetScenarioAssignedStatus({ queryOptions: { enabled: open } });
  const { data: history = [], isFetching: hisLoading } = useGetScenarioAssignedHistory({ queryOptions: { enabled: open && isHistory } });

  const loading = isHistory ? hisLoading : curLoading;

  // 시스템명 기준 정렬(동률 시 시나리오명)
  const rows = useMemo(() => {
    const base = isHistory ? history : current;
    return [...base].sort((a, b) => (a.systemName ?? '').localeCompare(b.systemName ?? '', 'ko') || (a.serviceName ?? '').localeCompare(b.serviceName ?? '', 'ko'));
  }, [isHistory, history, current]);

  // 그리드 첫 렌더 후: 미리 선택할 시나리오가 있으면 시나리오 컬럼 셋 필터를 그 이름으로 적용
  const applyScenarioFilter = (e: FirstDataRenderedEvent<ScenarioAssignedStatusRow>) => {
    const sid = filterServiceIdRef.current;
    if (sid == null) {
      e.api.setFilterModel(null);
      return;
    }
    let name: string | undefined;
    e.api.forEachNode((n) => {
      if (!name && n.data?.serviceId === sid) name = n.data?.serviceName ?? undefined;
    });
    if (name) {
      e.api.setFilterModel({ serviceName: { filterType: 'set', values: [name] } });
    }
  };

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
          onFirstDataRendered={applyScenarioFilter}
        />
      </div>
    </Modal>
  );
});

ScenarioAssignedStatusModal.displayName = 'ScenarioAssignedStatusModal';
export default ScenarioAssignedStatusModal;
