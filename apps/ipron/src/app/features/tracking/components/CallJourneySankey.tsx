/**
 * 콜 여정 Sankey — 검색 결과 콜 집합의 흐름 시각화 (드릴다운).
 *
 * 기본: 거시 시스템 단계(인입 → IVR → CTI → 상담 → 종료) 만 굵게 — 한눈에.
 * IVR / CTI / 인입 노드 클릭 → 그 카테고리만 세부(시나리오/큐/대표번호)로 펼침. 다시 클릭 → 접힘.
 * d3-sankey-circular 로 상담↔IVR 재전환 등 순환(루프백)을 곡선으로 표현.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Empty } from 'antd';
// d3-sankey-circular 는 타입 선언을 제공하지 않음 (dev webpack 에서 .d.ts 미해석 → @ts-ignore 로 억제)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { sankeyCircular, sankeyLeft } from 'd3-sankey-circular';
import type { JourneyFlow } from '../types';

interface Props {
  data: JourneyFlow | null | undefined;
  loading?: boolean;
}

/** 노드명 → 거시 카테고리 */
const categoryOf = (name: string): string => {
  if (name.startsWith('인입: ') || name === '인입') return '인입';
  if (name.startsWith('IVR: ') || name === 'IVR') return 'IVR';
  if (name.startsWith('CTI: ') || name === 'CTI') return 'CTI';
  return name; // 발신 / 큐 인입 / 상담 / 종료
};
/** 클릭으로 펼칠 수 있는 카테고리 (세부 데이터 존재) */
const EXPANDABLE = new Set(['인입', 'IVR', 'CTI']);

/** 단계별 의미색 팔레트 (CallDetailPage SEGMENT_META 와 일관) */
const CAT_COLOR: Record<string, string> = {
  인입: '#6366f1', // indigo
  발신: '#06b6d4', // cyan
  '큐 인입': '#0ea5e9', // sky
  IVR: '#8b5cf6', // violet
  CTI: '#f59e0b', // amber
  상담: '#10b981', // emerald
  종료: '#64748b', // slate
};
const colorOf = (name: string) => CAT_COLOR[categoryOf(name)] ?? '#94a3b8';

