import { memo } from 'react';
import { Tag, Tooltip } from 'antd';
import { BarChart3 } from 'lucide-react';
import { formatDuration, liveDurationSec, mosLevel, toNum, toStr, totalTalkSec } from '../helpers';
import { DEFAULT_THRESHOLDS, alarmLevel, statusKey, statusMeta } from '../statusMap';
import type { AgentRow, Threshold } from '../types';
import { MOS_META } from './MosLegend';

/**
 * 상담사 카드 v3 — 레거시 모니터링 페이지급 정보 밀도 및 모던 UI 고도화.
 * 성능 최적화: 1000개 이상의 카드 대응을 위해 커스텀 memo 비교 로직 적용.
 */
export interface AgentCardProps {
  row: AgentRow;
  nowMs: number;
  thresholds?: Record<string, Threshold>;
  onActivate?: (row: AgentRow) => void;
  /** 컴팩트 모드 — 큐 컨텍스트·KPI 섹션 숨기고 높이 축소 (더 많은 카드 노출). */
  compact?: boolean;
}

const TAG_COLOR_BY_GROUP: Record<string, string> = {
  available: '#059669', // emerald-600
  talking: '#2563eb', // blue-600
  ringing: '#f59e0b', // amber-500
  wrapup: '#7c3aed', // violet-600
  offline: '#64748b', // slate-500
};

/** 시간은 단일색(중성 회색). 상태 강조는 Tag 와 카드 보더에서. */
const TIME_COLOR = 'text-slate-800';
const TIME_COLOR_OFFLINE = 'text-slate-400';

