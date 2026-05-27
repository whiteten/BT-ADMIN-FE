import { useMemo, useState } from 'react';
import { Tooltip } from 'antd';
import { ChevronDown } from 'lucide-react';
import { type AgentGroup, formatDuration, toNum } from '../helpers';
import { LEGACY_STATE_KEYS, statusKey, statusMeta } from '../statusMap';
import type { AgentRow, Density, StatusGroup, Threshold } from '../types';
import AgentCard from './AgentCard';
import AgentDot from './AgentDot';

/**
 * 그룹 섹션 — 큐/상태/카테고리 단위로 묶은 카드 컨테이너.
 *
 * 헤더 1행:
 *   ▾ VIP 상담  SKILL_3001   8명  [분포바]   ·   응대율 94%   처리 248
 */
export interface GroupSectionProps {
  group: AgentGroup;
  /** 필터 적용 전 동일 그룹의 전체 row — 헤더 요약(분포바·인원·KPI)에 사용. 없으면 group.rows 폴백. */
  allRows?: AgentRow[];
  density: Density;
  nowMs: number;
  thresholds?: Record<string, Threshold>;
  onActivate?: (row: AgentRow) => void;
  showHeader: boolean;
}

/** 칩 필터의 소프트 팔레트와 동일 색계열 (mid-tone) */
const DIST_BG_BY_GROUP: Record<StatusGroup, string> = {
  talking: 'bg-blue-400',
  available: 'bg-emerald-400',
  ringing: 'bg-amber-400',
  wrapup: 'bg-violet-400',
  offline: 'bg-slate-300',
};

