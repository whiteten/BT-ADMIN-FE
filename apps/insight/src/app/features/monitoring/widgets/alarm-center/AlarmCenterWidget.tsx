import { type ReactNode, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Search } from 'lucide-react';
import { toast } from '@/shared-util';
import { DEMO_ALARMS, isAlarmDemoMode } from './demoData';
import {
  SEV_BG,
  SEV_BG_SOFT,
  SEV_BORDER_SOFT,
  SEV_TEXT,
  type Severity,
  alarmEpoch,
  countAlarms,
  isResolved,
  levelMeta,
  readAlarmCounts,
  repairEpoch,
  toAlarmRows,
} from './helpers';
import AlarmCenterGrid from './parts/AlarmCenterGrid';
import type { AlarmRow } from './types';

/**
 * 알람센터 위젯 — "지금 살아있는 장애는? 어느 시스템이 언제부터?".
 *
 * 헬스보드 알람 카드("알람센터 →" 링크)의 드릴다운 상세 위젯.
 * 데이터: Oracle `TB_CC_ERRHISTORY` (장애 발생 이력) — 발생시각·시스템·등급·메시지·복구여부.
 *
 * 위젯 제목·실시간 표시·갱신 상태는 대시보드 카드 헤더(WidgetCardHeader)가 제공하므로
 * 위젯 자체 헤더는 두지 않는다. 캔버스 위 흰 카드 + bt-shadow, 상단 액센트 바로 상태 강조,
 * 미복구 위험 행에는 관제 톤 알림 모션(bt-pulse)을 적용한다.
 */
export interface AlarmCenterWidgetProps {
  data: unknown;
  options?: Record<string, unknown>;
  widgetId?: number | string;
  onRequestPause?: () => void;
}

