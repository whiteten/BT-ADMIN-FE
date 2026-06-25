/**
 * 상담사 여정 타임라인 컴포넌트 (v3)
 *
 * BE 파서(AgentStateLogParser.java) 기반 구조:
 *   - SESSION(priority=99): 얇은 배경 레인 — 세션 범위 표시
 *   - 주 상태(priority<99): CALL_IN/CALL_OUT/DIALING/HELD/READY/AFTERWORK/NOTREADY
 *     → BE 상태머신 상 시간 비중첩이 보장됨 → 단일 트랙 1행에 타일링
 *     → 행 라벨: "상태" 고정 (첫 스팬 상태로 오라벨 절대 금지)
 *   - 마커 행: 이벤트 마커 점 1줄
 *   - 범례: 실제 사용 상태→색 표시
 *   - 클릭 inline expand 유지
 *   - 시간축: 로컬 시각 기준 (toISOString 금지)
 *
 * clamp 규칙:
 *   left ∈ [0, 100)
 *   width = min(100-left, max(min(MIN_SPAN_PCT, 100-left), rawWidth))
 *   → left + width ≤ 100 절대 보장, minWidth px 사용 안 함
 */
import { useMemo, useState } from 'react';
import type { Timeline, TimelineSpan } from '../types';

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function parseTimeSec(t: string): number {
  const [hms = '', frac = '0'] = t.split('.');
  const [hStr = '0', mStr = '0', sStr = '0'] = hms.split(':');
  return parseInt(hStr, 10) * 3600 + parseInt(mStr, 10) * 60 + parseInt(sStr, 10) + parseFloat(`0.${frac}`);
}

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

function hexRgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function contrastColor(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 160 ? '#1f2937' : '#ffffff';
  } catch {
    return '#1f2937';
  }
}

// ─── 상수 ────────────────────────────────────────────────────────────────────

const GUTTER_W = 100; // px — 좌측 라벨 거터
const SESSION_H = 12; // px — SESSION 배경 레인 높이
const MAIN_H = 40; // px — 주 상태 단일 트랙 높이
const MARKER_H = 28; // px — 마커 행 높이
const MIN_SPAN_PCT = 0.15; // % 최소 스팬 폭 (단, 100-left 초과 금지)
const SESSION_PRIORITY = 99; // 이 값 이상이면 SESSION 분류

// BE SpanMeta 와 동일한 정의 (범례용)
const STATE_DEFS: { state: string; label: string; colorHex: string }[] = [
  { state: 'READY', label: '대기(Ready)', colorHex: '#22C55E' },
  { state: 'CALL_IN', label: '통화 중(인바운드)', colorHex: '#3B82F6' },
  { state: 'CALL_OUT', label: '통화 중(아웃바운드)', colorHex: '#6366F1' },
  { state: 'DIALING', label: '발신 중(다이얼)', colorHex: '#38BDF8' },
  { state: 'HELD', label: '보류(홀드)', colorHex: '#F97316' },
  { state: 'AFTERWORK', label: '후처리(AfterWork)', colorHex: '#EAB308' },
  { state: 'NOTREADY', label: '이석(NotReady)', colorHex: '#EF4444' },
  { state: 'SESSION', label: '로그인 세션', colorHex: '#E5E7EB' },
];

// ─── 내부 타입 ────────────────────────────────────────────────────────────────

interface SpanPos {
  span: TimelineSpan;
  leftPct: number;
  widthPct: number;
  durSec: number;
  globalIdx: number;
}

type ExpandKey = `span-${number}` | `marker-${number}`;

// ─── 서브 컴포넌트 ────────────────────────────────────────────────────────────

function GridBg() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: 'repeating-linear-gradient(to right,transparent 0,transparent calc(10% - 1px),#f1f5f9 calc(10% - 1px),#f1f5f9 10%)',
      }}
    />
  );
}

function ExpandPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex border-t border-slate-100">
      <div style={{ width: GUTTER_W, flexShrink: 0 }} className="border-r border-slate-200 bg-slate-50" />
      <div className="flex-1 px-4 py-2.5 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-6 gap-y-2 bg-white">{children}</div>
    </div>
  );
}

function ExpandItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-slate-400">{label}</span>
      <span className="text-[11px] font-medium text-slate-800 font-mono">{value}</span>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

