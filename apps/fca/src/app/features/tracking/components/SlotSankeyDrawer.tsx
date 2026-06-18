import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tooltip as AntdTooltip, Drawer, Tag } from 'antd';
import dayjs from 'dayjs';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { AlertCircle, BarChart3, Maximize2, Minus, Plus, X } from 'lucide-react';
import { botDialogHistoryApi } from '../api/botDialogHistoryApi';
import type { BotDialogHistorySearchRequest, SlotSankeyItem } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

interface SlotSankeyDrawerProps {
  open: boolean;
  onClose: () => void;
  searchParams: BotDialogHistorySearchRequest;
  /** 노드 클릭 → 해당 Entity·SEQ 콜 리스트 조회 */
  onEntityFilter?: (entityTag: string, entitySeq: number) => void;
}

/** 차트에서 선택된 슬롯 노드 = (entity tag, seq) 페어. seq까지 함께 보관해 SEQ별 필터링을 지원. */
interface SelectedNode {
  tag: string;
  seq: number;
}

// ──────────── 상수 ────────────

const TERMINAL_KEY = '__END__';
const TERMINAL_LABEL = '종료';
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.25;

const COLOR = {
  default: '#3b82f6', // blue-500
  selected: '#22c55e', // green-500 — 선택된 (tag, seq) 단일 노드 강조
  selectedBorder: '#15803d', // green-700 — 선택 노드의 두꺼운 테두리
  terminal: '#94a3b8', // slate-400
};

// 개체별 색상 팔레트 — 같은 개체는 어느 단계든 동일 색으로 칠해 흐름 추적이 가능하도록.
// 선택(녹색)·종료(회색)와 혼동되지 않도록 순수 녹색/회색은 제외.
const ENTITY_PALETTE = [
  '#3b82f6',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899', //
  '#14b8a6',
  '#ef4444',
  '#6366f1',
  '#f97316', //
  '#06b6d4',
  '#d946ef',
  '#84cc16',
  '#0ea5e9', //
  '#a855f7',
  '#e11d48',
  '#eab308',
  '#0d9488', //
];

// ──────────── 헬퍼 ────────────

function getLabel(key: string): string {
  const raw = key.substring(0, key.lastIndexOf('_'));
  return raw === TERMINAL_KEY ? TERMINAL_LABEL : raw;
}

function getNodeColor(rawLabel: string, colorMap: Map<string, string>): string {
  if (rawLabel === TERMINAL_KEY) return COLOR.terminal;
  return colorMap.get(rawLabel) ?? COLOR.default;
}

// 개체 목록(정렬·고정) 순서대로 팔레트를 안정적으로 매핑. 16개 초과 시 색상 순환.
function buildEntityColorMap(entities: string[]): Map<string, string> {
  const map = new Map<string, string>();
  entities.forEach((tag, i) => map.set(tag, ENTITY_PALETTE[i % ENTITY_PALETTE.length]));
  return map;
}

// ──────────── 노드별 흐름 사전계산 (툴팁 강화용) ────────────

interface NodeFlow {
  inflow: Map<string, number>; // prevEntityTag → value
  outflow: Map<string, number>; // entityTag → value
}

function buildNodeFlows(items: SlotSankeyItem[]): Map<string, NodeFlow> {
  const flows = new Map<string, NodeFlow>();
  const ensure = (key: string): NodeFlow => {
    let f = flows.get(key);
    if (!f) {
      f = { inflow: new Map(), outflow: new Map() };
      flows.set(key, f);
    }
    return f;
  };
  for (const item of items) {
    const nodeKey = `${item.entityTag}_${item.seq}`;
    const node = ensure(nodeKey);
    if (item.prevEntityTag) {
      node.inflow.set(item.prevEntityTag, (node.inflow.get(item.prevEntityTag) ?? 0) + item.value);
      const prevKey = `${item.prevEntityTag}_${item.seq - 1}`;
      const prev = ensure(prevKey);
      prev.outflow.set(item.entityTag, (prev.outflow.get(item.entityTag) ?? 0) + item.value);
    }
  }
  return flows;
}

