import { type ReactNode, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bell, BellOff, CheckCircle2, Search } from 'lucide-react';
import { toast } from '@/shared-util';
import { DEMO_ALARMS, isAlarmDemoMode } from './demoData';
import { SEV_BG, SEV_BG_SOFT, SEV_BORDER_SOFT, SEV_TEXT, type Severity, alarmEpoch, countAlarms, fmtAlarmTime, fmtRelative, isResolved, levelMeta, toAlarmRows } from './helpers';
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
  const rows = isAlarmDemoMode() ? DEMO_ALARMS : fallbackAlarms(toAlarmRows(data));

  const [search, setSearch] = useState('');
  const [unresolvedOnly, setUnresolvedOnly] = useState(true); // 시안 alertOnly 기본 ON
  const [activeLevels, setActiveLevels] = useState<Set<number>>(() => new Set([0, 1, 2, 3]));
  const [soundOn, setSoundOn] = useState(false); // 알람음 — 기본 OFF (관제 보드 다중 위젯 배려, 사용자 opt-in)

  const counts = countAlarms(rows);
  const nowMs = Date.now();

  // 신규 미복구 장애 도착 감지 → 토스트(+옵션 알람음). AS-IS errorStatus 의 "장애 발생" 알림 차용.
  // 최신 rows·soundOn 을 ref 로 흘려, data 프레임이 바뀔 때만 1회 평가 (초기 수신은 토스트 없이 seen 처리).
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  useEffect(() => {
    const current = rowsRef.current;
    if (!initializedRef.current) {
      for (const r of current) seenIdsRef.current.add(r.id);
      initializedRef.current = true;
      return;
    }
    const fresh = current.filter((r) => !isResolved(r) && !seenIdsRef.current.has(r.id));
    for (const r of current) seenIdsRef.current.add(r.id);
    if (fresh.length === 0) return;
    const top = [...fresh].sort((a, b) => b.level - a.level || alarmEpoch(b) - alarmEpoch(a))[0];
    const sys = top.systemName ?? `SYS ${top.systemId}`;
    const extra = fresh.length > 1 ? ` 외 ${fresh.length - 1}건` : '';
    toast.error(`[${sys}] ${top.code || '장애'} 발생${extra}`);
    if (soundRef.current && fresh.some((r) => r.level >= 2)) playAlarmBeep();
  }, [data]);

  // 데이터에 실재하는 등급만 칩으로 노출 (위험순 desc)
  const presentLevels = Array.from(new Set(rows.map((r) => r.level))).sort((a, b) => b - a);

  const needle = search.trim().toLowerCase();
  const visible = rows
    .filter((r) => activeLevels.has(r.level))
    .filter((r) => !unresolvedOnly || !isResolved(r))
    .filter((r) => (needle ? matchSearch(r, needle) : true))
    .slice()
    .sort((a, b) => alarmEpoch(b) - alarmEpoch(a));

  const toggleLevel = (lv: number) =>
    setActiveLevels((prev) => {
      const next = new Set(prev);
      if (next.has(lv)) next.delete(lv);
      else next.add(lv);
      return next;
    });

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto bg-bt-bg-canvas p-5">
      {/* ═══ KPI 스트립 ═══ */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="전체 장애" value={counts.total} />
        <StatTile label="미복구" value={counts.unresolved} sev="danger" pulse={counts.unresolved > 0} />
        <StatTile label="위험" sub="Lv≥2" value={counts.danger} sev="danger" />
        <StatTile label="주의" sub="Lv1" value={counts.warn} sev="warn" />
        <StatTile label="복구완료" value={counts.resolved} sev="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
      </section>

      {/* ═══ 필터 바 ═══ */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-bt-border bg-bt-bg px-4 py-2.5 bt-shadow">
        {presentLevels.map((lv) => {
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

        <span className="text-[11px] text-bt-fg-muted">
          표시 {visible.length} / 전체 {rows.length}
        </span>

        <button
          type="button"
          onClick={() => setSoundOn((b) => !b)}
          title="신규 위험 장애 도착 시 알람음"
          className={`ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[12px] font-semibold transition-colors ${
            soundOn ? 'bg-bt-primary-soft text-bt-primary' : 'bg-bt-bg-muted text-bt-fg-muted hover:text-bt-fg'
          }`}
        >
          {soundOn ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
          알람음 {soundOn ? '●ON' : '○OFF'}
        </button>

        <button
          type="button"
          onClick={() => setUnresolvedOnly((b) => !b)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[12px] font-semibold transition-colors ${
            unresolvedOnly ? 'bg-bt-danger-soft text-bt-danger' : 'bg-bt-bg-muted text-bt-fg-muted hover:text-bt-fg'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          미복구만 {unresolvedOnly ? '●ON' : '○OFF'}
        </button>
      </div>

      {/* ═══ 장애 이력 리스트 ═══ */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-bt-border bg-bt-bg bt-shadow">
        {/* 헤더 */}
        <div className="grid grid-cols-[150px_140px_72px_96px_1fr_120px] gap-2 border-b border-bt-border bg-bt-bg-muted/60 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-bt-fg-muted">
          <span>발생시각</span>
          <span>시스템</span>
          <span className="text-center">등급</span>
          <span>코드</span>
          <span>메시지</span>
          <span className="text-center">상태</span>
        </div>
        {/* 본문 */}
        {visible.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-16 text-[13px] text-bt-fg-muted">표시할 장애가 없습니다.</div>
        ) : (
          <div className="flex flex-col divide-y divide-bt-border overflow-y-auto">
            {visible.map((r) => (
              <AlarmRowItem key={r.id} row={r} nowMs={nowMs} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** 라이브 데이터가 비면 데모로 폴백 (BE 연동 전 임시 — 헬스보드와 동일 정책). */
function fallbackAlarms(live: AlarmRow[]): AlarmRow[] {
  return live.length > 0 ? live : DEMO_ALARMS;
}

function matchSearch(r: AlarmRow, needle: string): boolean {
  return [r.systemName, r.systemId, r.code, r.message, r.kind].some((v) => (v ?? '').toLowerCase().includes(needle));
}

// ─── 알람음 (Web Audio — 외부 음원 파일 의존 없이 짧은 2-tone 비프) ─────
let sharedAudioCtx: AudioContext | null = null;

/** 신규 위험 장애 알림음. 사용자 토글(opt-in)로만 호출되어 자동재생 정책에 안전. 실패 시 무음. */
function playAlarmBeep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    sharedAudioCtx ??= new Ctx();
    const ctx = sharedAudioCtx;
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    // 880Hz → 660Hz 2-tone, 총 ~0.3s, 페이드아웃으로 클릭음 제거
    [880, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + i * 0.15;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.15);
    });
  } catch {
    // 자동재생 차단·미지원 환경 — 무음 폴백
  }
}

// ─── KPI 타일 ──────────────────────────────────────────────────

function StatTile({ label, sub, value, sev, icon, pulse }: { label: string; sub?: string; value: number; sev?: Severity; icon?: ReactNode; pulse?: boolean }) {
  const accent = sev ? SEV_BG[sev] : 'bg-bt-border-strong';
  const text = sev ? SEV_TEXT[sev] : 'text-bt-fg';
  return (
    <div className={`relative flex flex-col overflow-hidden rounded-xl border border-bt-border bg-bt-bg px-4 pt-3.5 pb-3 bt-shadow ${pulse ? 'bt-pulse-ring' : ''}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <div className="flex items-center gap-1 text-[12px] font-bold uppercase tracking-wide text-bt-fg-muted">
        {icon}
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={`text-[28px] font-extrabold leading-none tabular-nums ${text}`}>{value}</span>
        {sub && <span className="text-[11px] text-bt-fg-muted">{sub}</span>}
      </div>
    </div>
  );
}

// ─── 장애 행 ───────────────────────────────────────────────────

function AlarmRowItem({ row, nowMs }: { row: AlarmRow; nowMs: number }) {
  const m = levelMeta(row.level);
  const resolved = isResolved(row);
  const danger = !resolved && row.level >= 2;
  return (
    <div
      className={`grid grid-cols-[150px_140px_72px_96px_1fr_120px] items-center gap-2 border-l-[4px] px-4 py-2.5 text-[12.5px] transition-colors hover:bg-bt-bg-muted/40 ${
        resolved ? 'border-l-bt-border-strong opacity-70' : m.sev === 'danger' ? 'border-l-bt-danger' : m.sev === 'warn' ? 'border-l-bt-warn' : 'border-l-bt-success'
      }`}
    >
      {/* 발생시각 */}
      <div className="leading-tight">
        <div className="tabular-nums font-semibold">{fmtAlarmTime(row)}</div>
        <div className="text-[10.5px] text-bt-fg-muted">{fmtRelative(alarmEpoch(row), nowMs)}</div>
      </div>
      {/* 시스템 */}
      <div className="truncate">
        <span className="font-semibold">{row.systemName ?? `SYS ${row.systemId}`}</span>
        {row.systemName && <span className="ml-1 tabular-nums text-[10.5px] text-bt-fg-muted">({row.systemId})</span>}
      </div>
      {/* 등급 */}
      <div className="text-center">
        <span className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: m.hex }}>
          {m.label}
        </span>
      </div>
      {/* 코드 */}
      <span className="tabular-nums font-mono text-[11.5px] text-bt-fg-muted">{row.code || '—'}</span>
      {/* 메시지 */}
      <span className={`truncate ${danger ? 'font-semibold' : ''}`} title={row.message}>
        {row.message || '—'}
      </span>
      {/* 상태 */}
      <div className="text-center">
        {resolved ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-bt-success-soft px-2 py-0.5 text-[11px] font-semibold text-bt-success">
            <CheckCircle2 className="h-3 w-3" />
            복구
          </span>
        ) : (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEV_BG_SOFT[m.sev]} ${SEV_TEXT[m.sev]}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${SEV_BG[m.sev]} ${danger ? 'bt-pulse' : ''}`} />
            미복구
          </span>
        )}
      </div>
    </div>
  );
}