export default function CallJourneySankey({ data, loading }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 520 });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dir, setDir] = useState<'수신' | '발신'>('수신');
  const [tip, setTip] = useState<{ x: number; y: number; title: string; value: number } | null>(null);

  const moveTip = (e: React.MouseEvent, title: string, value: number) => {
    const host = wrapRef.current?.getBoundingClientRect();
    setTip({ x: e.clientX - (host?.left ?? 0) + 12, y: e.clientY - (host?.top ?? 0) + 12, title, value });
  };

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 50 && h > 50) setSize({ w: Math.max(480, w), h: Math.max(420, h) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // 탭 첫 진입 시 부모 flex 레이아웃이 아직 0 일 수 있어 다음 프레임/지연 재측정
    const raf = requestAnimationFrame(measure);
    const t = setTimeout(measure, 300);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, []);

  // 펼침 상태에 따라 노드명을 거시(카테고리) 또는 세부로 표시 → 링크 rollup
  const displayName = useMemo(() => {
    return (name: string) => {
      const cat = categoryOf(name);
      if (EXPANDABLE.has(cat) && expanded.has(cat)) return name; // 펼침: 세부 유지
      return cat; // 접힘: 카테고리로 합침
    };
  }, [expanded]);

  const graph = useMemo(() => {
    if (!data || data.links.length === 0) return null;
    const merged = new Map<string, number>();
    for (const l of data.links) {
      const s = displayName(l.source);
      const t = displayName(l.target);
      if (s === t) continue; // rollup 으로 생긴 self-loop 제거
      merged.set(s + '' + t, (merged.get(s + '' + t) ?? 0) + l.value);
    }
    if (merged.size === 0) return null;
    const allLinks: { source: string; target: string; value: number }[] = [];
    for (const [k, v] of merged) {
      const [s, t] = k.split('');
      allLinks.push({ source: s, target: t, value: v });
    }
    // 수신/발신 탭 — 진입 시드에서 forward 도달 가능한 서브그래프만
    const isInbound = (n: string) => n.startsWith('인입') || n === '큐 인입';
    const isOutbound = (n: string) => n === '발신' || n === '발신 실패';
    const seeds = [...new Set(allLinks.map((l) => l.source))].filter((n) => (dir === '수신' ? isInbound(n) : isOutbound(n)));
    const adj = new Map<string, { source: string; target: string; value: number }[]>();
    allLinks.forEach((l) => {
      if (!adj.has(l.source)) adj.set(l.source, []);
      adj.get(l.source)!.push(l);
    });
    const reachable = new Set<string>(seeds);
    const queue = [...seeds];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const l of adj.get(cur) ?? []) {
        if (!reachable.has(l.target)) {
          reachable.add(l.target);
          queue.push(l.target);
        }
      }
    }
    const links = allLinks.filter((l) => reachable.has(l.source) && reachable.has(l.target));
    if (links.length === 0) return null;
    const nameSet = new Set<string>();
    links.forEach((l) => {
      nameSet.add(l.source);
      nameSet.add(l.target);
    });
    const nodes = [...nameSet].map((name) => ({ name }));
    try {
      const layout = sankeyCircular()
        .nodeId((d: { name: string }) => d.name)
        .nodeWidth(22)
        .nodePadding(18)
        .nodeAlign(sankeyLeft)
        .extent([
          [10, 12],
          [size.w - 10, size.h - 12],
        ]);
      return layout({ nodes: nodes.map((n) => ({ ...n })), links: links.map((l) => ({ ...l })) });
    } catch {
      return null;
    }
  }, [data, displayName, size, dir]);

  const toggle = (name: string) => {
    const cat = categoryOf(name);
    if (!EXPANDABLE.has(cat)) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-[13px] text-gray-500">집계 중...</div>;
  }
  if (!data || data.nodes.length === 0 || data.links.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span className="text-[12px]">집계할 콜 여정이 없습니다 (먼저 검색하세요)</span>} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-3 flex-wrap">
        <div className="inline-flex rounded-md border border-gray-200 overflow-hidden text-[12px]">
          {(['수신', '발신'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDir(d)}
              className={`px-3 py-1 transition-colors ${
                dir === d ? 'bg-[#405189] text-white font-medium' : 'bg-white text-gray-600 hover:bg-gray-50'
              } ${d === '발신' ? 'border-l border-gray-200' : ''}`}
            >
              {d}
            </button>
          ))}
        </div>
        <span className="text-[11.5px] text-gray-500">
          집계 콜 <span className="font-semibold text-gray-700 tabular-nums">{data.callCount.toLocaleString()}</span> 건
        </span>
        {data.truncated && <span className="text-amber-600 bg-amber-50 rounded px-1.5 py-0.5 text-[10.5px]">최대 1만 건까지만 집계</span>}
        <span className="text-[11px] text-gray-400 ml-auto">노드 클릭 → 세부 펼침 / 접기</span>
        {[...expanded].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() =>
              setExpanded((p) => {
                const n = new Set(p);
                n.delete(c);
                return n;
              })
            }
            className="text-[10.5px] bg-teal-50 text-teal-700 rounded px-1.5 py-0.5 hover:bg-teal-100"
          >
            {c} 펼침 ✕
          </button>
        ))}
      </div>
      <div ref={wrapRef} className="flex-1 min-h-0 overflow-auto relative">
        {tip && (
          <div
            className="absolute z-10 pointer-events-none rounded-md bg-gray-900/90 text-white text-[11.5px] px-2.5 py-1.5 shadow-lg whitespace-nowrap"
            style={{ left: tip.x, top: tip.y }}
          >
            <div className="font-medium">{tip.title}</div>
            <div className="text-gray-300">
              <span className="font-semibold tabular-nums text-white">{tip.value.toLocaleString()}</span> 콜
            </div>
          </div>
        )}
        {graph && graph.nodes.length > 0 ? (
          (() => {
            const fmt = (v: number) => v.toLocaleString();
            // 순환(루프백) 링크는 그리지 않고, 재방문량을 노드 배지로 집계
            const cycByNode = new Map<string, number>();
            graph.links.forEach((l: { circular?: boolean; value: number; target: { name: string } }) => {
              if (l.circular) cycByNode.set(l.target.name, (cycByNode.get(l.target.name) ?? 0) + l.value);
            });
            return (
              <svg width={size.w} height={size.h} style={{ display: 'block' }}>
                <defs>
                  {graph.links.map(
                    (
                      l: {
                        source: { name: string; x1: number; y0: number; y1: number };
                        target: { name: string; x0: number; y0: number; y1: number };
                      },
                      i: number,
                    ) => (
                      <linearGradient
                        key={`g${i}`}
                        id={`lg${i}`}
                        gradientUnits="userSpaceOnUse"
                        x1={l.source.x1}
                        y1={(l.source.y0 + l.source.y1) / 2}
                        x2={l.target.x0}
                        y2={(l.target.y0 + l.target.y1) / 2}
                      >
                        <stop offset="0%" stopColor={colorOf(l.source.name)} />
                        <stop offset="100%" stopColor={colorOf(l.target.name)} />
                      </linearGradient>
                    ),
                  )}
                </defs>
                <rect x={0} y={0} width={size.w} height={size.h} fill="#fbfcfd" />
                {graph.links.map(
                  (
                    l: {
                      path: string;
                      width: number;
                      circular?: boolean;
                      value: number;
                      source: { name: string; x0: number; x1: number; y0: number; y1: number };
                      target: { name: string; x0: number; x1: number; y0: number; y1: number };
                    },
                    i: number,
                  ) =>
                    l.circular ? null : (
                      <path
                        key={`l${i}`}
                        d={l.path}
                        fill="none"
                        stroke={`url(#lg${i})`}
                        strokeOpacity={0.46}
                        strokeWidth={Math.max(1.5, l.width)}
                        strokeLinecap="butt"
                        style={{ cursor: 'pointer', transition: 'stroke-opacity .15s' }}
                        onMouseMove={(e) => moveTip(e, `${l.source.name} → ${l.target.name}`, l.value)}
                        onMouseLeave={() => setTip(null)}
                      />
                    ),
                )}
                {graph.nodes.map((n: { name: string; value: number; x0: number; x1: number; y0: number; y1: number }, i: number) => {
                  const w = Math.max(2, n.x1 - n.x0);
                  const h = Math.max(3, n.y1 - n.y0);
                  const cy = (n.y0 + n.y1) / 2;
                  const cat = categoryOf(n.name);
                  const clickable = EXPANDABLE.has(cat);
                  const leftHalf = (n.x0 + n.x1) / 2 < size.w / 2;
                  const lx = leftHalf ? n.x1 + 7 : n.x0 - 7;
                  const anchor = leftHalf ? 'start' : 'end';
                  return (
                    <g key={`n${i}`}>
                      <rect
                        x={n.x0}
                        y={n.y0}
                        width={w}
                        height={h}
                        rx={3}
                        fill={colorOf(n.name)}
                        style={{
                          cursor: clickable ? 'pointer' : 'default',
                          filter: 'drop-shadow(0 1px 3px rgba(15,23,42,0.2))',
                        }}
                        onClick={() => toggle(n.name)}
                        onMouseMove={(e) => moveTip(e, n.name + (clickable ? ' (클릭: 펼침/접기)' : ''), n.value)}
                        onMouseLeave={() => setTip(null)}
                      />
                      <text x={lx} y={cy - 5} textAnchor={anchor} fontSize={11.5} fontWeight={600} fill="#334155" style={{ pointerEvents: 'none' }}>
                        {n.name}
                        {clickable && !expanded.has(cat) ? ' ⊕' : ''}
                      </text>
                      <text x={lx} y={cy + 10} textAnchor={anchor} fontSize={10.5} fontWeight={700} fill="#64748b" style={{ pointerEvents: 'none' }}>
                        {fmt(n.value)} 콜
                      </text>
                      {(cycByNode.get(n.name) ?? 0) > 0 && (
                        <text x={lx} y={cy + 24} textAnchor={anchor} fontSize={10} fontWeight={600} fill="#e07a5f" style={{ pointerEvents: 'none' }}>
                          ↻ 재방문 {fmt(cycByNode.get(n.name) ?? 0)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            );
          })()
        ) : (
          <div className="h-full flex items-center justify-center text-[12px] text-gray-400">표시할 흐름이 없습니다</div>
        )}
      </div>
    </div>
  );
}