// ──────────── Sankey 옵션 빌더 ────────────

function buildSankeyOption(items: SlotSankeyItem[], selectedNode: SelectedNode | null, flows: Map<string, NodeFlow>, colorMap: Map<string, string>): EChartsOption {
  const nodeSet = new Set<string>();
  const links: { source: string; target: string; value: number }[] = [];
  // 노드 라벨에 표기할 통과 건수 / 단계 점유율 산출용
  const nodeValues = new Map<string, number>();
  const seqTotals = new Map<number, number>();

  for (const item of items) {
    const targetKey = `${item.entityTag}_${item.seq}`;
    nodeSet.add(targetKey);
    nodeValues.set(targetKey, (nodeValues.get(targetKey) ?? 0) + item.value);
    seqTotals.set(item.seq, (seqTotals.get(item.seq) ?? 0) + item.value);
    if (item.prevEntityTag) {
      const sourceKey = `${item.prevEntityTag}_${item.seq - 1}`;
      nodeSet.add(sourceKey);
      links.push({ source: sourceKey, target: targetKey, value: item.value });
    }
  }

  // 링크 0개 fallback — 가상 종료 노드 연결
  if (links.length === 0 && nodeSet.size > 0) {
    for (const item of items) {
      const sourceKey = `${item.entityTag}_${item.seq}`;
      const targetKey = `${TERMINAL_KEY}_${item.seq + 1}`;
      nodeSet.add(targetKey);
      nodeValues.set(targetKey, (nodeValues.get(targetKey) ?? 0) + item.value);
      seqTotals.set(item.seq + 1, (seqTotals.get(item.seq + 1) ?? 0) + item.value);
      links.push({ source: sourceKey, target: targetKey, value: item.value });
    }
  }

  const nodes = Array.from(nodeSet).map((key) => {
    const lastUnderscore = key.lastIndexOf('_');
    const depth = parseInt(key.substring(lastUnderscore + 1), 10);
    const rawLabel = key.substring(0, lastUnderscore);
    // 선택 하이라이트는 동일 (tag, seq) 노드 한 개만 — 같은 tag라도 다른 SEQ는 별개 슬롯이므로 강조에서 제외
    const isSelected = selectedNode != null && rawLabel === selectedNode.tag && depth === selectedNode.seq;
    return {
      name: key,
      depth,
      // 선택 노드는 녹색 + 두꺼운 어두운 녹색 테두리로 한눈에 구분 가능하게
      itemStyle: isSelected ? { color: COLOR.selected, borderColor: COLOR.selectedBorder, borderWidth: 3 } : { color: getNodeColor(rawLabel, colorMap) },
    };
  });

  return {
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          const flow = flows.get(params.name);
          const label = getLabel(params.name);
          const nodeDepth = parseInt(params.name.substring(params.name.lastIndexOf('_') + 1), 10);
          const lines: string[] = [
            `<div style="font-weight:600;margin-bottom:4px">${label} <span style="font-weight:500;color:#15803d;font-size:11px;background:#dcfce7;padding:1px 5px;border-radius:3px;margin-left:2px">${nodeDepth}번째</span></div>`,
            `<div style="font-size:12px">통과 <b>${Number(params.value).toLocaleString()}</b>건</div>`,
          ];
          if (flow && flow.inflow.size > 0) {
            const tops = Array.from(flow.inflow.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3);
            lines.push(`<div style="color:#94a3b8;margin-top:6px;font-size:11px">이전</div>`);
            for (const [k, v] of tops) {
              lines.push(`<div style="font-size:11px">${k} <b>${v.toLocaleString()}</b></div>`);
            }
          }
          if (flow && flow.outflow.size > 0) {
            const tops = Array.from(flow.outflow.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3);
            lines.push(`<div style="color:#94a3b8;margin-top:6px;font-size:11px">다음</div>`);
            for (const [k, v] of tops) {
              const lbl = k === TERMINAL_KEY ? TERMINAL_LABEL : k;
              lines.push(`<div style="font-size:11px">${lbl} <b>${v.toLocaleString()}</b></div>`);
            }
          }
          return lines.join('');
        }
        if (params.dataType === 'edge') {
          return `${getLabel(params.data.source)} → ${getLabel(params.data.target)}<br/>건수: ${Number(params.value).toLocaleString()}`;
        }
        return '';
      },
    },
    series: [
      {
        type: 'sankey',
        layoutIterations: 0,
        data: nodes,
        links,
        emphasis: { focus: 'adjacency' },
        lineStyle: { color: 'source', curveness: 0.5, opacity: 0.45 },
        label: {
          formatter: (params: any) => {
            const label = getLabel(params.name);
            const lastUnderscore = params.name.lastIndexOf('_');
            const depth = parseInt(params.name.substring(lastUnderscore + 1), 10);
            const rawLabel = params.name.substring(0, lastUnderscore);
            const value = nodeValues.get(params.name) ?? 0;
            const total = seqTotals.get(depth) ?? 1;
            const share = total > 0 ? Math.round((value / total) * 100) : 0;
            // 선택된 노드만 라벨에 'N번째' 뱃지를 추가하여 어느 순서가 선택됐는지 즉시 확인 가능
            const isSelected = selectedNode != null && rawLabel === selectedNode.tag && depth === selectedNode.seq;
            if (isSelected) {
              return `{nameSel|${label}} {seqBadge|${depth}번째}\n{stat|${value.toLocaleString()}건 · ${share}%}`;
            }
            return `{name|${label}}\n{stat|${value.toLocaleString()}건 · ${share}%}`;
          },
          rich: {
            name: { fontSize: 12, fontWeight: 'bold', color: '#1e293b', lineHeight: 14 },
            nameSel: { fontSize: 12, fontWeight: 'bold', color: '#15803d', lineHeight: 14 },
            seqBadge: {
              fontSize: 10,
              fontWeight: 'bold',
              color: '#ffffff',
              backgroundColor: '#22c55e',
              padding: [1, 5, 1, 5],
              borderRadius: 3,
              lineHeight: 14,
            },
            stat: { fontSize: 10, color: '#94a3b8', lineHeight: 12 },
          },
        },
        nodeWidth: 20,
        nodeGap: 16,
      },
    ],
  };
}