export default function AlarmCenterWidget({ data }: AlarmCenterWidgetProps) {
  // BE 가 미복구 + 최근 복구된 시스템 장애를 함께 내린다(items). 복구행은 ERR_REPAIR_TIME 포함.
  // (명시적 데모는 URL ?alarmDemo=1 일 때만.)
  const rows = isAlarmDemoMode() ? DEMO_ALARMS : toAlarmRows(data);

  const [search, setSearch] = useState('');
  const [activeLevels, setActiveLevels] = useState<Set<number>>(() => new Set([0, 1, 2, 3]));

  // KPI 는 BE 집계(counts)를 우선 사용. 데모/집계 부재 시에만 리스트 기반 countAlarms 로 폴백.
  const counts = readAlarmCounts(data) ?? countAlarms(rows);

  // 신규 발생 / 복구 전환 감지 → 토스트. 복구행도 함께 내려오므로, "복구"는 직전에 미복구로 관측했던 행이
  // 이번 프레임에 복구(ERR_REPAIR_TIME 채워짐)된 것으로 판정한다(행은 삭제되지 않고 상태만 바뀜).
  // 최신 rows 를 ref 로 흘려, data 프레임이 바뀔 때만 1회 평가 (초기 수신은 토스트 없이 seen 처리).
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const seenIdsRef = useRef<Set<string>>(new Set()); // 한 번이라도 본 id (발생 중복 방지)
  const seenUnresolvedRef = useRef<Set<string>>(new Set()); // 미복구로 관측한 적 있는 id (복구 전환 판정 기준)
  const announcedRepairRef = useRef<Set<string>>(new Set()); // 이미 복구 알림한 id (재알림 방지)
  const initializedRef = useRef(false);
  useEffect(() => {
    const current = rowsRef.current;
    if (!initializedRef.current) {
      // 페이지 접근 시점의 이력은 알림 없이 기록만. 이미 복구된 행은 전환이 아니므로 복구알림 대상에서 제외.
      for (const r of current) {
        seenIdsRef.current.add(r.id);
        if (isResolved(r)) announcedRepairRef.current.add(r.id);
        else seenUnresolvedRef.current.add(r.id);
      }
      initializedRef.current = true;
      return;
    }
    // 발생: 처음 보는 미복구 행
    const fresh = current.filter((r) => !isResolved(r) && !seenIdsRef.current.has(r.id));
    // 복구 전환: 미복구로 관측했던 행이 이번 프레임에 복구됨(아직 알리지 않은 것만)
    const repaired = current.filter((r) => isResolved(r) && seenUnresolvedRef.current.has(r.id) && !announcedRepairRef.current.has(r.id));
    // 관측 상태 갱신
    for (const r of current) {
      seenIdsRef.current.add(r.id);
      if (!isResolved(r)) seenUnresolvedRef.current.add(r.id);
    }
    for (const r of repaired) announcedRepairRef.current.add(r.id);

    if (fresh.length > 0) {
      const top = [...fresh].sort((a, b) => b.level - a.level || alarmEpoch(b) - alarmEpoch(a))[0];
      const extra = fresh.length > 1 ? ` 외 ${fresh.length - 1}건` : '';
      toast.error(
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold">
            {levelMeta(top.level).label} 장애 발생 · {sysLabel(top)}
            {extra}
          </span>
          <span className="text-[12px] opacity-90">
            {top.processName ? `[${top.processName}] ` : ''}
            {top.message || `장애코드 ${top.code}` || '상세 메시지 없음'}
          </span>
        </div>,
      );
    }
    if (repaired.length > 0) {
      const top = [...repaired].sort((a, b) => b.level - a.level || alarmEpoch(b) - alarmEpoch(a))[0];
      const extra = repaired.length > 1 ? ` 외 ${repaired.length - 1}건` : '';
      toast.success(
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold">
            장애 복구 완료 · {sysLabel(top)}
            {extra}
          </span>
          <span className="text-[12px] opacity-90">
            {top.processName ? `[${top.processName}] ` : ''}
            {top.message || `장애코드 ${top.code}`}
          </span>
        </div>,
      );
    }
  }, [data]);

  // 상태 퀵버튼은 위험(3)·경고(2)·주의(1) 3개 고정 노출(데이터 유무와 무관). 0=정상은 알람 아님.
  const QUICK_LEVELS = [3, 2, 1];

  const needle = search.trim().toLowerCase();
  // 미복구를 상단(발생 최신순), 복구를 하단(복구 최신순)으로 정렬해 해소/미해소를 시각적으로 분리한다.
  const visible = rows
    .filter((r) => activeLevels.has(r.level))
    .filter((r) => (needle ? matchSearch(r, needle) : true))
    .slice()
    .sort((a, b) => {
      const ra = isResolved(a) ? 1 : 0;
      const rb = isResolved(b) ? 1 : 0;
      if (ra !== rb) return ra - rb; // 미복구(0) 위, 복구(1) 아래
      return ra === 1 ? repairEpoch(b) - repairEpoch(a) : alarmEpoch(b) - alarmEpoch(a);
    });

  const toggleLevel = (lv: number) =>
    setActiveLevels((prev) => {
      const next = new Set(prev);
      if (next.has(lv)) next.delete(lv);
      else next.add(lv);
      return next;
    });

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden bg-bt-bg-canvas p-5">
      {/* ═══ KPI 스트립 ═══ 전체 장애(최근 7일)에 등급별 총 발생 건수를 함께 표기. 위험·경고·주의 카드는 "지금 발생 중(미복구)" 기준. */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-7">
        <StatTile
          className="col-span-2"
          label="전체 장애"
          period="최근 7일"
          value={counts.total}
          hex="#1F79D4"
          blackValue
          right={
            <div className="flex flex-col gap-0.5 text-[11px] leading-tight text-bt-fg-muted">
              <LevelMini label="위험" value={counts.totalCritical} hex={levelMeta(3).hex} />
              <LevelMini label="경고" value={counts.totalMajor} hex={levelMeta(2).hex} />
              <LevelMini label="주의" value={counts.totalMinor} hex={levelMeta(1).hex} />
            </div>
          }
        />
        <StatTile label="미복구" value={counts.unresolved} sev="danger" pulse={counts.unresolved > 0} />
        <StatTile label="위험" sub="발생 중" value={counts.critical} hex={levelMeta(3).hex} pulse={counts.critical > 0} />
        <StatTile label="경고" sub="발생 중" value={counts.major} hex={levelMeta(2).hex} />
        <StatTile label="주의" sub="발생 중" value={counts.minor} hex={levelMeta(1).hex} />
        <StatTile label="복구완료" period="최근 7일" value={counts.resolved} sev="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
      </section>

      {/* ═══ 필터 바 ═══ */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-bt-border bg-bt-bg px-4 py-2.5 bt-shadow">
        {QUICK_LEVELS.map((lv) => {
          const active = activeLevels.has(lv);
          const m = levelMeta(lv);
          return (
            <button
              key={lv}
              type="button"
              onClick={() => toggleLevel(lv)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold transition-colors ${
                active ? `${SEV_BG_SOFT[m.sev]} ${SEV_TEXT[m.sev]} ${SEV_BORDER_SOFT[m.sev]}` : 'border-bt-border bg-bt-bg text-bt-fg-muted hover:bg-bt-bg-muted'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.hex }} />
              {m.label} <span className="tabular-nums">{rows.filter((r) => r.level === lv).length}</span>
            </button>
          );
        })}

        <div className="relative ml-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-bt-fg-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="시스템·코드·메시지 검색"
            className="h-7 w-[190px] rounded-lg border border-bt-border bg-bt-bg pl-8 pr-2.5 text-[12px] outline-none focus:border-bt-primary"
          />
        </div>

        <span className="ml-auto text-[11px] text-bt-fg-muted">
          표시 {visible.length} / 전체 {rows.length}
        </span>
      </div>

      {/* ═══ 장애 이력 표 (ag-Grid) ═══ */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-bt-border bg-bt-bg bt-shadow">
        <AlarmCenterGrid rows={visible} />
      </div>
    </div>
  );
}

function matchSearch(r: AlarmRow, needle: string): boolean {
  return [r.systemName, r.systemId, r.nodeName, r.processName, r.code, r.message, r.kind].some((v) => (v ?? '').toLowerCase().includes(needle));
}

/** 토스트용 시스템 라벨 — `노드명 · 시스템명` (노드/시스템명 없으면 가능한 값으로 폴백). */
function sysLabel(r: AlarmRow): string {
  const name = r.systemName ?? `SYS ${r.systemId}`;
  const node = r.nodeName ?? (r.nodeId ? `노드 ${r.nodeId}` : '');
  return node ? `${node} · ${name}` : name;
}

// ─── KPI 타일 ──────────────────────────────────────────────────

function StatTile({
  label,
  sub,
  period,
  value,
  sev,
  hex,
  icon,
  pulse,
  right,
  className,
  blackValue,
}: {
  label: string;
  sub?: string;
  period?: string;
  value: number;
  sev?: Severity;
  hex?: string;
  icon?: ReactNode;
  pulse?: boolean;
  right?: ReactNode;
  className?: string;
  blackValue?: boolean;
}) {
  // hex 지정 시 등급색(주의/경고/위험) 또는 임의색(전체=파랑)을 인라인으로 적용 — SEV(success/warn/danger)로 뭉뚱그리지 않고 구분.
  // blackValue 면 상태 바 색은 hex 로 두되 숫자는 기본 검정(text-bt-fg)으로 표기.
  const accent = hex ? '' : sev ? SEV_BG[sev] : 'bg-bt-border-strong';
  const text = blackValue ? 'text-bt-fg' : hex ? '' : sev ? SEV_TEXT[sev] : 'text-bt-fg';
  const valueStyle = !blackValue && hex ? { color: hex } : undefined;
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-xl border border-bt-border bg-bt-bg px-4 pt-3.5 pb-3 bt-shadow ${pulse ? 'bt-pulse-ring' : ''} ${className ?? ''}`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} style={hex ? { background: hex } : undefined} />
      <div className="flex items-center gap-1 text-[12px] font-bold uppercase tracking-wide text-bt-fg-muted">
        {icon}
        {label}
        {period && <span className="text-[10px] font-medium normal-case tracking-normal text-bt-fg-muted">· {period}</span>}
      </div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-[28px] font-extrabold leading-none tabular-nums ${text}`} style={valueStyle}>
            {value.toLocaleString()}
          </span>
          {sub && <span className="text-[11px] text-bt-fg-muted">{sub}</span>}
        </div>
        {right}
      </div>
    </div>
  );
}

/** 전체 장애 카드 우측의 등급별 발생 중(미복구) 미니 표기 — 컬러 점 + 라벨 + 건수. */
function LevelMini({ label, value, hex }: { label: string; value: number; hex: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: hex }} />
      {label}
      <b className="font-bold tabular-nums text-bt-fg">{value.toLocaleString()}</b>
    </span>
  );
}