interface Props {
  timeline: Timeline;
}

export default function AgentJourneyTimeline({ timeline }: Props) {
  const { spans, markers } = timeline;
  const [expandKey, setExpandKey] = useState<ExpandKey | null>(null);

  function toggleExpand(key: ExpandKey) {
    setExpandKey((prev) => (prev === key ? null : key));
  }

  // ── 시간 범위 ─────────────────────────────────────────────────────────────
  const { startSec, totalSec } = useMemo(() => {
    const times: number[] = [];
    spans.forEach((sp) => {
      times.push(parseTimeSec(sp.startTime));
      times.push(parseTimeSec(sp.endTime));
    });
    markers.forEach((mk) => times.push(parseTimeSec(mk.time)));
    if (times.length === 0) return { startSec: 0, totalSec: 1 };
    const mn = Math.min(...times);
    const mx = Math.max(...times);
    return { startSec: mn, totalSec: Math.max(1, mx - mn) };
  }, [spans, markers]);

  function toPct(sec: number): number {
    return Math.max(0, Math.min(100, ((sec - startSec) / totalSec) * 100));
  }

  /**
   * 스팬 위치 계산 — clamp 보장:
   * 1) left ∈ [0, 100)
   * 2) width = min(100-left, max(min(MIN_SPAN_PCT,100-left), rawWidth))
   *    → left+width ≤ 100 절대 보장, minWidth px 사용 안 함
   */
  function calcPos(sp: TimelineSpan, gIdx: number): SpanPos {
    const spStart = parseTimeSec(sp.startTime);
    const durSec = Math.max(0, parseTimeSec(sp.endTime) - spStart);
    const rawLeft = toPct(spStart);
    const rawWidth = totalSec > 0 ? (durSec / totalSec) * 100 : 0;
    const left = Math.max(0, Math.min(99.9, rawLeft));
    const maxWidth = 100 - left;
    const width = Math.min(maxWidth, Math.max(Math.min(MIN_SPAN_PCT, maxWidth), rawWidth));
    return { span: sp, leftPct: left, widthPct: width, durSec, globalIdx: gIdx };
  }

  // ── 스팬 분류 ─────────────────────────────────────────────────────────────
  const { sessionSpans, mainSpans } = useMemo(() => {
    const session: SpanPos[] = [];
    const main: SpanPos[] = [];
    spans.forEach((sp, i) => {
      const pos = calcPos(sp, i);
      if (sp.priority >= SESSION_PRIORITY) session.push(pos);
      else main.push(pos);
    });
    // 주 상태 시간순 정렬 (BE 보장이지만 방어적으로)
    main.sort((a, b) => a.leftPct - b.leftPct);
    return { sessionSpans: session, mainSpans: main };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spans, startSec, totalSec]);

  // ── 마커 위치 ─────────────────────────────────────────────────────────────
  const markerPositions = useMemo(
    () => markers.map((mk, i) => ({ marker: mk, leftPct: toPct(parseTimeSec(mk.time)), idx: i })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markers, startSec, totalSec],
  );

  // ── 시간축 tick ───────────────────────────────────────────────────────────
  const axisTicks = useMemo(() => {
    let interval: number;
    if (totalSec <= 600) interval = 60;
    else if (totalSec <= 3600) interval = 300;
    else if (totalSec <= 14400) interval = 600;
    else interval = 1800;

    const firstTick = Math.ceil(startSec / interval) * interval;
    const ticks: { pct: number; label: string }[] = [];
    for (let s = firstTick; s <= startSec + totalSec + 1; s += interval) {
      const h = Math.floor(s / 3600);
      const m2 = Math.floor((s % 3600) / 60);
      const s2 = Math.floor(s % 60);
      const label = `${String(h).padStart(2, '0')}:${String(m2).padStart(2, '0')}${s2 > 0 ? `:${String(s2).padStart(2, '0')}` : ''}`;
      ticks.push({ pct: toPct(s), label });
    }
    return ticks;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSec, totalSec]);

  // ── 범례: 실제 스팬에 등장한 상태만 ─────────────────────────────────────
  const usedStates = useMemo(() => {
    const stateSet = new Set(spans.map((sp) => sp.state));
    return STATE_DEFS.filter((d) => stateSet.has(d.state));
  }, [spans]);

  // ── 스팬 버튼 렌더 ──────────────────────────────────────────────────────
  function renderSpanBtn(sp: SpanPos, height: number) {
    const key: ExpandKey = `span-${sp.globalIdx}`;
    const isOpen = expandKey === key;
    const tc = contrastColor(sp.span.colorHex);
    const showLabel = sp.widthPct > 5;
    const showDur = sp.widthPct > 10;

    return (
      <button
        key={key}
        type="button"
        onClick={() => toggleExpand(key)}
        title={`${sp.span.label} · ${fmtTime(sp.span.startTime)} ~ ${fmtTime(sp.span.endTime)} · ${fmtDur(sp.durSec)}`}
        style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          left: `${sp.leftPct.toFixed(3)}%`,
          width: `${sp.widthPct.toFixed(3)}%`,
          height,
          background: sp.span.colorHex,
          color: tc,
          border: `1px solid ${hexRgba(sp.span.colorHex, 0.7)}`,
          borderRadius: 4,
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 5px',
          gap: 3,
          fontSize: 11,
          fontWeight: 500,
          cursor: 'pointer',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          outline: isOpen ? '2px solid #f59e0b' : undefined,
          outlineOffset: isOpen ? 1 : undefined,
        }}
        className="hover:brightness-90 transition-[filter]"
      >
        {showLabel && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>{sp.span.label}</span>}
        {showDur && <span style={{ fontFamily: 'SF Mono,Consolas,monospace', fontSize: 10, opacity: 0.8, flexShrink: 0 }}>{fmtDur(sp.durSec)}</span>}
      </button>
    );
  }

  function renderSpanExpand(sp: SpanPos) {
    const key: ExpandKey = `span-${sp.globalIdx}`;
    if (expandKey !== key) return null;
    return (
      <ExpandPanel key={`exp-${key}`}>
        <ExpandItem label="상태" value={sp.span.label} />
        <ExpandItem label="상태 코드" value={sp.span.state} />
        <ExpandItem label="시작 시간" value={fmtTime(sp.span.startTime)} />
        <ExpandItem label="종료 시간" value={fmtTime(sp.span.endTime)} />
        <ExpandItem label="지속 시간" value={fmtDur(sp.durSec)} />
      </ExpandPanel>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ minWidth: 600 }}>
      {/* ── 범례 ─────────────────────────────────────────────────────────── */}
      {usedStates.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 border-b border-slate-100 bg-slate-50/60">
          {usedStates.map((d) => (
            <span key={d.state} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
              <span
                className="inline-block rounded-sm flex-shrink-0"
                style={{
                  width: 12,
                  height: 10,
                  background: d.colorHex,
                  border: `1px solid ${hexRgba(d.colorHex, 0.5)}`,
                }}
              />
              {d.label}
            </span>
          ))}
        </div>
      )}

      {/* ── 시간축 헤더 (sticky) ─────────────────────────────────────────── */}
      <div className="flex items-stretch border-b border-slate-200 bg-slate-50" style={{ position: 'sticky', top: 0, zIndex: 10, height: 26, flexShrink: 0 }}>
        <div style={{ width: GUTTER_W, flexShrink: 0 }} className="border-r border-slate-200" />
        <div className="flex-1 relative overflow-hidden">
          {axisTicks.map((tk, i) => (
            <span key={i} style={{ position: 'absolute', left: `${tk.pct.toFixed(2)}%`, top: 0, bottom: 0, pointerEvents: 'none' }}>
              <span style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 1, background: '#d1d5db' }} />
              <span
                style={{
                  position: 'absolute',
                  top: 5,
                  left: 3,
                  fontSize: 10,
                  color: '#6b7280',
                  fontFamily: 'SF Mono,Consolas,monospace',
                  whiteSpace: 'nowrap',
                }}
              >
                {tk.label}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* ── SESSION 배경 레인 (priority=99, 얇은 띠) ─────────────────────── */}
      {sessionSpans.length > 0 && (
        <div className="flex items-stretch border-b border-slate-100" style={{ height: SESSION_H }}>
          <div style={{ width: GUTTER_W, flexShrink: 0 }} className="border-r border-slate-200 bg-slate-50 flex items-center justify-end px-2">
            <span className="text-[9px] text-slate-400">세션</span>
          </div>
          <div className="flex-1 relative bg-white overflow-hidden" style={{ height: SESSION_H }}>
            {sessionSpans.map((sp) => (
              <div
                key={`sess-${sp.globalIdx}`}
                style={{
                  position: 'absolute',
                  top: 1,
                  bottom: 1,
                  left: `${sp.leftPct.toFixed(3)}%`,
                  width: `${sp.widthPct.toFixed(3)}%`,
                  background: hexRgba(sp.span.colorHex, 0.5),
                  border: `1px solid ${hexRgba(sp.span.colorHex, 0.8)}`,
                  borderRadius: 2,
                }}
                title={`로그인 세션: ${fmtTime(sp.span.startTime)} ~ ${fmtTime(sp.span.endTime)}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── 주 상태 단일 트랙 1행 ────────────────────────────────────────── */}
      {mainSpans.length > 0 && (
        <div>
          <div className="flex items-stretch border-b border-slate-200" style={{ minHeight: MAIN_H }}>
            <div style={{ width: GUTTER_W, flexShrink: 0 }} className="border-r border-slate-200 bg-slate-50 flex items-center justify-end px-2">
              {/*
               * 행 라벨: "상태" 고정.
               * 첫 스팬 상태(CALL_IN 등)로 표기하면 라벨≠내용 불일치 발생 — 절대 금지.
               */}
              <span className="text-[11px] text-slate-500 font-medium">상태</span>
            </div>
            <div className="flex-1 relative bg-white overflow-hidden" style={{ height: MAIN_H }}>
              <GridBg />
              {mainSpans.map((sp) => renderSpanBtn(sp, MAIN_H - 10))}
            </div>
          </div>
          {/* expand 패널 — 열린 스팬의 것만 렌더 */}
          {mainSpans.map((sp) => renderSpanExpand(sp))}
        </div>
      )}

      {/* ── 마커 행 (이벤트 마커, 단일 얇은 행) ─────────────────────────── */}
      {markerPositions.length > 0 && (
        <div>
          <div className="flex items-stretch border-b border-slate-100" style={{ minHeight: MARKER_H }}>
            <div style={{ width: GUTTER_W, flexShrink: 0 }} className="border-r border-slate-200 bg-slate-50 flex items-center justify-end px-2">
              <span className="text-[10px] text-slate-400 font-medium">이벤트</span>
            </div>
            <div className="flex-1 relative bg-white overflow-hidden" style={{ height: MARKER_H }}>
              <GridBg />
              {markerPositions.map((mp) => {
                const mKey: ExpandKey = `marker-${mp.idx}`;
                const isOpen = expandKey === mKey;
                return (
                  <button
                    key={mp.idx}
                    type="button"
                    onClick={() => toggleExpand(mKey)}
                    title={`${mp.marker.label} · ${fmtTime(mp.marker.time)}`}
                    style={{
                      position: 'absolute',
                      left: `${mp.leftPct.toFixed(3)}%`,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      // 과밀 구역: z-index idx 순 쌓기 + padding 투명 hit-area 확장
                      zIndex: mp.idx + 1,
                      padding: 5,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    className="group"
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: mp.marker.colorHex,
                        border: '2px solid white',
                        boxShadow: `0 0 0 1px ${hexRgba(mp.marker.colorHex, 0.5)}`,
                        outline: isOpen ? '2px solid #f59e0b' : undefined,
                        transition: 'transform 0.1s',
                      }}
                      className="group-hover:scale-125"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 마커 expand 패널 */}
          {markerPositions.map((mp) => {
            const mKey: ExpandKey = `marker-${mp.idx}`;
            if (expandKey !== mKey) return null;
            return (
              <ExpandPanel key={mKey}>
                <ExpandItem label="이벤트" value={mp.marker.label} />
                <ExpandItem label="이벤트 타입" value={mp.marker.eventType} />
                <ExpandItem label="시간" value={fmtTime(mp.marker.time)} />
                {mp.marker.rawToken && <ExpandItem label="원천 토큰" value={mp.marker.rawToken} />}
              </ExpandPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