// ──────────── 검색조건 칩 ────────────

interface FilterChip {
  key: string;
  label: string;
  color?: string;
}

function buildFilterChips(params: BotDialogHistorySearchRequest): FilterChip[] {
  const chips: FilterChip[] = [];
  chips.push({
    key: 'period',
    label: `📅 ${dayjs(params.fromDate).format('MM-DD HH:mm')} ~ ${dayjs(params.toDate).format('MM-DD HH:mm')}`,
  });
  if (params.serviceIds?.length) chips.push({ key: 'bot', label: `🤖 봇 ${params.serviceIds.length}개` });
  if (params.completeYn != null) chips.push({ key: 'complete', label: params.completeYn === 1 ? '✓ 완료' : '✗ 미완료' });
  if (params.confidenceMin != null || params.confidenceMax != null) {
    chips.push({ key: 'conf', label: `🎯 신뢰도 ${params.confidenceMin ?? 0}~${params.confidenceMax ?? 100}%` });
  }
  if (params.slotFailCountMin && params.slotFailCountMin > 0) {
    chips.push({ key: 'slot', label: `⚠️ 슬롯실패 ≥ ${params.slotFailCountMin}`, color: 'orange' });
  }
  if (params.ucid) {
    const short = params.ucid.length > 16 ? `${params.ucid.slice(0, 16)}…` : params.ucid;
    chips.push({ key: 'ucid', label: `🔑 ${short}` });
  }
  if (params.ani) chips.push({ key: 'ani', label: `📞 ${params.ani}` });
  if (params.intentNames?.length) chips.push({ key: 'intent', label: `💡 의도 ${params.intentNames.length}개` });
  if (params.retrainFilter) {
    const labelMap: Record<string, string> = { APPLIED: '수정-반영', NOT_APPLIED: '수정-미반영', UNMODIFIED: '미수정' };
    chips.push({ key: 'retrain', label: `🔁 ${labelMap[params.retrainFilter] ?? params.retrainFilter}` });
  }
  if (params.workerFilter === 'ME') chips.push({ key: 'worker', label: '👤 내가 수정' });
  if (params.slotEntityTag) {
    const seqSuffix = params.slotEntitySeq != null ? ` · ${params.slotEntitySeq}번째` : '';
    chips.push({ key: 'entity', label: `🏷️ ${params.slotEntityTag}${seqSuffix}`, color: 'blue' });
  }
  return chips;
}

