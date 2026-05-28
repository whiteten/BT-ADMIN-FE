import { memo } from 'react';
import { Tag, Tooltip } from 'antd';
import { Radar } from 'lucide-react';
import { formatDuration, liveDurationSec, mosLevel, toNum, toStr, totalTalkSec } from '../helpers';
import { DEFAULT_THRESHOLDS, alarmLevel, statusKey, statusMeta } from '../statusMap';
import type { AgentRow, Threshold } from '../types';
import { MOS_META } from './MosLegend';

/**
 * 상담사 카드 v3 — 레거시 모니터링 페이지급 정보 밀도.
 *
 *  ┌─────────────────────────────────────┐
 *  │ 김민서  3001       [통화 IB]        │  ① 이름·DN·스킬 + 상태 Tag
 *  │ ─────────────────────────────────── │
 *  │ 5:23                                │  ② 큰 시간 (focal)
 *  │ 010-3412-5510  ·  VIP 상담         │  ③ 컨텍스트 (ANI · 큐)
 *  │ ─────────────────────────────────── │
 *  │ 응대 31    평균 2:48    점유 ████▎  │  ④ 누적 KPI 3개 (응대수·평균·점유율 bar)
 *  │ 응대율 96%   후처리 0:42   전환 2%  │  ⑤ 응대율·후처리·전환 추가 행
 *  └─────────────────────────────────────┘
 *
 * 알람 상태:
 *   임계 초과 → 카드 보더 빨강 + 배경 red-50/40 + 시간 빨강 + Tag red
 *   주의      → 카드 보더 호박 + 시간 호박 + Tag orange
 *
 * 멀티콜: 상태 Tag 아래에 작은 ×N 배지.
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
  available: 'green',
  talking: 'blue',
  ringing: 'orange',
  wrapup: 'purple',
  offline: 'default',
};

/** 시간은 단일색(중성 회색). 상태 강조는 Tag 와 카드 보더에서. */
const TIME_COLOR = 'text-gray-900';
const TIME_COLOR_OFFLINE = 'text-gray-400';

