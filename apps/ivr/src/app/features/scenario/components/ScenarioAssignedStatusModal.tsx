/**
 * 시스템별 시나리오 할당 현황 모달 (AS-IS IPR20S6020 '시스템별 시나리오 할당 현황' 팝업).
 *
 * <p>전체(테넌트) 범위 — 현재 상태(TB_IR_DNIS_SERVICE) / 적용 이력(TB_IR_SERVICE_HISTORY) 토글.
 * 카드 "더보기"로 열면 시나리오 컬럼 필터를 해당 시나리오로 <b>미리 선택</b>해 보여준다(필터에서 전체 선택 시 전체 표시).</p>
 */
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { ColDef, GridApi, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Modal, Segmented } from 'antd';
import dayjs from 'dayjs';
import { useGetScenarioAssignedHistory, useGetScenarioAssignedStatus } from '../hooks/useScenarioQueries';
import { APPLY_RESULT, APPLY_RESULT_LABELS, APPLY_STATUS, APPLY_STATUS_LABELS, RT_RESV_KIND_LABELS, type ScenarioAssignedStatusRow } from '../types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { codeFilter } from '@/libs/shared-ui/src/lib/aggridCodeColumn';

export interface ScenarioAssignedStatusModalRef {
  /**
   * serviceId/serviceName 전달 시 시나리오 컬럼 필터를 그 시나리오로 미리 선택(카드 더보기). 미전달 시 전체(헤더 버튼).
   * serviceName 을 함께 받아 데이터 유무와 무관하게 그 이름으로 직접 필터한다
   * (이력이 없는 시나리오도 필터가 걸려 빈 그리드로 일관 표시 — 데이터에서 이름을 못 찾아 필터가 누락되던 버그 방지).
   */
  open: (serviceId?: number, serviceName?: string) => void;
  close: () => void;
}

type StatusTab = 'current' | 'history';

// 상태별 뱃지 색 — HaGroupList.tsx의 ROLE_STATUS_BADGE_CLASS와 동일한 패턴(Record 매핑 + shadcn Badge,
// antd Tag 대신 이 앱의 카드/그리드 배지와 동일한 컴포넌트로 통일).
const BLUE_BADGE_CLASS = 'text-blue-600 bg-blue-50';
const RED_BADGE_CLASS = 'text-red-600 bg-red-50';
const AMBER_BADGE_CLASS = 'text-amber-600 bg-amber-50';
const EMERALD_BADGE_CLASS = 'text-emerald-600 bg-emerald-50';
const PURPLE_BADGE_CLASS = 'text-purple-600 bg-purple-50';
const DEFAULT_BADGE_CLASS = 'text-gray-500 bg-gray-100';
const BADGE_CLASS = 'text-[13px] leading-[13px] font-medium !h-6';

/** 구분(RT_RESV_KIND) — 1=즉시, 2=예약. */
const RT_RESV_KIND_BADGE_CLASS: Record<number, string> = { 1: BLUE_BADGE_CLASS, 2: PURPLE_BADGE_CLASS };

/** 적용상태(APPLY_STATUS). */
const APPLY_STATUS_BADGE_CLASS: Record<number, string> = {
  [APPLY_STATUS.PENDING]: AMBER_BADGE_CLASS,
  [APPLY_STATUS.SEND_OK]: BLUE_BADGE_CLASS,
  [APPLY_STATUS.SEND_FAIL]: RED_BADGE_CLASS,
  [APPLY_STATUS.CMD_OK]: BLUE_BADGE_CLASS,
  [APPLY_STATUS.CMD_FAIL]: RED_BADGE_CLASS,
  [APPLY_STATUS.APPLIED]: EMERALD_BADGE_CLASS,
  [APPLY_STATUS.APPLY_FAIL]: RED_BADGE_CLASS,
};

/** 결과(APPLY_RESULT) — 1=성공, 9=실패. */
const APPLY_RESULT_BADGE_CLASS: Record<number, string> = {
  [APPLY_RESULT.SUCCESS]: EMERALD_BADGE_CLASS,
  [APPLY_RESULT.FAIL]: RED_BADGE_CLASS,
};