// ──────────── 메트릭 ────────────

interface SankeyMetrics {
  totalCalls: number;
  maxDepth: number;
  uniqueEntities: number;
}

function computeMetrics(items: SlotSankeyItem[]): SankeyMetrics | null {
  if (items.length === 0) return null;
  let totalCalls = 0;
  let maxDepth = 0;
  const entitySet = new Set<string>();
  for (const item of items) {
    if (item.seq === 1 && item.prevEntityTag == null) totalCalls += item.value;
    if (item.seq > maxDepth) maxDepth = item.seq;
    if (item.entityTag) entitySet.add(item.entityTag);
    if (item.prevEntityTag) entitySet.add(item.prevEntityTag);
  }
  return { totalCalls, maxDepth, uniqueEntities: entitySet.size };
}

// ──────────── 인사이트 패널 데이터 ────────────

interface EntityCount {
  tag: string;
  count: number;
}
interface PanelData {
  topEntries: EntityCount[];
  topTerminals: EntityCount[];
}

function computePanelData(items: SlotSankeyItem[]): PanelData {
  if (items.length === 0) return { topEntries: [], topTerminals: [] };

  const entryMap = new Map<string, number>();
  for (const item of items) {
    if (item.seq === 1 && item.prevEntityTag == null) {
      entryMap.set(item.entityTag, (entryMap.get(item.entityTag) ?? 0) + item.value);
    }
  }
  const topEntries = Array.from(entryMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const maxSeq = items.reduce((m, i) => Math.max(m, i.seq), 0);
  const terminalMap = new Map<string, number>();
  for (const item of items) {
    if (item.seq === maxSeq) terminalMap.set(item.entityTag, (terminalMap.get(item.entityTag) ?? 0) + item.value);
  }
  const topTerminals = Array.from(terminalMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { topEntries, topTerminals };
}

interface SelectedEntityInfo {
  total: number;
  matchedItemCount: number;
  inflow: EntityCount[];
  outflow: EntityCount[];
}

function computeSelectedEntityInfo(items: SlotSankeyItem[], entity: string, seq: number): SelectedEntityInfo {
  const inflow = new Map<string, number>();
  const outflow = new Map<string, number>();
  let total = 0;
  let matchedItemCount = 0;
  // 타입 방어 — JSON에서 string으로 내려오는 경우 대비
  const seqNum = Number(seq);
  for (const item of items) {
    const itemSeqNum = Number(item.seq);
    const itemValueNum = Number(item.value);
    // 통과 건수·이전 흐름: 선택된 (tag, seq) 노드로 들어오는 흐름
    if (item.entityTag === entity && itemSeqNum === seqNum) {
      total += itemValueNum;
      matchedItemCount++;
      if (item.prevEntityTag) inflow.set(item.prevEntityTag, (inflow.get(item.prevEntityTag) ?? 0) + itemValueNum);
    }
    // 다음 흐름: 선택된 노드(seq)가 다음 노드(seq+1)로 빠져나가는 흐름
    if (item.prevEntityTag === entity && itemSeqNum === seqNum + 1) {
      outflow.set(item.entityTag, (outflow.get(item.entityTag) ?? 0) + itemValueNum);
    }
  }
  return {
    total,
    matchedItemCount,
    inflow: Array.from(inflow.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count),
    outflow: Array.from(outflow.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count),
  };
}

// ──────────── 서브 컴포넌트 ────────────

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800 tabular-nums">{value}</span>
    </span>
  );
}

