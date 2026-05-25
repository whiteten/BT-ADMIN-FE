import { useMemo, useState } from 'react';
import { DEFAULT_THRESHOLDS, GROUP_LABEL, statusKey, statusMeta } from './statusMap';
import type { AgentRow, StatusGroup } from './types';
import NoData from '@/components/custom/NoData';

/**
 * 상담사 상태 모니터링 위젯 (시안 `05-agent-monitor-widget.html` 카드뷰).
 *
 * v0.1 범위 — 시안의 카드뷰만 구현. 다음은 v0.2 이후로 보류:
 * - 세부 12종 상태 펼치기
 * - 큐별 그룹화·정렬·검색
 * - 리스트뷰·컴팩트뷰·설정 시트
 *
 * 데이터 흐름:
 *   BE INSIGHT AgentStatusWidget → WebSocket DATA → useDashboardSocket
 *   → widgetData[widgetId].rows (List<Map<String, Object>>) → 이 컴포넌트
 *
 * Redis 응답이 비어 있으면 빈 배열이 전달되어 NoData가 표시된다
 * (시안 §6 "필터 결과 없음" / "데이터 없음" 화면).
 */
export interface AgentStatusWidgetProps {
  /** WebSocket DATA 프레임의 `data` 필드 (List<AgentRow>). */
  data: unknown;
}

const ALL_GROUPS: StatusGroup[] = ['available', 'talking', 'ringing', 'wrapup', 'offline'];
const DEFAULT_ACTIVE_GROUPS: StatusGroup[] = ['available', 'talking', 'ringing', 'wrapup'];

