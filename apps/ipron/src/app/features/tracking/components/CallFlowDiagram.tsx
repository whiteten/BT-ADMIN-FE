/**
 * 콜 흐름 시각화 — v3 디자인 (가로축 = 시간, 세로축 = HOP 동적).
 *
 * 도메인 모델: PBX = 콜의 주인(owner)으로 콜 라이프사이클 전 구간 보유.
 * 자원(IVR/CTI/AGENT)은 각 HOP에서 활성. row 가 HOP 이라 자원 시간 겹침 시각 회피.
 *
 * 시각 구성 (위 → 아래):
 *  1. 시간축 — 적응형 단위 (5s / 10s / 30s / 2m / 5m)
 *  2. OWNER 띠 — 콜 전 구간 + HOP 마커 (각 hop startTime 의 진짜 시간 위치)
 *  3. HOP rows — 각 hop 의 자원 bar (시간 정확 척도, 자기 row 안에서)
 *
 * 디자인 토큰 (BT-ADMIN 라이트):
 *  brand #405189 · IVR 보라 · CTI 주황 · AGENT 초록 · INBOUND/OUTBOUND 네이비톤
 *  bt-shadow + rounded-md + border-gray-200
 */
import { useMemo } from 'react';
import { ChevronDown, Lock, LockOpen, Maximize2, Minimize2, X } from 'lucide-react';
import type { CallSegment } from '../types';
import { fmtAxisLabel, fmtDurFull as formatDur, fmtDurShort as formatDurShort } from '../utils/timeFormat';

interface Props {
  segments: CallSegment[]; // hopNodes (각 hop이 통합된 1 segment)
  /** 현재 단일 선택 (강조용 — 좌측 라벨 active) — 호환 유지 */
  selectedSegmentId: string | null;
  /** segment 선택 — null 전달 시 deselect (토글) */
  onSelect: (segmentId: string | null) => void;
  /** 열려있는 hop expand 들 (단일 + 핀 고정 가능). 없으면 selectedSegmentId 하나로 폴백. */
  openHopIds?: Set<string>;
  /** 핀 고정된 hop — 다른 hop 클릭 시에도 닫히지 않음 */
  pinnedHopIds?: Set<string>;
  /** hop expand 열기 (이미 열렸으면 no-op) */
  onOpen?: (segmentId: string) => void;
  /** hop expand 닫기 (X 버튼 전용) */
  onClose?: (segmentId: string) => void;
  /** 핀 토글 */
  onPinToggle?: (segmentId: string) => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
  /** hop bar 클릭 시 그 row 아래에 inline expand 될 자원 상세 (hop kind 별 컴포넌트). null 이면 expand 없음. */
  renderHopDetail?: (hop: CallSegment) => React.ReactNode;
}