interface StateMessageProps {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  primary?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}

function StateMessage({ icon, title, hint, primary, secondary }: StateMessageProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 py-16">
      {icon}
      <p className="text-sm text-slate-700 font-medium">{title}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      {(primary ?? secondary) && (
        <div className="flex gap-2 mt-2">
          {primary && (
            <button type="button" onClick={primary.onClick} className="px-3 py-1.5 text-xs font-medium rounded bg-slate-900 text-white hover:bg-slate-800 transition-colors">
              {primary.label}
            </button>
          )}
          {secondary && (
            <button
              type="button"
              onClick={secondary.onClick}
              className="px-3 py-1.5 text-xs font-medium rounded border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {secondary.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SelectedEntityCard({ entity, seq, info, onFilter, onClear }: { entity: string; seq: number; info: SelectedEntityInfo; onFilter: () => void; onClear: () => void }) {
  return (
    <div className="border rounded-lg p-3 border-green-300 bg-green-50/40">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase font-semibold text-green-700">선택된 슬롯</div>
          <div className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
            {entity}
            <span className="ml-1.5 text-[11px] font-medium text-slate-500 tabular-nums">{seq}번째</span>
          </div>
        </div>
        <button type="button" onClick={onClear} className="shrink-0 text-slate-400 hover:text-slate-600">
          <X size={14} />
        </button>
      </div>
      <div className="text-[11px] text-slate-600 mb-2">
        {seq}번째 통과 <span className="font-semibold tabular-nums">{info.total.toLocaleString()}</span>건
      </div>
      {info.inflow.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] uppercase font-semibold text-slate-500 mb-1">이전</div>
          <ul className="space-y-0.5">
            {info.inflow.slice(0, 5).map((e) => (
              <li key={`in-${e.tag}`} className="flex justify-between text-[11px]">
                <span className="text-slate-700 truncate">{e.tag}</span>
                <span className="text-slate-500 tabular-nums shrink-0 ml-2">{e.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {info.outflow.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] uppercase font-semibold text-slate-500 mb-1">다음</div>
          <ul className="space-y-0.5">
            {info.outflow.slice(0, 5).map((e) => (
              <li key={`out-${e.tag}`} className="flex justify-between text-[11px]">
                <span className="text-slate-700 truncate">{e.tag === TERMINAL_KEY ? TERMINAL_LABEL : e.tag}</span>
                <span className="text-slate-500 tabular-nums shrink-0 ml-2">{e.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button type="button" onClick={onFilter} className="w-full px-2.5 py-1.5 text-xs font-medium rounded bg-slate-900 text-white hover:bg-slate-800 transition-colors">
        이 슬롯을 거친 콜 보기
      </button>
    </div>
  );
}

const TOP_SLOT_COUNT = 5;

function TopList({ title, items, barClass }: { title: string; items: EntityCount[]; barClass: string }) {
  const max = items[0]?.count ?? 1;
  const slots = Array.from({ length: TOP_SLOT_COUNT }, (_, i) => items[i] ?? null);
  return (
    <div>
      <div className="text-[11px] font-semibold text-slate-700 mb-1.5 px-1">{title}</div>
      <ul className="space-y-1">
        {slots.map((e, i) => (
          <li key={i} className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-400 tabular-nums w-3 text-right">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between mb-0.5">
                <span className={`truncate ${e ? 'text-slate-700' : 'text-slate-300'}`}>{e?.tag ?? '—'}</span>
                <span className="text-slate-500 tabular-nums shrink-0 ml-2">{e ? e.count.toLocaleString() : ''}</span>
              </div>
              <div className="h-1 bg-slate-100 rounded overflow-hidden">{e && <div className={`h-full ${barClass}`} style={{ width: `${(e.count / max) * 100}%` }} />}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EntityFilterList({
  allEntities,
  hiddenEntities,
  onToggle,
  onShowAll,
  colorMap,
}: {
  allEntities: string[];
  hiddenEntities: Set<string>;
  onToggle: (entity: string) => void;
  onShowAll: () => void;
  colorMap: Map<string, string>;
}) {
  if (allEntities.length === 0) return null;
  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex items-center justify-between mb-1.5 px-1 shrink-0">
        <div className="text-[11px] font-semibold text-slate-700">개체 표시 ({allEntities.length})</div>
        {hiddenEntities.size > 0 && (
          <button type="button" onClick={onShowAll} className="text-[10px] text-blue-600 hover:underline">
            전체 표시
          </button>
        )}
      </div>
      <ul className="space-y-0.5 overflow-y-auto pr-1 border border-slate-200 rounded bg-white py-1">
        {allEntities.map((e) => {
          const checked = !hiddenEntities.has(e);
          return (
            <li key={e}>
              <label className="flex items-center gap-1.5 text-[11px] cursor-pointer py-0.5 px-2 hover:bg-slate-50">
                <input type="checkbox" checked={checked} onChange={() => onToggle(e)} className="w-3 h-3 accent-blue-500" />
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorMap.get(e) ?? COLOR.default, opacity: checked ? 1 : 0.3 }} />
                <span className={`truncate ${checked ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{e}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ZoomControls({ zoom, onZoom }: { zoom: number; onZoom: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded shadow-sm p-0.5">
      <AntdTooltip title="축소">
        <button
          type="button"
          onClick={() => onZoom(Math.max(ZOOM_MIN, Math.round((zoom - ZOOM_STEP) * 100) / 100))}
          disabled={zoom <= ZOOM_MIN}
          className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-slate-100 disabled:opacity-30"
        >
          <Minus size={12} />
        </button>
      </AntdTooltip>
      <span className="text-[10px] text-slate-600 tabular-nums w-9 text-center">{Math.round(zoom * 100)}%</span>
      <AntdTooltip title="확대">
        <button
          type="button"
          onClick={() => onZoom(Math.min(ZOOM_MAX, Math.round((zoom + ZOOM_STEP) * 100) / 100))}
          disabled={zoom >= ZOOM_MAX}
          className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-slate-100 disabled:opacity-30"
        >
          <Plus size={12} />
        </button>
      </AntdTooltip>
      <AntdTooltip title="원래 크기">
        <button
          type="button"
          onClick={() => onZoom(1)}
          disabled={zoom === 1}
          className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-slate-100 disabled:opacity-30"
        >
          <Maximize2 size={12} />
        </button>
      </AntdTooltip>
    </div>
  );
}

// ──────────── 메인 ────────────

export default function SlotSankeyDrawer({ open, onClose, searchParams, onEntityFilter }: SlotSankeyDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SlotSankeyItem[]>([]);
  const [error, setError] = useState(false);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [hiddenEntities, setHiddenEntities] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const chartRef = useRef<ReactECharts>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(false);
    botDialogHistoryApi
      .getSlotSankey(searchParams)
      .then(setData)
      .catch(() => {
        setData([]);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [searchParams]);

  useEffect(() => {
    if (!open) return;
    // drawer 열 때마다 UI 상태 초기화 (닫힌 상태로 두면 다음 진입 시 직전 상태 유지)
    setSelectedNode(null);
    setHiddenEntities(new Set());
    setZoom(1);
    fetchData();
  }, [open, fetchData]);

  // 숨긴 개체가 선택돼있으면 선택 해제
  useEffect(() => {
    if (selectedNode && hiddenEntities.has(selectedNode.tag)) setSelectedNode(null);
  }, [selectedNode, hiddenEntities]);

  // 숨겨진 개체 적용된 items
  const filteredItems = useMemo(() => {
    if (hiddenEntities.size === 0) return data;
    return data.filter((item) => !hiddenEntities.has(item.entityTag) && (item.prevEntityTag == null || !hiddenEntities.has(item.prevEntityTag)));
  }, [data, hiddenEntities]);

  const flows = useMemo(() => buildNodeFlows(filteredItems), [filteredItems]);
  // 전체 개체 목록은 원본 data 기준 — 체크 해제해도 목록에 남아 다시 켤 수 있음
  const allEntities = useMemo(() => {
    const set = new Set<string>();
    for (const item of data) {
      if (item.entityTag) set.add(item.entityTag);
      if (item.prevEntityTag) set.add(item.prevEntityTag);
    }
    return Array.from(set).sort();
  }, [data]);
  // 개체→색상 매핑(정렬된 전체 목록 기준) — 차트 노드/링크와 우측 개체 목록의 색을 일치시킴
  const entityColorMap = useMemo(() => buildEntityColorMap(allEntities), [allEntities]);
  const option = useMemo(
    () => (filteredItems.length > 0 ? buildSankeyOption(filteredItems, selectedNode, flows, entityColorMap) : null),
    [filteredItems, selectedNode, flows, entityColorMap],
  );
  const metrics = useMemo(() => computeMetrics(filteredItems), [filteredItems]);
  const chips = useMemo(() => buildFilterChips(searchParams), [searchParams]);
  // Top 5 진입/종착은 원본 data 기준 — 개체 표시 토글 시 순위/위치가 흔들리지 않도록
  const panelData = useMemo(() => computePanelData(data), [data]);
  const selectedInfo = useMemo(() => (selectedNode ? computeSelectedEntityInfo(filteredItems, selectedNode.tag, selectedNode.seq) : null), [selectedNode, filteredItems]);

  const handleChartReady = (instance: any) => {
    instance.on('click', (params: any) => {
      // 노드 클릭: 노드 키 = `{entityTag}_{seq}` 그대로 파싱
      // 엣지 클릭: source 노드(이전 슬롯) 기준 선택 — source 키 = `{prevEntityTag}_{seq-1}`
      const key: string | undefined = params.dataType === 'node' ? params.name : params.dataType === 'edge' ? params.data?.source : undefined;
      if (!key) return;
      const lastUnderscore = key.lastIndexOf('_');
      if (lastUnderscore < 0) return;
      const tag = key.substring(0, lastUnderscore);
      const seq = parseInt(key.substring(lastUnderscore + 1), 10);
      if (!tag || tag === TERMINAL_KEY || Number.isNaN(seq)) return;
      setSelectedNode({ tag, seq });
    });
  };

  const handleToggleEntity = (entity: string) => {
    setHiddenEntities((prev) => {
      const next = new Set(prev);
      if (next.has(entity)) next.delete(entity);
      else next.add(entity);
      return next;
    });
  };
  const handleShowAllEntities = () => setHiddenEntities(new Set());
  const handleClearSelection = () => setSelectedNode(null);
  const handleFilterByEntity = (entity: string, seq: number) => {
    if (onEntityFilter) {
      onEntityFilter(entity, seq);
      onClose();
    }
  };

  const maxDepth = metrics?.maxDepth ?? 0;
  const chartWidth = Math.max(800, maxDepth * 150) * zoom;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="대화여정"
      closable={{ placement: 'end' }}
      width={1280}
      destroyOnHidden
      styles={{ body: { padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
    >
      {/* 헤더: 검색조건 칩 + 메트릭 */}
      <div className="border-b border-slate-200 bg-slate-50/60 px-6 py-3 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <Tag key={c.key} color={c.color} className="!m-0 text-[12px] !py-0.5">
              {c.label}
            </Tag>
          ))}
        </div>
        {metrics && (
          <div className="flex items-center gap-2.5 text-[12px] text-slate-600 shrink-0">
            <Metric label="콜" value={metrics.totalCalls.toLocaleString()} />
            <span className="text-slate-300">•</span>
            <Metric label="최장 흐름" value={String(metrics.maxDepth)} />
            <span className="text-slate-300">•</span>
            <Metric label="개체" value={String(metrics.uniqueEntities)} />
          </div>
        )}
      </div>

      {/* 본문: 좌측 차트 + 우측 인사이트 패널 */}
      <div className="flex-1 min-h-0 flex">
        {/* 차트 영역 */}
        <div className="flex-1 min-w-0 relative bg-white">
          {loading ? (
            <div className="h-full p-6">
              <FallbackSpinner />
            </div>
          ) : error ? (
            <div className="h-full p-6">
              <StateMessage
                icon={<AlertCircle size={48} className="text-red-300" />}
                title="데이터를 불러오지 못했습니다"
                hint="잠시 후 다시 시도해주세요."
                primary={{ label: '다시 시도', onClick: fetchData }}
                secondary={{ label: '닫기', onClick: onClose }}
              />
            </div>
          ) : !option ? (
            <div className="h-full p-6">
              {data.length > 0 ? (
                <StateMessage
                  icon={<BarChart3 size={48} className="text-slate-300" />}
                  title="표시할 개체가 없습니다"
                  hint="우측 “개체 표시” 목록에서 보고 싶은 개체를 다시 체크해주세요."
                  primary={{ label: '전체 표시', onClick: handleShowAllEntities }}
                />
              ) : (
                <StateMessage
                  icon={<BarChart3 size={48} className="text-slate-300" />}
                  title="선택된 조건에 슬롯 데이터가 없습니다"
                  hint="기간을 늘리거나 봇 선택을 확인해보세요."
                  primary={{ label: '검색조건 수정', onClick: onClose }}
                />
              )}
            </div>
          ) : (
            <>
              <div className="w-full h-full overflow-x-auto overflow-y-hidden p-4">
                <ReactECharts ref={chartRef} option={option} style={{ height: '100%', width: chartWidth, minHeight: 500 }} notMerge onChartReady={handleChartReady} />
              </div>
              <div className="absolute bottom-3 right-3 z-10">
                <ZoomControls zoom={zoom} onZoom={setZoom} />
              </div>
            </>
          )}
        </div>

        {/* 인사이트 패널 */}
        <aside className="w-80 shrink-0 border-l border-slate-200 bg-slate-50/30 p-4 flex flex-col gap-4 overflow-hidden">
          <div className="shrink-0">
            {selectedNode && selectedInfo ? (
              <SelectedEntityCard
                entity={selectedNode.tag}
                seq={selectedNode.seq}
                info={selectedInfo}
                onClear={handleClearSelection}
                onFilter={() => handleFilterByEntity(selectedNode.tag, selectedNode.seq)}
              />
            ) : (
              <div className="text-[11px] text-slate-400 text-center py-3 border border-dashed border-slate-200 rounded">차트의 개체를 클릭하면 상세 정보가 표시됩니다</div>
            )}
          </div>
          <div className="shrink-0">
            <TopList title="Top 5 진입 개체" items={panelData.topEntries} barClass="bg-blue-400" />
          </div>
          <div className="shrink-0">
            <TopList title="Top 5 종착 개체" items={panelData.topTerminals} barClass="bg-amber-400" />
          </div>
          <div className="h-px bg-slate-200 shrink-0" />
          <EntityFilterList allEntities={allEntities} hiddenEntities={hiddenEntities} onToggle={handleToggleEntity} onShowAll={handleShowAllEntities} colorMap={entityColorMap} />
        </aside>
      </div>
    </Drawer>
  );
}
