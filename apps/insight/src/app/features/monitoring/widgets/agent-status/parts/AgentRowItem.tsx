import { memo } from 'react';
import { Tag } from 'antd';
import { answerRatePct, avgAcwSec, avgTalkSec, formatDuration, liveDurationSec, occupancyPct, toStr, totalHandled } from '../helpers';
import { alarmLevel, statusMeta } from '../statusMap';
import type { AgentRow, Threshold } from '../types';

/**
 * 행 — 레거시 ag-Grid 테이블처럼 한 행에 12 컬럼 표시.
 *
 * 컬럼: [Tag상태] 이름 DN ANI 큐 스킬 시간 응대 응대율 평균 후처리 점유 멀티콜
 *
 * 헤더 행은 GroupSection 이 그룹 단위로 한 번만 그린다 (AgentRowItemHeader 컴포넌트).
 */
export interface AgentRowItemProps {
  row: AgentRow;
  nowMs: number;
  thresholds?: Record<string, Threshold>;
  onActivate?: (row: AgentRow) => void;
}

const TAG_COLOR_BY_GROUP: Record<string, string> = {
  available: 'green',
  talking: 'blue',
  ringing: 'orange',
  wrapup: 'purple',
  offline: 'default',
};

const TIME_COLOR = 'text-gray-900';
const TIME_COLOR_OFFLINE = 'text-gray-400';

// 12-컬럼 grid template (헤더와 행이 동일하게 사용)
export const ROW_GRID_CLS = 'grid w-full grid-cols-[90px_minmax(0,1.2fr)_60px_minmax(0,1.4fr)_minmax(0,1.2fr)_60px_70px_56px_56px_60px_60px_60px] items-center gap-x-3';

/** 컬럼 헤더 (그룹 상단 1회만 렌더). */
export function AgentRowItemHeader() {
  return (
    <div className={`${ROW_GRID_CLS} px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400`}>
      <span>상태</span>
      <span>이름</span>
      <span>DN</span>
      <span>ANI</span>
      <span>큐</span>
      <span>스킬</span>
      <span className="text-right">시간</span>
      <span className="text-right">응대</span>
      <span className="text-right">응대율</span>
      <span className="text-right">평균</span>
      <span className="text-right">후처리</span>
      <span className="text-right">점유</span>
    </div>
  );
}

function AgentRowItemImpl({ row, nowMs, thresholds, onActivate }: AgentRowItemProps) {
  const meta = statusMeta(row.AGENT_STATUS, row.REASON_CODE);
  const dur = liveDurationSec(row, nowMs);
  const alarm = alarmLevel(row.AGENT_STATUS, row.REASON_CODE, dur, thresholds);
  const isAlert = alarm === 2;
  const isWarn = alarm === 1;

  const tagColor = isAlert ? 'red' : isWarn ? 'orange' : TAG_COLOR_BY_GROUP[meta.group];
  const timeClass = meta.group === 'offline' ? TIME_COLOR_OFFLINE : TIME_COLOR;

  const name = toStr(row.AGENT_NAME) || toStr(row.AGENT_LOGIN_ID) || '?';
  const dn = toStr(row.LOGIN_DN_NO);
  const handled = totalHandled(row);
  const rate = answerRatePct(row);
  const avgTalk = avgTalkSec(row);
  const acw = avgAcwSec(row);
  const occ = occupancyPct(row, nowMs);
  const queue = toStr(row.LAST_ICQ_NAME);
  const skill = toStr(row.LAST_SKILL_NAME);
  const ani = toStr(row.FINAL_TALK_ANI);

  const rowCls = [
    `${ROW_GRID_CLS} group rounded border px-3 py-1.5 text-xs text-left outline-none transition-colors`,
    'hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-500',
    isAlert ? 'border-red-500 bg-red-50/30' : isWarn ? 'border-orange-400' : 'border-transparent hover:border-gray-200',
  ].join(' ');

  const rateColor = rate == null ? 'text-gray-400' : rate >= 95 ? 'text-green-600' : rate < 75 ? 'text-red-600' : 'text-gray-900';
  const occColor = occ == null ? 'text-gray-400' : occ >= 90 ? 'text-red-600' : occ >= 75 ? 'text-orange-600' : 'text-gray-700';

  return (
    <button type="button" onClick={() => onActivate?.(row)} className={rowCls} title={`${name} · ${meta.label} ${formatDuration(dur)}`}>
      {/* 상태 */}
      <Tag color={tagColor} className="!mr-0 justify-self-start">
        {meta.label}
        {isAlert ? ' · 초과' : ''}
      </Tag>

      {/* 이름 */}
      <span className="flex items-center gap-1.5 min-w-0">
        <span className="truncate font-semibold text-gray-900">{name}</span>
      </span>

      {/* DN */}
      <span className="font-mono text-gray-500 tabular-nums truncate">{dn || '—'}</span>

      {/* ANI */}
      <span className="font-mono text-gray-500 tabular-nums truncate">{formatAni(ani) || '—'}</span>

      {/* 큐 */}
      <span className="text-gray-600 truncate">{queue || '—'}</span>

      {/* 스킬 */}
      <span className="text-gray-500 truncate">{skill || '—'}</span>

      {/* 시간 */}
      <span className={`text-right font-mono font-semibold tabular-nums ${timeClass}`}>{meta.group === 'offline' ? '—' : formatDuration(dur)}</span>

      {/* 응대수 */}
      <span className="text-right font-mono font-semibold text-gray-900 tabular-nums">{handled || '—'}</span>

      {/* 응대율 */}
      <span className={`text-right font-mono font-semibold tabular-nums ${rateColor}`}>{rate != null ? `${rate}%` : '—'}</span>

      {/* 평균통화 */}
      <span className="text-right font-mono text-gray-700 tabular-nums">{avgTalk != null ? formatDuration(avgTalk) : '—'}</span>

      {/* 후처리 */}
      <span className="text-right font-mono text-gray-700 tabular-nums">{acw != null ? formatDuration(acw) : '—'}</span>

      {/* 점유율 */}
      <span className={`text-right font-mono font-semibold tabular-nums ${occColor}`}>{occ != null ? `${occ}%` : '—'}</span>
    </button>
  );
}

function formatAni(ani: string): string {
  if (!ani) return '';
  const digits = ani.replace(/[^\d]/g, '');
  if (digits.length === 11 && digits.startsWith('01')) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  return ani;
}

export default memo(AgentRowItemImpl);
