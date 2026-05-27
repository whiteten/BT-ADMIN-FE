import { memo } from 'react';
import { Tooltip } from 'antd';
import { formatDuration, initialOf, liveDurationSec, toStr } from '../helpers';
import { alarmLevel, statusMeta } from '../statusMap';
import type { AgentRow, Threshold } from '../types';

/**
 * 고밀도 도트 — 200+ 상담사를 한 화면에. Tailwind bg-* 클래스만 사용.
 */
export interface AgentDotProps {
  row: AgentRow;
  nowMs: number;
  thresholds?: Record<string, Threshold>;
  onActivate?: (row: AgentRow) => void;
}

const BG_BY_GROUP: Record<string, string> = {
  available: 'bg-green-500',
  talking: 'bg-blue-500',
  ringing: 'bg-orange-500',
  wrapup: 'bg-purple-500',
  offline: 'bg-gray-300',
};

function AgentDotImpl({ row, nowMs, thresholds, onActivate }: AgentDotProps) {
  const meta = statusMeta(row.AGENT_STATUS, row.REASON_CODE);
  const dur = liveDurationSec(row, nowMs);
  const alarm = alarmLevel(row.AGENT_STATUS, row.REASON_CODE, dur, thresholds);
  const isAlert = alarm === 2;

  const bg = isAlert ? 'bg-red-500' : BG_BY_GROUP[meta.group];
  const name = toStr(row.AGENT_NAME) || toStr(row.AGENT_LOGIN_ID) || '?';

  const tip = (
    <div className="space-y-0.5 text-xs">
      <div className="font-semibold">{name}</div>
      <div className="opacity-80">
        {meta.label} · {formatDuration(dur)}
      </div>
    </div>
  );

  return (
    <Tooltip title={tip} placement="top" mouseEnterDelay={0.1} mouseLeaveDelay={0.05}>
      <button
        type="button"
        onClick={() => onActivate?.(row)}
        aria-label={`${name} ${meta.label} ${formatDuration(dur)}`}
        className={[
          'relative aspect-square w-full overflow-hidden rounded outline-none transition-transform duration-150',
          'hover:scale-125 hover:z-10 focus-visible:ring-2 focus-visible:ring-white',
          bg,
          isAlert ? 'bt-alert-breath' : '',
        ].join(' ')}
      >
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center font-mono text-[9px] font-bold leading-none text-white/95"
          style={{ textShadow: '0 1px 1px rgba(0,0,0,0.25)' }}
        >
          {initialOf(row)}
        </span>
      </button>
    </Tooltip>
  );
}

export default memo(AgentDotImpl);