export default function AgentStatusWidget({ data }: AgentStatusWidgetProps) {
  const rows = useMemo(() => toAgentRows(data), [data]);

  // 시맨틱 그룹 필터 (다중 토글). 기본: 가용/통화/호출/후처리·이석.
  const [activeGroups, setActiveGroups] = useState<Set<StatusGroup>>(() => new Set(DEFAULT_ACTIVE_GROUPS));

  const groupCounts = useMemo(() => countByGroup(rows), [rows]);
  const alertCount = useMemo(() => countAlerts(rows), [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => activeGroups.has(statusMeta(r.AGENT_STATUS, r.REASON_CODE).group)).sort((a, b) => (toSec(b.STATUS_DURATION) ?? 0) - (toSec(a.STATUS_DURATION) ?? 0));
  }, [rows, activeGroups]);

  const toggleGroup = (g: StatusGroup) => {
    setActiveGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── 상태 요약 띠 ─────────────────────────────────────────── */}
      <div className="bg-[var(--color-bt-bg-muted)]/40 px-3 py-2 flex flex-wrap items-center gap-1.5 text-[10.5px]">
        <div className="flex items-center gap-1 rounded border border-[var(--color-bt-border)] bg-white px-1.5 py-0.5">
          <span className="text-[9px] uppercase tracking-wider text-[var(--color-bt-fg-muted)]">전체</span>
          <span className="mono font-bold text-[12.5px]">{rows.length}</span>
        </div>
        <span className="text-[var(--color-bt-border)]">=</span>

        {ALL_GROUPS.map((g) => (
          <GroupChip key={g} group={g} count={groupCounts[g]} active={activeGroups.has(g)} onClick={() => toggleGroup(g)} />
        ))}

        {alertCount > 0 && (
          <div className="ml-auto inline-flex items-center gap-1 rounded border-2 border-[var(--color-bt-danger)] bg-[var(--color-bt-danger-soft)] px-1.5 py-0.5">
            <span className="text-[9.5px] font-semibold text-[var(--color-bt-danger)]">⚠ 임계 초과</span>
            <span className="mono font-bold text-[var(--color-bt-danger)] text-[12px]">{alertCount}</span>
          </div>
        )}
      </div>

      {/* ── 본문: 카드 격자 또는 빈 상태 ─────────────────────────── */}
      <div className="flex-1 overflow-auto p-3">
        {filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <NoData message={rows.length === 0 ? '실시간 상담사 데이터가 없습니다.' : '필터 조건에 맞는 상담사가 없습니다.'} fontSize="text-sm" iconSize={36} gap={2} />
          </div>
        ) : (
          <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {filtered.map((r) => (
              <AgentCard key={agentKey(r)} row={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Subcomponents
// ────────────────────────────────────────────────────────────────────

interface GroupChipProps {
  group: StatusGroup;
  count: number;
  active: boolean;
  onClick: () => void;
}

function GroupChip({ group, count, active, onClick }: GroupChipProps) {
  const styles = GROUP_CHIP_STYLES[group];
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-colors',
        active ? `border-2 ${styles.activeBorder} ${styles.activeBg}` : `border ${styles.idleBorder} ${styles.idleBg} opacity-70 hover:opacity-100`,
      ].join(' ')}
      title={`${GROUP_LABEL[group]} ${count}명 — 클릭으로 표시 토글`}
    >
      <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
      <span className={`text-[10px] font-semibold ${styles.text}`}>{GROUP_LABEL[group]}</span>
      <span className={`mono text-[12px] font-bold ${styles.text}`}>{count}</span>
    </button>
  );
}

const GROUP_CHIP_STYLES: Record<
  StatusGroup,
  {
    activeBorder: string;
    activeBg: string;
    idleBorder: string;
    idleBg: string;
    dot: string;
    text: string;
  }
> = {
  available: {
    activeBorder: 'border-[var(--color-bt-success)]',
    activeBg: 'bg-[var(--color-bt-success-soft)]',
    idleBorder: 'border-[var(--color-bt-border)]',
    idleBg: 'bg-white',
    dot: 'bg-[var(--color-bt-success)]',
    text: 'text-[var(--color-bt-success)]',
  },
  talking: {
    activeBorder: 'border-[var(--color-bt-primary)]',
    activeBg: 'bg-[var(--color-bt-primary-soft)]',
    idleBorder: 'border-[var(--color-bt-border)]',
    idleBg: 'bg-white',
    dot: 'bg-[var(--color-bt-primary)]',
    text: 'text-[var(--color-bt-primary)]',
  },
  ringing: {
    activeBorder: 'border-[var(--color-bt-warn)]',
    activeBg: 'bg-[var(--color-bt-warn-soft)]',
    idleBorder: 'border-[var(--color-bt-border)]',
    idleBg: 'bg-white',
    dot: 'bg-[var(--color-bt-warn)]',
    text: 'text-[var(--color-bt-warn)]',
  },
  wrapup: {
    activeBorder: 'border-[#9b7dff]',
    activeBg: 'bg-[#f5f0fa]',
    idleBorder: 'border-[var(--color-bt-border)]',
    idleBg: 'bg-white',
    dot: 'bg-[#9b7dff]',
    text: 'text-[#7a4e9e]',
  },
  offline: {
    activeBorder: 'border-[var(--color-bt-fg-muted)]',
    activeBg: 'bg-[var(--color-bt-bg-muted)]',
    idleBorder: 'border-[var(--color-bt-border)]',
    idleBg: 'bg-white',
    dot: 'bg-[var(--color-bt-fg-muted)]',
    text: 'text-[var(--color-bt-fg-muted)]',
  },
};

interface AgentCardProps {
  row: AgentRow;
}

function AgentCard({ row }: AgentCardProps) {
  const meta = statusMeta(row.AGENT_STATUS, row.REASON_CODE);
  const durationSec = toSec(row.STATUS_DURATION) ?? 0;
  const time = formatDuration(durationSec);

  const sKey = statusKey(row.AGENT_STATUS, row.REASON_CODE);
  const th = DEFAULT_THRESHOLDS[sKey];
  const minutes = durationSec / 60;
  const isAlert = !!(th && minutes > th.alarm);
  const isWarn = !!(th && !isAlert && minutes > th.notice);

  // 색상 결정 — 임계 초과 시 빨강, 경고 시 노랑, 평상시 상태색
  const colorVar = isAlert ? 'var(--color-bt-danger)' : isWarn ? 'var(--color-bt-warn)' : statusColorVar(meta.color);

  const cardBorder = isAlert
    ? 'border-[var(--color-bt-danger)] shadow-[0_0_0_1.5px_var(--color-bt-danger)]'
    : isWarn
      ? 'border-[var(--color-bt-warn)]/60'
      : 'border-[var(--color-bt-border)]';

  const initial = (row.AGENT_NAME ?? '').toString().trim().charAt(0) || '?';
  const agentLabel = (row.AGENT_NAME ?? row.AGENT_LOGIN_ID ?? row.AGENT_ID ?? '?').toString();
  const subLabel = [row.LOGIN_DN_NO, row.AGENT_LOGIN_ID]
    .filter((v) => v !== undefined && v !== null && v !== '')
    .map((v) => String(v))
    .join(' · ');

  return (
    <div className={`relative rounded border bg-white p-2.5 transition-shadow hover:shadow-md ${cardBorder}`} title={`AGENT_ID ${row.AGENT_ID ?? '-'} · ${meta.label} ${time}`}>
      {/* 좌측 듀레이션 바 — 시간 길어질수록 채워짐 (임계 초과 시 빨강 가득) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: colorVar, opacity: isAlert ? 1 : Math.max(0.18, Math.min(1, minutes / Math.max(th?.alarm ?? 10, 1))) }}
      />

      {/* 우상단 — 임계 배지 + 펄스 점 */}
      <div className="absolute right-2 top-2 flex items-center gap-1">
        {isAlert && <span className="rounded bg-[var(--color-bt-danger)] px-1 py-px text-[8.5px] font-bold text-white">⚠</span>}
        <span
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor: colorVar,
            boxShadow: `0 0 0 4px ${colorVar}33`,
          }}
        />
      </div>

      {/* 이니셜 + 이름 */}
      <div className="mb-1.5 flex items-center gap-1.5 pl-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold" style={{ backgroundColor: `${colorVar}1a`, color: colorVar }}>
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="truncate text-[11px] font-semibold leading-tight">{agentLabel}</div>
          <div className="mono text-[9px] text-[var(--color-bt-fg-muted)] leading-tight truncate">{subLabel || ' '}</div>
        </div>
      </div>

      {/* 상태 라벨 + 시간 */}
      <div className="pl-1">
        <div className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: colorVar }}>
          {meta.label}
          {isAlert ? ' · 임계 초과' : isWarn ? ` · ${th?.notice ?? 0}분↑` : ''}
        </div>
        <div className="mono text-[18px] font-bold leading-tight" style={{ color: colorVar }}>
          {time}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Pure helpers