const ScenarioAssignedStatusModal = forwardRef<ScenarioAssignedStatusModalRef>((_, ref) => {
  const { gridOptions } = useAggridOptions();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<StatusTab>('current');
  // 미리 선택할 시나리오 id/name (그리드 컬럼 필터 적용용) — 리렌더와 무관히 콜백에서 읽으려 ref 보관
  const filterServiceIdRef = useRef<number | null>(null);
  const filterServiceNameRef = useRef<string | null>(null);
  const gridApiRef = useRef<GridApi<ScenarioAssignedStatusRow> | null>(null);

  useImperativeHandle(ref, () => ({
    open: (serviceId?: number, serviceName?: string) => {
      setTab('current');
      filterServiceIdRef.current = serviceId ?? null;
      filterServiceNameRef.current = serviceName ?? null;
      setOpen(true);
    },
    close: () => setOpen(false),
  }));

  const isHistory = tab === 'history';
  // 데이터는 항상 테넌트 전체 — 시나리오 한정은 그리드 컬럼 필터로 처리(사용자가 '전체'로 풀 수 있게).
  const { data: current = [], isFetching: curLoading } = useGetScenarioAssignedStatus({ queryOptions: { enabled: open } });
  const { data: history = [], isFetching: hisLoading } = useGetScenarioAssignedHistory({ queryOptions: { enabled: open && isHistory } });

  const loading = isHistory ? hisLoading : curLoading;

  // 적용 이력: 예약/적용시간(applyDatetime) 내림차순(동률 시 작업시각). 현재 상태: 시스템명 기준(동률 시 시나리오명).
  const rows = useMemo(() => {
    const base = isHistory ? history : current;
    return [...base].sort((a, b) =>
      isHistory
        ? (b.applyDatetime ?? '').localeCompare(a.applyDatetime ?? '') || (b.updateTime ?? '').localeCompare(a.updateTime ?? '')
        : (a.systemName ?? '').localeCompare(b.systemName ?? '', 'ko') || (a.serviceName ?? '').localeCompare(b.serviceName ?? '', 'ko'),
    );
  }, [isHistory, history, current]);

  // 미리 선택할 시나리오가 있으면 시나리오 컬럼 셋 필터를 그 이름으로 적용.
  // 그리드 이벤트(onFirstDataRendered/onRowDataUpdated)는 탭 전환 시 key 로 remount 되거나
  // 데이터가 캐시로 즉시 들어오면 기대 시점에 발화하지 않아 누락된다. 따라서 이벤트 대신
  // "데이터 준비 시점"에 effect/onGridReady 양쪽에서 직접 건다. 셋필터 값 빌드가 끝난 뒤
  // 적용되도록 다음 매크로태스크에서 setFilterModel 한다(현황·이력 각 탭, remount·캐시 무관 동작).
  const applyScenarioFilter = (api: GridApi<ScenarioAssignedStatusRow>) => {
    const sid = filterServiceIdRef.current;
    if (sid == null) return; // 전역 보기 — 사용자 필터 보존
    // 전달받은 이름을 우선 사용(데이터 유무 무관). 없을 때만 로드된 행에서 보조 조회.
    let name: string | undefined = filterServiceNameRef.current ?? undefined;
    if (!name) {
      api.forEachNode((n) => {
        if (!name && n.data?.serviceId === sid) name = n.data?.serviceName ?? undefined;
      });
    }
    if (name) api.setFilterModel({ serviceName: { filterType: 'set', values: [name] } });
  };

  useEffect(() => {
    const api = gridApiRef.current;
    if (!open || loading || !api || rows.length === 0) return;
    const id = window.setTimeout(() => {
      if (gridApiRef.current === api) applyScenarioFilter(api); // remount 로 api 교체됐으면 무시
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, tab, loading, rows]);

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
          return k == null ? '-' : <Badge className={cn(BADGE_CLASS, RT_RESV_KIND_BADGE_CLASS[k] ?? DEFAULT_BADGE_CLASS)}>{RT_RESV_KIND_LABELS[k] ?? k}</Badge>;
        },
        ...codeFilter<ScenarioAssignedStatusRow>('rtResvKind', RT_RESV_KIND_LABELS),
      },
      {
        headerName: '적용상태',
        field: 'applyStatus',
        width: 120,
        cellRenderer: (p: ICellRendererParams<ScenarioAssignedStatusRow>) => {
          const s = p.data?.applyStatus;
          if (s == null) return '-';
          return <Badge className={cn(BADGE_CLASS, APPLY_STATUS_BADGE_CLASS[s] ?? DEFAULT_BADGE_CLASS)}>{APPLY_STATUS_LABELS[s] ?? s}</Badge>;
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
          return <Badge className={cn(BADGE_CLASS, APPLY_RESULT_BADGE_CLASS[r] ?? DEFAULT_BADGE_CLASS)}>{APPLY_RESULT_LABELS[r] ?? r}</Badge>;
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
          onGridReady={(e) => {
            gridApiRef.current = e.api;
            // 캐시로 데이터가 이미 들어와 마운트된 경우(재오픈 등) effect 가 다시 안 돌 수 있어 여기서도 적용
            window.setTimeout(() => {
              if (gridApiRef.current === e.api && !loading) applyScenarioFilter(e.api);
            }, 0);
          }}
        />
      </div>
    </Modal>
  );
});

ScenarioAssignedStatusModal.displayName = 'ScenarioAssignedStatusModal';
export default ScenarioAssignedStatusModal;