export default function GroupSection({ group, allRows, density, nowMs, thresholds, onActivate, showHeader }: GroupSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  // 헤더 요약은 필터와 무관한 전체 그룹 분포로 (allRows). 카드 본문만 필터된 group.rows 사용.
  const summaryRows = allRows ?? group.rows;
  const dist = useMemo(() => statusDistribution(summaryRows), [summaryRows]);
  const stateCounts = useMemo(() => statusKeyCounts(summaryRows), [summaryRows]);
  const groupAvg = useMemo(() => computeGroupAverages(summaryRows), [summaryRows]);

  return (
    <section className="space-y-2">
      {showHeader && (
        <header className="flex flex-wrap items-center gap-3 border-b border-gray-200 pb-2">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:text-blue-600"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
            <span>{group.label}</span>
          </button>

          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-medium text-gray-600 tabular-nums">{summaryRows.length}명</span>

          <Tooltip
            title={
              <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-xs">
                {LEGACY_STATE_KEYS.map(({ key, label }) => (
                  <span key={key} className="contents">
                    <span className="text-white/80">{label}</span>
                    <span className="text-right font-mono tabular-nums">{stateCounts[key] ?? 0}</span>
                  </span>
                ))}
              </div>
            }
            placement="top"
          >
            <div className="flex h-2 w-28 overflow-hidden rounded-full border border-gray-200">
              {(['talking', 'available', 'ringing', 'wrapup', 'offline'] as StatusGroup[]).map((g) => {
                const n = dist[g];
                if (!n) return null;
                const w = (n / Math.max(1, summaryRows.length)) * 100;
                return <span key={g} className={DIST_BG_BY_GROUP[g]} style={{ width: `${w}%` }} />;
              })}
            </div>
          </Tooltip>

          {/* 우측 — 그룹 평균 5지표 */}
          <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
            <GroupStat label="처리량" value={fmtFloat(groupAvg.handled, 1)} />
            <GroupStat label="자율처리율" value={fmtPct(groupAvg.selfRate)} />
            <GroupStat label="평균통화" value={fmtDur(groupAvg.avgTalk)} />
            <GroupStat label="이석횟수" value={fmtFloat(groupAvg.auxCnt, 1)} />
            <GroupStat label="이석시간" value={fmtDur(groupAvg.auxTime)} />
          </div>
        </header>
      )}

      {!collapsed && (
        <>
          {density === 'card' && (
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {group.rows.map((r, i) => (
                <AgentCard key={`${group.id}_${rowKey(r, i)}`} row={r} nowMs={nowMs} thresholds={thresholds} onActivate={onActivate} />
              ))}
            </div>
          )}

          {density === 'row' && (
            <div className="grid gap-1.5 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-9">
              {group.rows.map((r, i) => (
                <AgentCard key={`${group.id}_${rowKey(r, i)}`} row={r} nowMs={nowMs} thresholds={thresholds} onActivate={onActivate} compact />
              ))}
            </div>
          )}

          {density === 'dot' && (
            <div className="grid gap-1 grid-cols-[repeat(auto-fill,minmax(22px,1fr))]">
              {group.rows.map((r, i) => (
                <AgentDot key={`${group.id}_${rowKey(r, i)}`} row={r} nowMs={nowMs} thresholds={thresholds} onActivate={onActivate} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function statusDistribution(rows: AgentRow[]): Record<StatusGroup, number> {
  const d: Record<StatusGroup, number> = { available: 0, talking: 0, ringing: 0, wrapup: 0, offline: 0 };
  for (const r of rows) d[statusMeta(r.AGENT_STATUS, r.REASON_CODE).group]++;
  return d;
}

/** statusKey 별 카운트 — 레거시 11 상태 그대로 표시용. */
function statusKeyCounts(rows: AgentRow[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const r of rows) {
    const k = statusKey(r.AGENT_STATUS, r.REASON_CODE);
    c[k] = (c[k] ?? 0) + 1;
  }
  return c;
}

/**
 * React key 생성 — Redis 키 `IC:AGENT:{GROUP_ID}:{MEDIA_TYPE}` 구조 반영.
 * 같은 (GROUP_ID, AGENT_ID) 라도 MEDIA_TYPE 이 다르면 별도 행이므로 키에 포함.
 */
function rowKey(r: AgentRow, idx: number): string {
  const id = r.AGENT_ID ?? r.AGENT_LOGIN_ID ?? r.LOGIN_DN_NO;
  if (id == null || id === '') return `i_${idx}`;
  const media = r.MEDIA_TYPE ?? '0';
  return `a_${id}_m_${media}`;
}

// ─── 그룹 평균 5지표 ────────────────────────────────────────────

interface GroupAverages {
  handled: number;
  selfRate: number;
  avgTalk: number; // 초
  auxCnt: number;
  auxTime: number; // 초
}

function computeGroupAverages(rows: AgentRow[]): GroupAverages {
  if (rows.length === 0) return { handled: 0, selfRate: 0, avgTalk: 0, auxCnt: 0, auxTime: 0 };
  let h = 0,
    sr = 0,
    srC = 0,
    at = 0,
    atC = 0,
    ac = 0,
    atime = 0;
  for (const r of rows) {
    h += (toNum(r.SUM_ANSW_CNT) ?? 0) + (toNum(r.SUM_OB_SUCC) ?? 0);
    const s = toNum(r.SELF_HANDLE_RATE);
    if (s != null) {
      sr += s;
      srC++;
    }
    const a = toNum(r.AVG_ANSTALK_TIME);
    if (a != null && a > 0) {
      at += a;
      atC++;
    }
    ac += toNum(r.AUX_CNT) ?? 0;
    atime += toNum(r.AUX_TIME) ?? 0;
  }
  const n = rows.length;
  return {
    handled: h / n,
    selfRate: srC > 0 ? sr / srC : 0,
    avgTalk: atC > 0 ? at / atC : 0,
    auxCnt: ac / n,
    auxTime: atime / n,
  };
}

function GroupStat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-gray-400">{label}</span>
      <span className="font-mono font-semibold tabular-nums text-gray-700">{value}</span>
    </span>
  );
}

function fmtFloat(v: number, digits = 1): string {
  if (!Number.isFinite(v) || v === 0) return '—';
  return v.toLocaleString(undefined, { maximumFractionDigits: digits });
}
function fmtPct(v: number): string {
  if (!Number.isFinite(v) || v === 0) return '—';
  return `${Math.round(v)}%`;
}
function fmtDur(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '—';
  return formatDuration(sec);
}
