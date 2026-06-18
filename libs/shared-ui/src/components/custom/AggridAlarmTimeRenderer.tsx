import React from 'react';
import type { ICellRendererParams } from 'ag-grid-community';

/**
 * AG-Grid 장애 발생시각 셀 렌더러 (string 키: `alarmTimeRenderer`).
 *
 * `ERR_DATE`(yyyyMMdd) + `ERR_TIME`(HHmmss) 를 "MM-DD HH:mm:ss" + 상대시간(n분 전) 2줄로 표시.
 * 상대시간은 렌더 시점 기준이며, 데이터 프레임 교체 시 grid redraw 로 갱신된다(초 단위 라이브 틱은 없음).
 *
 * shared-ui 자족형 — `params.data` 에서 date/time 만 느슨하게 읽는다(앱 타입 역참조 금지).
 */
interface AlarmTimeData {
  date?: string;
  time?: string;
}

/** yyyyMMdd + HHmmss → epoch ms. 파싱 실패 시 0. */
function epoch(date: string, time: string): number {
  if (!/^\d{8}$/.test(date)) return 0;
  const t = (time + '000000').slice(0, 6);
  return new Date(+date.slice(0, 4), +date.slice(4, 6) - 1, +date.slice(6, 8), +t.slice(0, 2), +t.slice(2, 4), +t.slice(4, 6)).getTime();
}

function fmtTime(date: string, time: string): string {
  const t = (time + '000000').slice(0, 6);
  if (!/^\d{8}$/.test(date)) return `${date} ${t}`.trim();
  return `${date.slice(4, 6)}-${date.slice(6, 8)} ${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4, 6)}`;
}

function fmtRelative(ms: number, now: number): string {
  if (ms <= 0) return '';
  const sec = Math.max(0, Math.floor((now - ms) / 1000));
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

const AggridAlarmTimeRenderer: React.FC<ICellRendererParams> = (params) => {
  const d = (params.data ?? {}) as AlarmTimeData;
  const date = (d.date ?? '').trim();
  const time = (d.time ?? '').trim();
  return (
    <span className="flex flex-col justify-center leading-tight">
      <span className="font-semibold tabular-nums">{fmtTime(date, time)}</span>
      <span className="text-[10.5px]" style={{ color: '#6a6f78' }}>
        {fmtRelative(epoch(date, time), Date.now())}
      </span>
    </span>
  );
};

export default AggridAlarmTimeRenderer;