// hop kind 별 컬러 (자원 bar 색)
const KIND_STYLE: Record<CallSegment['kind'], { bg: string; text: string; border: string; label: string }> = {
  INBOUND: { bg: '#DCE7F5', text: '#1d3a6b', border: '#B6CCE7', label: '인입' },
  OUTBOUND: { bg: '#DCE7F5', text: '#1d3a6b', border: '#B6CCE7', label: '발신' },
  QUEUE_IN: { bg: '#FFEDD5', text: '#9a3412', border: '#FDD9B0', label: '큐인입' },
  IVR: { bg: '#EDE9FE', text: '#5b21b6', border: '#DDD3FB', label: 'IVR' },
  CTI: { bg: '#FFEDD5', text: '#9a3412', border: '#FDD9B0', label: 'CTI' },
  AGENT: { bg: '#D1FAE5', text: '#065f46', border: '#A7F0CC', label: '내선' },
  DISCONNECT: { bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB', label: '종료' },
  OTHER: { bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB', label: '-' },
};

function hopContent(hop: CallSegment): string {
  const q = hop.meta?.queueName as string | undefined;
  const a = hop.meta?.agentName as string | undefined;
  const s = hop.meta?.serviceName as string | undefined;
  const t = hop.meta?.tName as string | undefined;
  if (hop.kind === 'AGENT') return a ?? t ?? '상담사';
  if (hop.kind === 'CTI' || hop.kind === 'QUEUE_IN') return q ? `Queue ${q}` : (s ?? t ?? '큐');
  if (hop.kind === 'IVR') return s ?? t ?? 'IVR';
  if (hop.kind === 'INBOUND') return t ? `→ ${t}` : '인입';
  if (hop.kind === 'OUTBOUND') return t ? `→ ${t}` : '발신';
  return hop.label ?? '-';
}

export default function CallFlowDiagram({
  segments,
  selectedSegmentId,
  onSelect,
  openHopIds,
  pinnedHopIds,
  onOpen,
  onClose,
  onPinToggle,
  expanded = false,
  onToggleExpand,
  renderHopDetail,
}: Props) {
  const isPinned = (id: string) => pinnedHopIds?.has(id) ?? false;
  // 다중 expand 헬퍼 — openHopIds 가 있으면 그걸 사용, 없으면 selectedSegmentId 단일 폴백
  const isExpanded = (id: string) => (openHopIds ? openHopIds.has(id) : selectedSegmentId === id);
  const openHop = (id: string) => {
    if (onOpen) onOpen(id);
    else onSelect(id); // 폴백
  };
  const closeHop = (id: string) => {
    if (onClose) onClose(id);
    else if (selectedSegmentId === id) onSelect(null); // 폴백
  };
  // 시간 척도
  const { totalSec, startMs } = useMemo(() => {
    if (segments.length === 0) return { totalSec: 0, startMs: 0 };
    const starts = segments.map((s) => new Date(s.startTime).getTime()).filter((n) => !Number.isNaN(n));
    if (starts.length === 0) return { totalSec: 0, startMs: 0 };
    const startMs = Math.min(...starts);
    const ends = segments.map((s) => {
      const t = new Date(s.startTime).getTime();
      const d = (s.durationSec ?? 0) * 1000;
      return Number.isFinite(t) ? t + d : 0;
    });
    const endMs = Math.max(...ends, startMs + 1000);
    const totalSec = Math.max(1, Math.ceil((endMs - startMs) / 1000));
    return { totalSec, startMs };
  }, [segments]);

  // 적응형 시간 단위
  const axisTicks = useMemo(() => {
    if (totalSec === 0) return [];
    let interval: number;
    if (totalSec <= 30) interval = 5;
    else if (totalSec <= 60) interval = 10;
    else if (totalSec <= 300) interval = 30;
    else if (totalSec <= 1800) interval = 120;
    else interval = 300;
    const ticks: { pct: number; label: string }[] = [];
    for (let s = 0; s <= totalSec; s += interval) {
      const pct = (s / totalSec) * 100;
      ticks.push({ pct, label: fmtAxisLabel(s) });
    }
    return ticks;
  }, [totalSec]);

  // 콜의 owner — 첫 hop 의 실제 자원 유형(_firstHopType: IR/IC/AGENT/IE) 으로 판정.
  // mapSegmentKind 가 첫 segment 를 INBOUND/OUTBOUND/QUEUE_IN 으로 강제하므로 kind 만 보면 IVR-only/CTI-only 콜을 PBX 로 잘못 분류.
  const firstKind = segments[0]?.kind;
  const firstHopType = segments[0]?.meta?._firstHopType as string | undefined;
  const owner: { label: string; full: string } =
    firstHopType === 'IR' || firstKind === 'IVR'
      ? { label: 'IVR', full: 'IVR (전단)' }
      : firstHopType === 'IC' || firstKind === 'QUEUE_IN'
        ? { label: 'CTI', full: 'CTI (디지털)' }
        : { label: 'PBX', full: 'PBX (교환기)' };

  // 콜방향 — 첫 hop 의 _callDir (INBOUND/OUTBOUND/QUEUE_IN). 콜 채널 띠에 표기.
  // _callDir 없으면 첫 hop kind 로 폴백.
  const _callDir = segments[0]?.meta?._callDir as string | undefined;
  const callDirLabel = _callDir === 'OUTBOUND' || firstKind === 'OUTBOUND' ? '발신' : _callDir === 'QUEUE_IN' || firstKind === 'QUEUE_IN' ? '큐인입' : '인입';

  // 콜 흐름에 표시할 hop — 인입/발신/큐인입 모두 hop 0 부터 동일하게 표시.
  const displaySegments = segments;

  // 각 hop 의 시간 위치 (시간축 기준)
  // bar 너비 = "다음 hop 시작 시각 - 이 hop 시작 시각" (= 이 hop 의 PBX 점유 시간)
  // raw duration (IR 17s 등) 은 hop 내부 자원의 활성 시간일 뿐, PBX 관점 hop 점유는 next-hop 까지.
  // 이렇게 해야 IVR(raw 17s) 과 CTI(hop 2 +6.7s 시작) 가 시간축 상 겹쳐 보이지 않음.
  const hopPositions = useMemo(() => {
    const callEndMs = startMs + totalSec * 1000;
    return displaySegments.map((hop, idx) => {
      const t = new Date(hop.startTime).getTime();
      const nextT = displaySegments[idx + 1] ? new Date(displaySegments[idx + 1].startTime).getTime() : callEndMs;
      const startSec = Number.isFinite(t) ? (t - startMs) / 1000 : 0;
      const occupiedSec = Math.max(0.3, (nextT - t) / 1000); // 최소 0.3s 점유 보장
      const rawDur = Math.max(hop.durationSec ?? 0, 0); // 자원의 실제 활성 시간 (라벨용)
      const leftPct = totalSec > 0 ? (startSec / totalSec) * 100 : 0;
      const widthPct = totalSec > 0 ? Math.min(100 - leftPct, (occupiedSec / totalSec) * 100) : 0;
      const hopNo = Number(hop.meta?._hopNo ?? idx + 1);
      return { hop, hopNo, leftPct, widthPct, startSec, durSec: rawDur, occupiedSec };
    });
  }, [displaySegments, startMs, totalSec]);

  // (호버 가이드 제거됨 — 가치 낮음)

  if (segments.length === 0) {
    return (
      <div className="bg-white rounded-md border border-gray-200 p-6 text-center shadow-[0_1px_2px_0_rgba(56,65,74,0.15)]">
        <div className="text-[13px] text-gray-400">콜 흐름 없음</div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-md border border-gray-200 flex flex-col overflow-hidden shadow-[0_1px_2px_0_rgba(56,65,74,0.15)] ${
        expanded ? 'flex-1' : 'flex-1 min-h-[420px]'
      }`}
    >
      {/* 헤더 */}
      <div className="h-[50px] px-4 flex items-center justify-between border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/60 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold tracking-tight text-gray-800">콜 흐름</span>
          <span className="text-[10px] text-gray-400 font-mono px-2 py-0.5 bg-gray-100 rounded">
            시간 정확 척도 · 0 → {formatDur(totalSec)} · {segments.length} HOP
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10.5px] text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded" style={{ background: '#405189' }} />콜 채널 ({owner.full})
          </span>
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="ml-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded transition-colors"
              title={expanded ? '기본 크기로' : '전체 화면'}
            >
              {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          )}
        </div>
      </div>

      {/* 캔버스 — column-major (복원). hop 라벨 / hop row 정렬은 hop 단위(34px 고정)로만 일치, expand 펼쳤을 때 좌측 라벨은 그 자리에 머무름 */}
      <div className="grid flex-1 overflow-y-auto min-h-0" style={{ gridTemplateColumns: '220px 1fr', scrollbarGutter: 'stable' }}>
        {/* 좌측 라벨 컬럼 */}
        <div className="bg-gray-50/50 border-r border-gray-100">
          <div className="h-[28px] sticky top-0 z-30 bg-gray-50" />
          <div className="h-[36px] sticky top-[28px] z-20 bg-gray-50 flex items-center justify-end pr-3">
            <span className="font-mono text-[10px] font-semibold text-[#405189] tracking-wide">
              콜 채널 · {owner.label} · {callDirLabel}
            </span>
          </div>
          {/* hop별 좌측 라벨 — "IVR 1HOP" 식. single focus: 마지막 클릭한 hop 만 노란색 (이전 라벨 active 해제).
              막대 multi-expand 와는 독립 — 라벨 클릭은 선택+스크롤만, expand 변경 X.
              첫 hop(0HOP) 은 INBOUND/OUTBOUND/QUEUE_IN 의 라벨('인입'/'발신'/'큐인입') 대신
              meta._firstHopType(IVR/CTI/내선/외선) 을 표기 — 콜방향은 위쪽 콜채널 띠로 분리 */}
          {hopPositions.map(({ hop, hopNo, occupiedSec }) => {
            // _firstHopType = 첫 hop 라벨용, _hopType = 모든 hop 의 AS-IS 분류 (IE/IR/IC/AGENT)
            const firstHopType = hop.meta?._firstHopType as string | undefined;
            const hopType = hop.meta?._hopType as string | undefined;
            const typeLabel = firstHopType ?? hopType;
            // 색상도 typeLabel 기준 (IR→IVR, IC→CTI, AGENT→AGENT, IE→fallback)
            const effKind: CallSegment['kind'] =
              typeLabel === 'IVR' || typeLabel === 'IR'
                ? 'IVR'
                : typeLabel === 'CTI' || typeLabel === 'IC'
                  ? 'CTI'
                  : typeLabel === 'AGENT' || typeLabel === '내선'
                    ? 'AGENT'
                    : typeLabel === 'IE'
                      ? 'INBOUND' // IE → 네이비 (PBX 자체 처리, IR 보라와 구분)
                      : hop.kind;
            const ks = KIND_STYLE[effKind];
            const isActive = selectedSegmentId === hop.segmentId;
            const t = hop.startTime ? new Date(hop.startTime).toLocaleTimeString('ko-KR', { hour12: false }) : '';
            const labelText = typeLabel ?? ks.label;
            return (
              <button
                key={hop.segmentId}
                type="button"
                onClick={() => {
                  // 좌측 라벨 클릭도 막대 클릭과 동일 — openHop 호출로 단일 expand + 잠금 의미 살림
                  if (onOpen) onOpen(hop.segmentId);
                  else onSelect(hop.segmentId);
                  // 해당 hop 막대로 스크롤 — 화면 중앙으로 강하게 focus
                  requestAnimationFrame(() => {
                    const bar = document.querySelector(`button[data-segment-id="${hop.segmentId}"]`);
                    if (bar) (bar as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                  });
                }}
                style={{
                  // 우측 row가 expand로 늘어나도 좌측 라벨이 시간축(28)+OWNER(36)=64 아래에 sticky로 머묾
                  position: 'sticky',
                  top: 64,
                  zIndex: isActive ? 15 : 5,
                }}
                className={`h-[40px] w-full px-3 flex items-center gap-2 transition-colors text-left border-b border-gray-100 ${
                  isActive ? 'bg-amber-50 ring-1 ring-amber-300 shadow-md' : 'bg-gray-50/95 hover:bg-gray-100'
                }`}
              >
                <span
                  className="font-mono text-[12px] font-semibold px-2 py-[3px] rounded border flex-shrink-0"
                  style={{ background: ks.bg, color: ks.text, borderColor: ks.border }}
                >
                  {labelText} {hopNo}HOP
                </span>
                <span className="font-mono text-[11.5px] text-gray-600 tabular-nums truncate min-w-0 flex-1 text-right">{t}</span>
                {occupiedSec > 0 && <span className="font-mono text-[11px] text-gray-500 flex-shrink-0">{formatDurShort(occupiedSec)}</span>}
                {isPinned(hop.segmentId) && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onPinToggle?.(hop.segmentId);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="flex-shrink-0 cursor-pointer hover:bg-amber-100 rounded p-0.5 -my-0.5"
                    title="잠금 해제"
                  >
                    <Lock className="size-3 text-amber-600" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {/* (row-major 재편은 우측 캔버스 ref 분리 필요 — 추후 별도 작업) */}

        {/* 우측 시간 캔버스 — 좌측 라벨 컬럼과 행 높이 1:1 정렬 (px-3 만, py 없음) */}
        <div
          className="relative px-3"
          style={{
            backgroundImage: 'repeating-linear-gradient(to right, transparent 0, transparent calc(10% - 1px), #f3f4f7 calc(10% - 1px), #f3f4f7 10%)',
          }}
        >
          {/* 시간축 + HOP 마커 — sticky 위 고정 (z-30: OWNER 띠 위로, 튀어나온 마커 보임) */}
          <div className="relative h-[28px] sticky top-0 z-30 bg-white">
            {axisTicks.map((t, i) => (
              <div key={i} className="absolute top-0 bottom-0 w-px bg-gray-300" style={{ left: `${t.pct}%` }}>
                <span className="absolute top-1 left-1 text-[10px] text-gray-600 font-mono whitespace-nowrap">{t.label}</span>
              </div>
            ))}
            {/* HOP 마커 — 시간축 하단에 표기 (OWNER 띠 위). active 시 위로 들어 올림 (겹친 마커 가림 해소)
                좌측 라벨 클릭(selectedSegmentId)도 강조 — multi-expand 와 single focus 둘 다 노란색 */}
            {hopPositions.map(({ hop, hopNo, leftPct }) => {
              // 시간축 마커는 selected 만 강조 — expand 깜빡임 회피 (hop 이동 시 마커가 켜졌다 꺼졌다 X)
              const isActive = selectedSegmentId === hop.segmentId;
              return (
                <button
                  key={`mark-${hop.segmentId}`}
                  type="button"
                  data-segment-id={hop.segmentId}
                  onClick={() => openHop(hop.segmentId)}
                  className={`absolute bottom-0 -translate-x-1/2 translate-y-1/2 transition-transform ${isActive ? 'z-40 scale-125' : 'z-10 hover:scale-110 hover:z-30'}`}
                  style={{ left: `${leftPct}%` }}
                  title={`HOP ${hopNo} · ${hop.label}`}
                >
                  <span
                    className={`inline-flex items-center justify-center size-[20px] rounded-full font-mono text-[10px] font-bold border-2 transition-all ${
                      isActive
                        ? 'bg-amber-500 text-white border-white ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/30'
                        : 'bg-white text-gray-800 border-gray-700 shadow-sm hover:ring-2 hover:ring-amber-500/30 hover:text-amber-700 hover:border-amber-600'
                    }`}
                  >
                    {hopNo}
                  </span>
                </button>
              );
            })}
          </div>

          {/* OWNER 띠 — sticky 위 고정 (z-20: 시간축 마커보다 아래) */}
          <div className="relative h-[36px] sticky top-[28px] z-20 bg-white flex items-center">
            <div
              className="absolute inset-y-1 left-0 right-0 rounded-full"
              style={{
                background: 'linear-gradient(90deg, #405189 0%, #5471A8 50%, #405189 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.2)',
              }}
            />
            {/* 좌측: 콜 시작 시각 (첫 hop CREATE_TIME) */}
            {(() => {
              const firstHop = segments[0];
              const lastHop = segments[segments.length - 1];
              const startStr = firstHop?.startTime ? new Date(firstHop.startTime).toLocaleTimeString('ko-KR', { hour12: false }) : '-';
              const endMs = lastHop?.startTime ? new Date(lastHop.startTime).getTime() + (lastHop.durationSec ?? 0) * 1000 : null;
              const endStr = endMs ? new Date(endMs).toLocaleTimeString('ko-KR', { hour12: false }) : '-';
              return (
                <>
                  <div className="absolute inset-y-0 left-3 flex items-center gap-1.5 text-white text-[10px] font-mono opacity-95 pointer-events-none">
                    <span className="inline-block size-1.5 rounded-full bg-white" />
                    <span className="opacity-70">시작</span>
                    <span className="font-semibold">{startStr}</span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center text-white text-[10.5px] font-mono font-semibold tracking-wider opacity-85 pointer-events-none">
                    총 통화시간 · {formatDur(totalSec)}
                  </div>
                  <div className="absolute inset-y-0 right-3 flex items-center gap-1.5 text-white text-[10px] font-mono opacity-95 pointer-events-none">
                    <span className="opacity-70">종료</span>
                    <span className="font-semibold">{endStr}</span>
                    <span className="inline-block size-1.5 rounded-full bg-white" />
                  </div>
                </>
              );
            })()}
            {/* HOP 마커는 위 시간축 영역으로 이동됨 (OWNER 띠 시작/종료/총통화시간 글씨 가림 해결) */}
          </div>

          {/* HOP rows — 각 hop 의 자원 bar + 클릭 시 그 row 아래 inline expand (다중 가능)
              열려있거나 좌측 라벨로 focus 된 경우 모두 노란 outline 강조.
              0HOP 은 _firstHopType 기준 색상 (우측 메트릭 박스 색상과 일치) */}
          {hopPositions.map(({ hop, hopNo, leftPct, widthPct, durSec, occupiedSec }) => {
            const ft = hop.meta?._firstHopType as string | undefined;
            const ht = hop.meta?._hopType as string | undefined;
            const tlabel = ft ?? ht;
            const effKind: CallSegment['kind'] =
              tlabel === 'IVR' || tlabel === 'IR'
                ? 'IVR'
                : tlabel === 'CTI' || tlabel === 'IC'
                  ? 'CTI'
                  : tlabel === 'AGENT' || tlabel === '내선'
                    ? 'AGENT'
                    : tlabel === 'IE'
                      ? 'INBOUND' // IE → 네이비 (PBX 자체 처리)
                      : hop.kind;
            const ks = KIND_STYLE[effKind];
            const isActive = isExpanded(hop.segmentId) || selectedSegmentId === hop.segmentId;
            const isFail = !!hop.isError;
            const detail = isActive && renderHopDetail ? renderHopDetail(hop) : null;
            return (
              <div key={hop.segmentId}>
                {/* hop row (시간축 바) */}
                <div className="relative h-[40px]">
                  <div
                    className="absolute inset-y-0 pointer-events-none"
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      background: 'rgba(64,81,137,0.04)',
                      borderLeft: '1px dashed rgba(64,81,137,0.18)',
                      borderRight: '1px dashed rgba(64,81,137,0.18)',
                    }}
                  />
                  <button
                    type="button"
                    data-segment-id={hop.segmentId}
                    onClick={() => openHop(hop.segmentId)}
                    className="absolute top-1/2 -translate-y-1/2 h-[28px] rounded transition-all flex items-center px-2.5 gap-1.5 text-[12px] font-medium hover:brightness-95"
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      minWidth: '28px',
                      background: isFail ? '#FEE2E2' : ks.bg,
                      color: isFail ? '#991B1B' : ks.text,
                      border: `1px solid ${isFail ? '#FBBABA' : ks.border}`,
                      outline: isActive ? '2px solid #f59e0b' : 'none',
                      outlineOffset: '1px',
                      boxShadow: '0 1px 2px rgba(0,0,0,.06)',
                      backgroundImage: isFail ? 'repeating-linear-gradient(45deg, transparent 0, transparent 6px, rgba(220,38,38,0.14) 6px, rgba(220,38,38,0.14) 8px)' : undefined,
                    }}
                    title={`HOP ${hopNo} · ${hop.label}${durSec !== occupiedSec ? ` · 자원 raw ${formatDurShort(durSec)}` : ''}`}
                  >
                    <span className="font-mono text-[10.5px] font-bold opacity-70 flex-shrink-0">H{hopNo}</span>
                    <span className="truncate min-w-0 flex-1 text-left">{hopContent(hop)}</span>
                    {occupiedSec > 0 && <span className="font-mono text-[10.5px] opacity-80 flex-shrink-0">{formatDurShort(occupiedSec)}</span>}
                    {isFail && <X className="size-3 text-red-600 flex-shrink-0" />}
                    {renderHopDetail && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isActive) closeHop(hop.segmentId);
                          else openHop(hop.segmentId);
                        }}
                        className="flex-shrink-0 hover:bg-black/10 rounded p-0.5 -my-0.5 cursor-pointer"
                        title={isActive ? '닫기' : '열기'}
                      >
                        <ChevronDown className={`size-3.5 opacity-70 transition-transform ${isActive ? 'rotate-180' : ''}`} />
                      </span>
                    )}
                  </button>
                </div>

                {/* inline expand — kind 별 컬러 사용 */}
                {detail && (
                  <div
                    className={`my-2 border rounded-md overflow-hidden animate-[fadeIn_0.18s_ease-out] ${isPinned(hop.segmentId) ? 'ring-2 ring-amber-300 shadow-md' : ''}`}
                    style={{
                      borderColor: isPinned(hop.segmentId) ? '#f59e0b' : ks.border,
                      background: isPinned(hop.segmentId) ? '#fffbeb' : `${ks.bg}40`, // 잠금 시 흰 배경 (sticky 시 뒤 콘텐츠 안 비침)
                      borderLeftWidth: isPinned(hop.segmentId) ? 4 : 1,
                      // 잠긴 expand 는 스크롤해도 시간축(64) 바로 아래에 sticky 로 머묾
                      position: isPinned(hop.segmentId) ? 'sticky' : 'static',
                      top: isPinned(hop.segmentId) ? 64 : 'auto',
                      zIndex: isPinned(hop.segmentId) ? 25 : 'auto',
                    }}
                  >
                    <div className="h-[40px] px-3 flex items-center justify-between border-b" style={{ borderBottomColor: ks.border, background: ks.bg }}>
                      <div className="flex items-center gap-2.5" style={{ color: ks.text }}>
                        <span
                          className="inline-flex items-center justify-center size-[24px] rounded-full font-mono text-[11px] font-bold text-white"
                          style={{ background: ks.text }}
                        >
                          {hopNo}
                        </span>
                        <span className="text-[13px] font-semibold">
                          {(() => {
                            // _hopType (AS-IS SQL N_TYPE → SYSTEM_TYPE) 기준 — hop.kind 는 시각용이라 T_TYPE=4 도 'IVR' 잡힘
                            const ht = hop.meta?._hopType as string | undefined;
                            const ft = hop.meta?._firstHopType as string | undefined;
                            const t = ht ?? ft;
                            if (t === 'IR' || t === 'IVR') return 'IR 시나리오';
                            if (t === 'IC' || t === 'CTI' || t === 'QUEUE_IN') return 'CTI 라우팅';
                            if (t === 'AGENT') return '상담사 이벤트';
                            if (t === 'IE') return 'IE 자원 (PBX 처리)';
                            return '자원 상세';
                          })()}
                        </span>
                        <span className="text-[12px] font-mono opacity-75">· {hopContent(hop)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {onPinToggle && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onPinToggle(hop.segmentId);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className={`px-1.5 py-1 rounded transition-colors flex items-center gap-1 text-[11px] font-medium ${
                              isPinned(hop.segmentId) ? 'bg-amber-100 hover:bg-amber-200 text-amber-800' : 'hover:bg-black/5 text-gray-500'
                            }`}
                            title={isPinned(hop.segmentId) ? '잠금 해제 — 다른 hop 누르면 자동으로 닫힘' : '잠금 — 다른 hop 눌러도 이 창은 안 닫힘'}
                          >
                            {isPinned(hop.segmentId) ? (
                              <>
                                <Lock className="size-3.5" />
                                <span>잠금</span>
                              </>
                            ) : (
                              <>
                                <LockOpen className="size-3.5" />
                                <span>잠금</span>
                              </>
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => closeHop(hop.segmentId)}
                          className="hover:bg-black/5 p-1 rounded transition-colors"
                          style={{ color: ks.text }}
                          title="닫기"
                        >
                          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="bg-white">{detail}</div>
                  </div>
                )}
              </div>
            );
          })}

          {/* (호버 가이드 제거됨) */}
        </div>
      </div>
    </div>
  );
}