function AgentCardImpl({ row, nowMs, thresholds, onActivate, compact = false }: AgentCardProps) {
  const meta = statusMeta(row.AGENT_STATUS, row.REASON_CODE);
  const dur = liveDurationSec(row, nowMs);
  const alarm = alarmLevel(row.AGENT_STATUS, row.REASON_CODE, dur, thresholds);
  const isAlert = alarm === 2;
  const isWarn = alarm === 1;

  const sKey = statusKey(row.AGENT_STATUS, row.REASON_CODE);
  const th = thresholds?.[sKey] ?? DEFAULT_THRESHOLDS[sKey];

  const tagColor = isAlert ? '#dc2626' : isWarn ? '#f59e0b' : TAG_COLOR_BY_GROUP[meta.group];
  const timeClass = meta.group === 'offline' ? TIME_COLOR_OFFLINE : TIME_COLOR;

  const name = toStr(row.AGENT_NAME) || toStr(row.AGENT_LOGIN_ID) || `#${row.AGENT_ID ?? '-'}`;
  const dn = toStr(row.LOGIN_DN_NO);

  // KPI 모음 — 응대, 자율처리율, 통화시간, 평균통화시간
  const ansCnt = toNum(row.SUM_ANSW_CNT) ?? 0;
  const selfRate = toNum(row.SELF_HANDLE_RATE);
  const talkSec = totalTalkSec(row);
  const avgTalk = toNum(row.AVG_ANSTALK_TIME) ?? 0;

  const statusLabel = meta.label + (isAlert ? ' · 초과' : isWarn && th ? ` · ${formatThresholdMinutes(th.notice)}↑` : '');

  // 비가시 영역 렌더 스킵 — content-visibility: auto + contain-intrinsic-size 로 placeholder 크기 확보.
  // 가상 리스트 도입 시 보조적으로 작동.
  const cardCls = [
    'group relative flex h-full flex-col rounded-xl border bg-white text-left outline-none transition-all duration-200 w-full',
    compact ? 'min-h-[72px] [content-visibility:auto] [contain-intrinsic-size:72px]' : 'min-h-[156px] [content-visibility:auto] [contain-intrinsic-size:156px]',
    'hover:shadow-[0_8px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-blue-500',
    isAlert ? 'border-red-500 bg-red-50/40 ring-1 ring-red-500' : isWarn ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200 hover:border-slate-300',
  ].join(' ');

  const selfRateColor = selfRate == null ? 'text-slate-400' : 'text-slate-800';

  const mos = toNum(row.MOS);
  const mosLv = mosLevel(mos);
  const mosMeta = mosLv ? MOS_META[mosLv] : null;
  const mosDisplay = mos != null && mos >= 1.0 ? mos.toFixed(1) : null;

  return (
    <button type="button" onClick={() => onActivate?.(row)} className={cardCls}>
      {/* ─── ① 이름·DN·MoS + 상태 Tag ───────────────────────── */}
      <div className="flex items-start justify-between gap-2 px-4 pt-3.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-[14px] font-bold text-slate-900">{name}</span>
            {!compact && dn && <span className="font-mono text-[11px] text-slate-400 tabular-nums">{dn}</span>}
            {!compact && mosMeta && mosDisplay && (
              <Tooltip title={`MoS ${mosDisplay} · ${mosMeta.label} (${mosMeta.range})`} placement="top">
                <span className="inline-flex shrink-0 cursor-help items-center gap-1 rounded-full bg-slate-50 px-1.5 py-0.5 border border-slate-100">
                  <span className={`h-1.5 w-1.5 rounded-full ${mosMeta.dotBg}`} />
                  <span className={`font-mono text-[9px] font-bold tabular-nums ${mosMeta.text}`}>{mosDisplay}</span>
                </span>
              </Tooltip>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <Tag color={tagColor} className="!mr-0 font-bold border-none rounded-md px-2 py-0.5 text-[10px]">
            {statusLabel}
          </Tag>
        </div>
      </div>

      {/* ─── ② 시간 (compact 시 폰트 축소). 로그아웃은 시간 숨김. ─ */}
      <div className={compact ? 'px-4 pb-2' : 'px-4 pt-2'}>
        {meta.group === 'offline' ? (
          <div className={compact ? 'h-4' : 'h-8'} aria-hidden />
        ) : (
          <div className={`font-mono ${compact ? 'text-lg' : 'text-[26px]'} font-extrabold leading-none tabular-nums ${timeClass} tracking-tighter`}>{formatDuration(dur)}</div>
        )}
      </div>

      {/* ─── ④ KPI 2×2 그리드 — compact 면 전체 섹션 숨김 ─ */}
      {!compact && (
        <div className="mt-auto border-t border-slate-100 px-4 pb-3.5 pt-3 bg-slate-50/50 rounded-b-xl">
          <div className="-mt-6 mb-1.5 flex justify-end">
            <Tooltip title="비교 차트 보기" placement="top">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm border border-slate-200 transition-all group-hover:scale-110 group-hover:text-blue-600 group-hover:border-blue-200">
                <BarChart3 className="h-3.5 w-3.5" />
              </span>
            </Tooltip>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
            <Stat label="응대" value={ansCnt > 0 ? String(ansCnt) : '—'} />
            <Stat label="자율처리율" value={selfRate != null ? `${Math.round(selfRate)}%` : '—'} valueColor={selfRateColor} align="right" />
            <Stat label="통화시간" value={talkSec > 0 ? formatDuration(talkSec) : '—'} />
            <Stat label="평균통화" value={avgTalk > 0 ? formatDuration(avgTalk) : '—'} align="right" />
          </div>
        </div>
      )}

      {/* compact 모드: 우하단에 절대 위치 비교 아이콘 (KPI 섹션이 없으므로 별도) */}
      {compact && (
        <Tooltip title="비교 차트 보기" placement="top">
          <span className="absolute bottom-2 right-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm border border-slate-100 transition-all group-hover:text-blue-600 group-hover:border-blue-200">
            <BarChart3 className="h-3 w-3" />
          </span>
        </Tooltip>
      )}
    </button>
  );
}

// ─── 서브요소 ──────────────────────────────────────────────────

function Stat({ label, value, valueColor, align }: { label: string; value: string; valueColor?: string; align?: 'left' | 'right' }) {
  return (
    <div className={`flex items-center justify-between gap-1 min-w-0 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      <span className="text-slate-500 font-medium shrink-0">{label}</span>
      <span className={`font-mono font-bold tabular-nums truncate ${valueColor ?? 'text-slate-700'}`}>{value}</span>
    </div>
  );
}

// ─── formatter ─────────────────────────────────────────────────

function formatThresholdMinutes(m: number): string {
  if (m >= 1) return `${m}분`;
  return `${Math.round(m * 60)}초`;
}

/**
 * [성능 최적화] 커스텀 memo 비교 함수
 * 매초 갱신되는 nowMs가 들어오더라도, 실제 표시되는 '초(Duration)'가 변하지 않았으면 리렌더링하지 않음.
 */
export default memo(AgentCardImpl, (prev, next) => {
  // 데이터가 바뀌었거나 핵심 설정이 바뀌면 무조건 리렌더링
  if (prev.row !== next.row) return false;
  if (prev.compact !== next.compact) return false;
  if (prev.thresholds !== next.thresholds) return false;

  // 표시되는 '초' 단위 시간이 변했을 때만 렌더링 허용
  const prevSec = liveDurationSec(prev.row, prev.nowMs);
  const nextSec = liveDurationSec(next.row, next.nowMs);

  return prevSec === nextSec;
});
