/**
 * 콜 흐름 시각화 — segment kind 별 노드 카드를 가로 화살표로 연결.
 * prototype-call-detail.html § "가운데: CallFlow + 노드별 상세" 기반.
 *
 * 단순 HTML+SVG (React Flow 미사용) — 100건 미만의 짧은 콜 흐름에 최적.
 * 노드 클릭 시 selectedSegmentId 전환.
 */
import { useMemo } from 'react';
import type { CallSegment } from '../types/tracking.types';

interface Props {
  segments: CallSegment[];
  selectedSegmentId: string | null;
  onSelect: (segmentId: string) => void;
}

const KIND_STYLE: Record<CallSegment['kind'], { bg: string; emoji: string; label: string }> = {
  INBOUND: { bg: '#8b5cf6', emoji: '📥', label: '인입' },
  IVR: { bg: '#8b5cf6', emoji: '🤖', label: 'IVR' },
  CTI: { bg: '#f59e0b', emoji: '🔀', label: 'CTI' },
  AGENT: { bg: '#10b981', emoji: '🎧', label: '상담' },
  DISCONNECT: { bg: '#94a3b8', emoji: '📤', label: '종료' },
  OTHER: { bg: '#9ca3af', emoji: '•', label: '기타' },
};

const fmtDuration = (sec: number | null | undefined): string => {
  if (sec == null) return '';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
};

const NODE_W = 130;
const NODE_H = 64;
const GAP = 50;
const PAD_X = 24;

export default function CallFlowDiagram({ segments, selectedSegmentId, onSelect }: Props) {
  const totalW = useMemo(() => PAD_X * 2 + segments.length * NODE_W + Math.max(0, segments.length - 1) * GAP, [segments.length]);

  if (segments.length === 0) {
    return (
      <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col flex-shrink-0 overflow-hidden h-[170px]">
        <div className="h-[44px] px-4 flex items-center border-b border-gray-100">
          <span className="text-[13px] font-semibold text-gray-700">CallFlow</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-[12px] text-gray-400">segment 없음</div>
      </div>
    );
  }

  return (
    <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col flex-shrink-0 overflow-hidden h-[170px]">
      <div className="h-[44px] px-4 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold text-gray-700">CallFlow</span>
          <span className="text-[10px] text-gray-500">노드 클릭 시 좌측 타임라인 / 하단 상세 동기화</span>
        </div>
        <span className="text-[10px] text-gray-400">{segments.length} 단계</span>
      </div>
      <div className="relative flex-1 overflow-x-auto overflow-y-hidden bg-gray-50/60">
        <div className="relative h-full" style={{ width: totalW, minWidth: '100%' }}>
          {/* SVG 화살표 라인 */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <marker id="callflow-arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
              </marker>
            </defs>
            {segments.slice(0, -1).map((_, i) => {
              const x1 = PAD_X + i * (NODE_W + GAP) + NODE_W;
              const x2 = PAD_X + (i + 1) * (NODE_W + GAP);
              const y = 40 + NODE_H / 2;
              return <line key={i} x1={x1} y1={y} x2={x2 - 4} y2={y} stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 3" markerEnd="url(#callflow-arrow)" />;
            })}
          </svg>

          {/* 노드 카드 */}
          {segments.map((seg, i) => {
            const style = KIND_STYLE[seg.kind];
            const isActive = selectedSegmentId === seg.segmentId;
            const x = PAD_X + i * (NODE_W + GAP);
            const isError = !!seg.isError;
            return (
              <button
                type="button"
                key={seg.segmentId}
                onClick={() => onSelect(seg.segmentId)}
                title={seg.label}
                className={`absolute rounded-md text-white text-[11px] font-medium transition-all flex flex-col items-center justify-center px-2 cursor-pointer ${
                  isActive ? 'ring-2 ring-offset-2 ring-blue-500 shadow-lg scale-105' : 'hover:scale-105 hover:shadow-md'
                } ${isError ? 'opacity-70' : ''}`}
                style={{
                  left: x,
                  top: 40,
                  width: NODE_W,
                  height: NODE_H,
                  background: isError ? '#ef4444' : style.bg,
                }}
              >
                <div className="text-[12px] font-semibold leading-tight">
                  {style.emoji} {style.label}
                </div>
                <div className="text-[10px] opacity-90 mt-0.5 truncate w-full text-center">
                  {seg.label && seg.label !== style.label ? seg.label.replace(/^.{1,3} · /, '') : `hop ${i}`}
                </div>
                {seg.durationSec != null && seg.durationSec > 0 && <div className="text-[9px] opacity-75 mt-0.5">{fmtDuration(seg.durationSec)}</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