// ────────────────────────────────────────────────────────────────────

function toAgentRows(data: unknown): AgentRow[] {
  if (!Array.isArray(data)) return [];
  return data.filter((r): r is AgentRow => r !== null && typeof r === 'object');
}

function countByGroup(rows: AgentRow[]): Record<StatusGroup, number> {
  const c: Record<StatusGroup, number> = { available: 0, talking: 0, ringing: 0, wrapup: 0, offline: 0 };
  for (const r of rows) {
    c[statusMeta(r.AGENT_STATUS, r.REASON_CODE).group]++;
  }
  return c;
}

function countAlerts(rows: AgentRow[]): number {
  let n = 0;
  for (const r of rows) {
    const key = statusKey(r.AGENT_STATUS, r.REASON_CODE);
    const th = DEFAULT_THRESHOLDS[key];
    if (!th) continue;
    const m = (toSec(r.STATUS_DURATION) ?? 0) / 60;
    if (m > th.alarm) n++;
  }
  return n;
}

function toSec(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatDuration(sec: number): string {
  if (sec <= 0) return '0:00';
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function agentKey(r: AgentRow): string {
  return `${r.AGENT_ID ?? r.AGENT_LOGIN_ID ?? r.LOGIN_DN_NO ?? Math.random()}`;
}

function statusColorVar(color: string): string {
  switch (color) {
    case 'success':
      return 'var(--color-bt-success)';
    case 'primary':
      return 'var(--color-bt-primary)';
    case 'warn':
      return 'var(--color-bt-warn)';
    case 'wrap':
      return '#9b7dff';
    case 'muted':
      return 'var(--color-bt-fg-muted)';
    case 'danger':
      return 'var(--color-bt-danger)';
    default:
      return 'var(--color-bt-fg-muted)';
  }
}