function AgentCardImpl({ row, nowMs, thresholds, onActivate, compact = false }: AgentCardProps) {
  const meta = statusMeta(row.AGENT_STATUS, row.REASON_CODE);
  const dur = liveDurationSec(row, nowMs);
  const alarm = alarmLevel(row.AGENT_STATUS, row.REASON_CODE, dur, thresholds);
  const isAlert = alarm === 2;
  const isWarn = alarm === 1;

  const sKey = statusKey(row.AGENT_STATUS, row.REASON_CODE);
  const th = thresholds?.[sKey] ?? DEFAULT_THRESHOLDS[sKey];

  const tagColor = isAlert ? 'red' : isWarn ? 'orange' : TAG_COLOR_BY_GROUP[meta.group];
  const timeClass = meta.group === 'offline' ? TIME_COLOR_OFFLINE : TIME_COLOR;

  const name = toStr(row.AGENT_NAME) || toStr(row.AGENT_LOGIN_ID) || `#${row.AGENT_ID ?? '-'}`;
  const dn = toStr(row.LOGIN_DN_NO);
  const queue = toStr(row.LAST_ICQ_NAME).trim();

  // KPI 모음 — 응대, 자율처리율, 통화시간, 평균통화시간
  const ansCnt = toNum(row.SUM_ANSW_CNT) ?? 0;
  const selfRate = toNum(row.SELF_HANDLE_RATE);
  const talkSec = totalTalkSec(row);
  const avgTalk = toNum(row.AVG_ANSTALK_TIME) ?? 0;

  const statusLabel = meta.label + (isAlert ? ' · 초과' : isWarn && th ? ` · ${formatThresholdMinutes(th.notice)}↑` : '');

  // 비가시 영역 렌더 스킵 — content-visibility: auto + contain-intrinsic-size 로 placeholder 크기 확보.
  // 스크롤 진입 시 브라우저가 페인트/레이아웃 자동 실행. 천 단위 카드에서 초기 로드·스크롤 비용 큰폭 절감.
  const cardCls = [
    'group relative flex h-full flex-col rounded-lg border bg-white text-left outline-none transition-all',
    compact ? 'min-h-[68px] [content-visibility:auto] [contain-intrinsic-size:68px]' : 'min-h-[170px] [content-visibility:auto] [contain-intrinsic-size:170px]',
    'hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] focus-visible:ring-2 focus-visible:ring-blue-500',
    isAlert ? 'border-red-500 bg-red-50/40' : isWarn ? 'border-orange-400' : 'border-gray-200 hover:border-gray-300',
  ].join(' ');

  // 자율처리율 색상 — 임계 정책은 추후 설정으로 추가. 현재는 데이터 유무로만 회색/검정.
  const selfRateColor = selfRate == null ? 'text-gray-400' : 'text-gray-900';

  // MoS — null/음수면 표시 안 함 (mosLevel 이 null 반환)
  const mos = toNum(row.MOS);
  const mosLv = mosLevel(mos);
  const mosMeta = mosLv ? MOS_META[mosLv] : null;
  const mosDisplay = mos != null && mos >= 1.0 ? mos.toFixed(1) : null;

  return (
    <button type="button" onClick={() => onActivate?.(row)} className={cardCls}>
      {/* ─── ① 이름·DN·MoS + 상태 Tag ───────────────────────── */}
      <div className="flex items-start justify-between gap-2 px-3 pt-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="truncate text-sm font-semibold text-gray-900">{name}</span>
            {!compact && dn && <span className="font-mono text-xs text-gray-400 tabular-nums">{dn}</span>}
            {!compact && mosMeta && mosDisplay && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-50 px-1.5 py-0.5" title={`MoS ${mosDisplay} · ${mosMeta.label}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${mosMeta.dotBg}`} />
                <span className={`font-mono text-[10px] font-semibold tabular-nums ${mosMeta.text}`}>{mosDisplay}</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <Tag color={tagColor} className="!mr-0">
            {statusLabel}
          </Tag>
        </div>
      </div>

      {/* ─── ② 시간 (compact 시 폰트 축소). 로그아웃은 시간 숨김. ─ */}
      <div className={compact ? 'px-3 pb-1.5' : 'px-3 pt-1.5'}>
        {meta.group === 'offline' ? (
          <div className={compact ? 'h-4' : 'h-7'} aria-hidden />
        ) : (
          <div className={`font-mono ${compact ? 'text-base' : 'text-2xl'} font-bold leading-none tabular-nums ${timeClass}`}>{formatDuration(dur)}</div>
        )}
        {/* ─── ③ 큐 (통화중일 때만, compact 면 숨김) ─ */}
        {!compact &&
          (queue ? (
            <div className="mt-1 truncate text-xs text-gray-500" title={queue}>
              {queue}
            </div>
          ) : (
            <div className="mt-1 h-4" aria-hidden />
          ))}
      </div>

      {/* ─── ④ KPI 2×2 그리드 — compact 면 전체 섹션 숨김 ─ */}
      {!compact && (
        <div className="mt-auto border-t border-gray-200 px-3 pb-2.5 pt-2">
          <div className="-mt-4 mb-1 flex justify-end">
            <Tooltip title="비교 차트 보기" placement="top">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-gray-400 ring-1 ring-gray-200 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:ring-blue-200">
                <Radar className="h-3 w-3" />
              </span>
            </Tooltip>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
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
          <span className="absolute bottom-1.5 right-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-gray-400 ring-1 ring-gray-200 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:ring-blue-200">
            <Radar className="h-2.5 w-2.5" />
          </span>
        </Tooltip>
      )}
    </button>
  );
}

// ─── 서브요소 ──────────────────────────────────────────────────

function Stat({ label, value, valueColor, align }: { label: string; value: string; valueColor?: string; align?: 'left' | 'right' }) {
  return (
    <div className={`flex items-baseline gap-1 min-w-0 ${align === 'right' ? 'justify-end' : ''}`}>
      <span className="text-gray-500">{label}</span>
      <span className={`font-mono font-semibold tabular-nums truncate ${valueColor ?? 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

// ─── formatter ─────────────────────────────────────────────────

function formatThresholdMinutes(m: number): string {
  if (m >= 1) return `${m}분`;
  return `${Math.round(m * 60)}초`;
}

export default memo(AgentCardImpl);
