/**
 * 상담사 여정 이벤트 테이블 (v4 — ag-Grid 1행=1레코드)
 *
 * BE 파서 기반 구조:
 *   - timeline.spans[]: 상태 구간(SESSION 포함)
 *   - timeline.markers[]: 시점 이벤트
 * 두 컬렉션을 시간순 병합해 ag-Grid 1행=1레코드로 표현.
 *
 * 컬럼:
 *   시간 | 구분 | 명칭(상태 dot) | 지속시간 | 상태 코드 / 이벤트 타입
 *
 * IPRON 그리드 금지패턴 준수:
 *   - pagination: false (IPRON 전역 규칙)
 *   - rowSelection: mode:'singleRow', checkboxes:false (checkboxSelection 금지)
 *   - useAggridOptions() + spread 오버라이드
 *   - cellStyle fontSize 금지 (useAggridOptions 테마 상속)
 *   - 비데이터 컬럼(구분·상태dot 등)은 filter:false
 */
import { useMemo } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { Timeline, TimelineMarker, TimelineSpan } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function parseTimeSec(t: string): number {
  const [hms = '', frac = '0'] = t.split('.');
  const [hStr = '0', mStr = '0', sStr = '0'] = hms.split(':');
  return parseInt(hStr, 10) * 3600 + parseInt(mStr, 10) * 60 + parseInt(sStr, 10) + parseFloat(`0.${frac}`);
}

/** HH:mm:ss 앞 8자리만 반환 */
function fmtTime(t: string): string {
  return t.substring(0, 8);
}

function fmtDur(sec: number): string {
  const s = Math.round(Math.abs(sec));
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r > 0 ? `${m}분 ${r}초` : `${m}분`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}시간 ${rm}분` : `${h}시간`;
}

// ─── 행 타입 ─────────────────────────────────────────────────────────────────

type RowKind = 'span' | 'marker';

interface JourneyRow {
  /** 정렬 기준 초 */
  sortSec: number;
  kind: RowKind;
  /** 표시 시간 (HH:mm:ss) */
  time: string;
  /** 구분 (상태 구간 / 이벤트) */
  kindLabel: string;
  /** 한글 명칭 (label) */
  label: string;
  /** 색상 dot 용 hex */
  colorHex: string;
  /** 지속시간 (구간만. 이벤트='-') */
  duration: string;
  /** 종료시간 (구간만. 이벤트='-') */
  endTime: string;
  /** 세부 코드 (state or eventType) */
  code: string;
  /** 원천 토큰 (마커만. 구간='-') */
  rawToken: string;
}

// ─── 셀 렌더러 — 명칭 + 색 dot ──────────────────────────────────────────────

function LabelWithDotRenderer(params: { value: string; data: JourneyRow }) {
  const { value, data } = params;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: data.colorHex,
          flexShrink: 0,
        }}
      />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

interface Props {
  timeline: Timeline;
}

export default function AgentJourneyTimeline({ timeline }: Props) {
  const { gridOptions } = useAggridOptions();

  // ── 행 데이터: spans + markers → 시간순 병합 ─────────────────────────────
  const rowData = useMemo<JourneyRow[]>(() => {
    const rows: JourneyRow[] = [];

    timeline.spans.forEach((sp: TimelineSpan) => {
      const startSec = parseTimeSec(sp.startTime);
      const endSec = parseTimeSec(sp.endTime);
      const durSec = Math.max(0, endSec - startSec);
      rows.push({
        sortSec: startSec,
        kind: 'span',
        time: fmtTime(sp.startTime),
        kindLabel: '상태 구간',
        label: sp.label,
        colorHex: sp.colorHex,
        duration: fmtDur(durSec),
        endTime: fmtTime(sp.endTime),
        code: sp.state,
        rawToken: '-',
      });
    });

    timeline.markers.forEach((mk: TimelineMarker) => {
      rows.push({
        sortSec: parseTimeSec(mk.time),
        kind: 'marker',
        time: fmtTime(mk.time),
        kindLabel: '이벤트',
        label: mk.label,
        colorHex: mk.colorHex,
        duration: '-',
        endTime: '-',
        code: mk.eventType,
        rawToken: mk.rawToken || '-',
      });
    });

    // 시간순 정렬 (같은 초면 span → marker 순)
    rows.sort((a, b) => {
      if (a.sortSec !== b.sortSec) return a.sortSec - b.sortSec;
      if (a.kind === 'span' && b.kind === 'marker') return -1;
      if (a.kind === 'marker' && b.kind === 'span') return 1;
      return 0;
    });

    return rows;
  }, [timeline]);

  // ── 컬럼 정의 ─────────────────────────────────────────────────────────────
  const columnDefs = useMemo<ColDef<JourneyRow>[]>(
    () => [
      {
        field: 'time',
        headerName: '시간',
        width: 90,
        minWidth: 80,
        flex: 0,
        filter: false,
        tooltipField: 'time',
      },
      {
        field: 'kindLabel',
        headerName: '구분',
        width: 100,
        minWidth: 80,
        flex: 0,
        filter: false,
        tooltipField: 'kindLabel',
      },
      {
        field: 'label',
        headerName: '명칭',
        flex: 2,
        minWidth: 140,
        cellRenderer: LabelWithDotRenderer,
        tooltipField: 'label',
      },
      {
        field: 'duration',
        headerName: '지속시간',
        width: 110,
        minWidth: 80,
        flex: 0,
        filter: false,
        tooltipField: 'duration',
      },
      {
        field: 'endTime',
        headerName: '종료 시간',
        width: 90,
        minWidth: 80,
        flex: 0,
        filter: false,
        tooltipField: 'endTime',
      },
      {
        field: 'code',
        headerName: '상태/이벤트 코드',
        flex: 1,
        minWidth: 130,
        tooltipField: 'code',
      },
      {
        field: 'rawToken',
        headerName: '원천 토큰',
        flex: 2,
        minWidth: 160,
        tooltipField: 'rawToken',
      },
    ],
    [],
  );

  // ── 그리드 옵션 오버라이드 ────────────────────────────────────────────────
  const mergedGridOptions = useMemo(
    () => ({
      ...gridOptions,
      pagination: false,
      statusBar: undefined,
      rowSelection: { mode: 'singleRow' as const, checkboxes: false, enableClickSelection: true },
      noRowsOverlayComponentParams: {
        message: '조회된 내역이 없습니다.',
      },
    }),
    [gridOptions],
  );

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <AgGridReact<JourneyRow> rowData={rowData} columnDefs={columnDefs} gridOptions={mergedGridOptions} />
    </div>
  );
}
