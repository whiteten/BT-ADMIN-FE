import { useMemo } from 'react';
import type { CellStyle, ColDef, GetRowIdParams, RowStyle, ValueFormatterParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { fmtRepairTime, isResolved } from '../helpers';
import type { AlarmRow } from '../types';
import AggridAlarmLevelRenderer from './AggridAlarmLevelRenderer';
import AggridAlarmStatusRenderer from './AggridAlarmStatusRenderer';
import AggridAlarmSystemRenderer from './AggridAlarmSystemRenderer';
import AggridAlarmTimeRenderer from './AggridAlarmTimeRenderer';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

/**
 * 알람센터 표(목록) 뷰 — 시안(09-alarm-center.html)의 장애 이력 리스트를 ag-Grid 로 이식.
 *
 * 셀 렌더러는 알람센터 전용이라 위젯 옆(parts/)에 두고 `cellRenderer` 에 컴포넌트 참조로 직접 연결한다
 * (공용 string 키 등록은 `percentBarRenderer` 처럼 여러 앱이 쓰는 렌더러만).
 * 행 좌측 등급 보더·복구행 흐림은 getRowStyle 로 인코딩.
 *
 * 데이터 규모(최근 1주 발생 이력)상 페이지네이션 없이 가상 스크롤만 사용한다.
 */
export interface AlarmCenterGridProps {
  /** 상위 위젯에서 등급·미복구·검색 필터 + 발생시각 desc 정렬을 적용한 visible row. */
  rows: AlarmRow[];
}

/** 행 좌측 등급 severity 바 + 복구행 흐림(해소: 회색 보더 + 옅은 배경 + opacity, 미해소: 등급색 보더). */
function getRowStyle(p: { data?: AlarmRow }): RowStyle | undefined {
  const d = p.data;
  if (!d) return undefined;
  if (isResolved(d)) return { borderLeft: '4px solid #cdd2d9', background: '#f6f7f9', opacity: '0.66' };
  if (d.level >= 3) return { borderLeft: '4px solid #c92a2a' }; // 위험·빨강
  if (d.level === 2) return { borderLeft: '4px solid #d9480f' }; // 경고·주황
  if (d.level === 1) return { borderLeft: '4px solid #b7791f' }; // 주의·노랑
  return { borderLeft: '4px solid #0a8a4a' };
}

const dash = (p: ValueFormatterParams<AlarmRow>) => (p.value ? String(p.value) : '—');

// 배지 셀 가운데 정렬 / 코드 셀 옅은 색 — CellStyle 로 명시(인라인 union 시 color?:undefined 누수 방지).
const CENTER_CELL: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
const CODE_CELL: CellStyle = { color: '#6a6f78' };

export default function AlarmCenterGrid({ rows }: AlarmCenterGridProps) {
  const { gridOptions } = useAggridOptions();

  const columnDefs = useMemo<ColDef<AlarmRow>[]>(
    () => [
      // 발생시각 — 2줄(시각 + 상대시간) 렌더. 기본 정렬은 위젯이 rowData 순서(미복구 상단/복구 하단)로 제어하므로
      // 컬럼 기본 sort 는 두지 않는다(헤더 클릭 시 사용자 정렬은 가능).
      {
        headerName: '발생시각',
        width: 152,
        minWidth: 140,
        flex: 0,
        valueGetter: (p) => `${p.data?.date ?? ''}${p.data?.time ?? ''}`,
        cellRenderer: AggridAlarmTimeRenderer,
      },
      // 노드 — 노드 마스터(TB_CC_NODEMASTER)에서 enrich된 노드명. 없으면 노드ID·—
      {
        headerName: '노드',
        width: 120,
        minWidth: 96,
        flex: 0,
        valueGetter: (p) => p.data?.nodeName ?? (p.data?.nodeId ? `노드 ${p.data.nodeId}` : ''),
        valueFormatter: dash,
      },
      // 시스템 — 표시명 + (ID)
      { headerName: '시스템', minWidth: 140, flex: 1, valueGetter: (p) => p.data?.systemName ?? p.data?.systemId ?? '', cellRenderer: AggridAlarmSystemRenderer },
      // 프로세스 — 시스템 프로세스(TB_CC_SYSTEMPROCESS)에서 enrich된 프로세스명. 없으면 프로세스ID·—
      {
        headerName: '프로세스',
        width: 140,
        minWidth: 110,
        flex: 0,
        valueGetter: (p) => p.data?.processName ?? p.data?.processId ?? '',
        tooltipValueGetter: (p) => p.data?.processName ?? '',
        valueFormatter: dash,
      },
      // 등급 — 색상 배지(Critical/Major/Minor/정상)
      { headerName: '등급', width: 96, minWidth: 84, flex: 0, cellStyle: CENTER_CELL, valueGetter: (p) => p.data?.level ?? 0, cellRenderer: AggridAlarmLevelRenderer },
      // 코드 — 숫자 정렬용 tabular-nums (insight 폰트 규칙상 font-mono 미사용)
      { headerName: '코드', width: 110, minWidth: 90, flex: 0, field: 'code', cellClass: 'tabular-nums', cellStyle: CODE_CELL, valueFormatter: dash },
      // 메시지 — 1줄 truncate + native tooltip, 미복구 위험 행은 강조
      {
        headerName: '메시지',
        minWidth: 200,
        flex: 2,
        field: 'message',
        tooltipField: 'message',
        valueFormatter: dash,
        cellClassRules: { 'font-semibold': (p) => !!p.data && !isResolved(p.data) && p.data.level >= 2 },
      },
      // 상태 — 복구/미복구 배지(미복구 위험은 pulse)
      {
        headerName: '상태',
        width: 104,
        minWidth: 92,
        flex: 0,
        cellStyle: CENTER_CELL,
        valueGetter: (p) => (p.data && isResolved(p.data) ? 1 : 0),
        cellRenderer: AggridAlarmStatusRenderer,
      },
      // 복구시각 — 복구된 행만 값 표시(미복구는 —). 정렬용 tabular-nums.
      {
        headerName: '복구시각',
        width: 168,
        minWidth: 150,
        flex: 0,
        cellClass: 'tabular-nums',
        cellStyle: CODE_CELL,
        valueGetter: (p) => fmtRepairTime(p.data?.repairTime) || '—',
      },
    ],
    [],
  );

  return (
    <div className="h-full w-full">
      <AgGridReact<AlarmRow>
        {...gridOptions}
        rowData={rows}
        columnDefs={columnDefs}
        getRowId={(p: GetRowIdParams<AlarmRow>) => p.data.id}
        getRowStyle={getRowStyle}
        pagination={false}
        rowNumbers={false}
        noRowsOverlayComponentParams={{ message: '표시할 장애가 없습니다.' }}
        onFirstDataRendered={(p) => p.api.autoSizeAllColumns()}
      />
    </div>
  );
}
