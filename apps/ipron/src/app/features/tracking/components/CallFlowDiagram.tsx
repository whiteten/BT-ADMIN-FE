/**
 * 콜 흐름 시각화 — segment kind 별 노드 카드를 가로 화살표로 연결.
 *
 * 디자인 토큰:
 *  - brand #405189, error #ef4444
 *  - 노드 색상 — INBOUND/IVR #8b5cf6, CTI #f59e0b, AGENT #10b981, DISCONNECT #94a3b8
 *  - hover lift, selected ring 2px
 *  - 우상단 미니맵 + 줌 컨트롤 (85% / 100% / 115%)
 *
 * inline flex 행 배치 — 부모 height 와 무관하게 안정적으로 렌더링.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Map as MapIcon, Minus, Plus } from 'lucide-react';
import type { CallSegment } from '../types/tracking.types';

interface Props {
  segments: CallSegment[];
  selectedSegmentId: string | null;
  onSelect: (segmentId: string) => void;
}

type ZoomLevel = 85 | 100 | 115;

const KIND_STYLE: Record<CallSegment['kind'], { gradient: string; ring: string; emoji: string; label: string; minimapDot: string }> = {
  INBOUND: { gradient: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', ring: 'rgba(139, 92, 246, 0.35)', emoji: '📥', label: '인입', minimapDot: '#8b5cf6' },
  IVR: { gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', ring: 'rgba(124, 58, 237, 0.35)', emoji: '🤖', label: 'IVR', minimapDot: '#7c3aed' },
  CTI: { gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', ring: 'rgba(245, 158, 11, 0.35)', emoji: '🔀', label: 'CTI', minimapDot: '#f59e0b' },
  AGENT: { gradient: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)', ring: 'rgba(16, 185, 129, 0.35)', emoji: '🎧', label: '상담', minimapDot: '#10b981' },
  DISCONNECT: { gradient: 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)', ring: 'rgba(148, 163, 184, 0.35)', emoji: '📤', label: '종료', minimapDot: '#94a3b8' },
  OTHER: { gradient: 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)', ring: 'rgba(156, 163, 175, 0.35)', emoji: '•', label: '기타', minimapDot: '#9ca3af' },
};

const fmtDuration = (sec: number | null | undefined): string => {
  if (sec == null || sec === 0) return '';
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}분` : `${m}분 ${s}초`;
};

const subLabel = (seg: CallSegment): string => {
  const queue = seg.meta?.queueName as string | undefined;
  const agent = seg.meta?.agentName as string | undefined;
  const service = seg.meta?.serviceName as string | undefined;
  if (seg.kind === 'CTI' && queue) return queue;
  if (seg.kind === 'AGENT' && agent) return agent;
  if (seg.kind === 'IVR' && service) return service;
  if (seg.label) {
    const stripped = seg.label.replace(/^.+ · /, '');
    if (stripped !== seg.label && stripped.length > 0) return stripped;
    if (seg.label.length <= 22) return seg.label;
  }
  return 'segment';
};

export default function CallFlowDiagram({ segments, selectedSegmentId, onSelect }: Props) {
  const [zoom, setZoom] = useState<ZoomLevel>(100);
  const [showMinimap, setShowMinimap] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPos, setScrollPos] = useState({ left: 0, width: 0, viewport: 0 });

  const scale = zoom / 100;

  // 미니맵 동기화
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setScrollPos({ left: el.scrollLeft, width: el.scrollWidth, viewport: el.clientWidth });
    update();
    el.addEventListener('scroll', update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [segments.length, zoom]);

  if (segments.length === 0) {
    return (
      <div className="bg-white rounded-md border border-gray-200 flex flex-col flex-shrink-0 overflow-hidden h-[230px] shadow-[0_1px_2px_0_rgba(56,65,74,0.15)]">
        <div className="h-[48px] px-5 flex items-center border-b border-gray-100">
          <span className="text-[13px] font-semibold tracking-tight text-gray-800">CallFlow</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-[12px] text-gray-400 bg-gradient-to-b from-gray-50/40 to-gray-50/80">segment 없음</div>
      </div>
    );
  }

  const showMinimapInline = segments.length >= 4;

  return (
    <div className="bg-white rounded-md border border-gray-200 flex flex-col flex-shrink-0 overflow-hidden h-[230px] shadow-[0_1px_2px_0_rgba(56,65,74,0.15)]">
      {/* 헤더 */}
      <div className="h-[48px] px-5 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[13px] font-semibold tracking-tight text-gray-800 flex-shrink-0">CallFlow</span>
          <span className="text-[10.5px] text-gray-500 hidden sm:inline truncate">노드 클릭 시 좌측 타임라인 / 하단 상세 동기화</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[11px] text-gray-500 mr-2">
            <span className="font-semibold text-gray-700 tabular-nums">{segments.length}</span> 단계
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => (z === 115 ? 100 : 85))}
            disabled={zoom === 85}
            className="size-7 rounded hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent text-gray-500 inline-flex items-center justify-center transition-colors"
            title="줌 아웃"
          >
            <Minus className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(100)}
            className={`text-[11px] px-2 py-0.5 rounded font-mono tabular-nums transition-colors ${zoom === 100 ? 'text-gray-700' : 'text-gray-400 hover:bg-gray-100'}`}
            title="100% 리셋"
          >
            {zoom}%
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => (z === 85 ? 100 : 115))}
            disabled={zoom === 115}
            className="size-7 rounded hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent text-gray-500 inline-flex items-center justify-center transition-colors"
            title="줌 인"
          >
            <Plus className="size-3.5" />
          </button>
          <span className="w-px h-3.5 bg-gray-200 mx-1" />
          <button
            type="button"
            onClick={() => setShowMinimap((v) => !v)}
            className={`text-[10.5px] px-2 py-1 rounded inline-flex items-center gap-1 transition-colors ${
              showMinimap && showMinimapInline ? 'text-[#405189] bg-blue-50' : 'text-gray-500 hover:bg-gray-100'
            }`}
            title="미니맵 토글"
            disabled={!showMinimapInline}
          >
            <MapIcon className="size-3" />
            미니맵
          </button>
        </div>
      </div>

      {/* 흐름 영역 — flex inline 행 */}
      <div className="relative flex-1 min-h-0" style={{ background: 'linear-gradient(180deg, #fafbfc 0%, #f4f5f7 100%)' }}>
        {/* dot grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.28]"
          style={{
            backgroundImage: 'radial-gradient(circle, #c5cbd0 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        <div ref={scrollRef} className="relative h-full overflow-x-auto overflow-y-hidden flex items-center px-6" style={{ gap: 0 }}>
          {segments.map((seg, i) => {
            const style = KIND_STYLE[seg.kind];
            const isActive = selectedSegmentId === seg.segmentId;
            const isError = !!seg.isError;
            const sub = subLabel(seg);
            const dur = fmtDuration(seg.durationSec);
            return (
              <div key={seg.segmentId} className="flex items-center flex-shrink-0" style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                <button
                  type="button"
                  onClick={() => onSelect(seg.segmentId)}
                  title={`${style.label} · ${sub}${dur ? ` · ${dur}` : ''}`}
                  className="rounded-lg text-white text-[11px] font-medium flex flex-col items-stretch justify-center outline-none focus-visible:ring-2 focus-visible:ring-[#405189] focus-visible:ring-offset-2 cursor-pointer"
                  style={{
                    width: 156,
                    height: 84,
                    background: isError ? 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)' : style.gradient,
                    boxShadow: isActive ? `0 0 0 2px #405189, 0 8px 24px -6px ${style.ring}, 0 2px 6px rgba(0,0,0,0.12)` : '0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.04)',
                    opacity: isError && !isActive ? 0.72 : 1,
                    transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
                    transition: 'transform .18s ease, box-shadow .18s ease, opacity .15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = isActive
                      ? `0 0 0 2px #405189, 0 12px 28px -6px ${style.ring}, 0 4px 8px rgba(0,0,0,0.15)`
                      : `0 6px 16px -4px ${style.ring}, 0 2px 4px rgba(0,0,0,0.08)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = isActive ? 'translateY(-2px)' : 'translateY(0)';
                    e.currentTarget.style.boxShadow = isActive
                      ? `0 0 0 2px #405189, 0 8px 24px -6px ${style.ring}, 0 2px 6px rgba(0,0,0,0.12)`
                      : '0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.04)';
                  }}
                >
                  <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
                    <span className="text-[12px] font-semibold leading-none tracking-tight inline-flex items-center gap-1.5">
                      <span aria-hidden style={{ fontSize: 13 }}>
                        {style.emoji}
                      </span>
                      <span>{style.label}</span>
                    </span>
                    <span className="text-[9px] font-mono opacity-65 tabular-nums">
                      {i + 1}/{segments.length}
                    </span>
                  </div>
                  <div className="mx-3 h-px bg-white/25" />
                  <div className="px-3 pt-1.5 pb-2 flex flex-col gap-0.5">
                    <div className="text-[10.5px] leading-tight truncate font-medium" title={sub}>
                      {sub}
                    </div>
                    {dur && <div className="text-[9.5px] opacity-80 font-mono tabular-nums">{dur}</div>}
                  </div>
                </button>
                {i < segments.length - 1 && (
                  <div className="flex items-center mx-1 px-2" style={{ width: 56 }}>
                    <div
                      className="flex-1 h-px"
                      style={{
                        background: isError ? '#ef4444' : 'transparent',
                        backgroundImage: isError ? undefined : 'repeating-linear-gradient(to right, #cbd5e1 0, #cbd5e1 4px, transparent 4px, transparent 8px)',
                      }}
                    />
                    <ArrowRight className="size-3.5 flex-shrink-0" style={{ color: isError ? '#ef4444' : '#94a3b8' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 미니맵 */}
        {showMinimap && showMinimapInline && (
          <div
            className="absolute bottom-3 right-3 bg-white border border-gray-200 rounded-md overflow-hidden pointer-events-none select-none"
            style={{ width: 168, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
          >
            <div className="px-2 py-1 border-b border-gray-100 flex items-center justify-between bg-gradient-to-b from-gray-50 to-white">
              <span className="text-[9.5px] font-semibold tracking-wide text-gray-500 uppercase">Minimap</span>
              <span className="text-[9px] text-gray-400 font-mono">{segments.length} steps</span>
            </div>
            <div className="relative h-[44px] bg-gray-50/70">
              <div className="absolute h-px bg-gray-300/80" style={{ top: 21, left: 8, right: 8 }} />
              {segments.map((seg, i) => {
                const isActive = selectedSegmentId === seg.segmentId;
                const left = 8 + (i / Math.max(segments.length - 1, 1)) * 152;
                return (
                  <div
                    key={`mm-${seg.segmentId}`}
                    className="absolute rounded-full"
                    style={{
                      width: isActive ? 8 : 6,
                      height: isActive ? 8 : 6,
                      top: isActive ? 17 : 18,
                      left: left - (isActive ? 4 : 3),
                      background: seg.isError ? '#ef4444' : KIND_STYLE[seg.kind].minimapDot,
                      opacity: seg.isError ? 0.7 : 1,
                      boxShadow: isActive ? '0 0 0 2px white, 0 0 0 3px #405189' : 'none',
                    }}
                  />
                );
              })}
              {scrollPos.width > scrollPos.viewport && (
                <div
                  className="absolute border-2 border-[#405189] rounded-sm"
                  style={{
                    top: 8,
                    height: 28,
                    left: 8 + (scrollPos.left / scrollPos.width) * 152,
                    width: Math.max(12, (scrollPos.viewport / scrollPos.width) * 152),
                    background: 'rgba(64,81,137,0.06)',
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
