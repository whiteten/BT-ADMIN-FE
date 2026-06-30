import { useCallback, useEffect, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AnimatedTableCell } from './AnimatedTableCell';
import { AnnouncementWidget, isAnnouncementWidget } from './AnnouncementWidget';
import { RedisTableWidget, collectRedisTableWsSubscriptions, isRedisTableWidget } from './RedisTableWidget';
import { type CtiAgentRow, type CtiGroupRow, type CtiQueueRow } from '../api/ctiRedisApi';
import { type CtiWsDataByHashKey, type CtiWsSubscription, type CtiqRecord, useCtiqWebSocket } from '../hooks/useCtiqWebSocket';
import { useResponsiveFontScale } from '../hooks/useResponsiveFontScale';
import { useGetCtiAgentList, useGetCtiGroupList, useGetCtiQueueList, useGetRedisHashKeys } from '../hooks/useTaskboardQueries';
import { useValueChangeKey } from '../hooks/useValueChangeAnimation';
import { type ChartConfig, type DroppedWidget, type TableColumn, type TaskboardDisplaySelection, parseLayoutWidgets } from '../types/taskboard.types';
import { DEFAULT_CUSTOM_CLOCK_FORMAT, formatCustomClock } from '../utils/clockFormat';
import {
  buildGroupReasonHashKeys,
  buildSelectionIdsByHashKey,
  collectDbQueryWsSubscriptions,
  collectRedisWsSubscriptions,
  getCalcDisplayValue,
  getRedisDisplayValue,
  groupSumAcrossHashKeys,
  groupSumRedisHashEntries,
  mergeWsSubscriptions,
  parseGroupReasonHashKey,
} from '../utils/redisValue';
import {
  VALUE_CHANGE_ANIMATION_CSS,
  formatWidgetValue,
  getThresholdColor,
  getValueAnimationClass,
  getValueAnimationStyle,
  getValueOffsetStyle,
  getWidgetVisualStyle,
  isTransparentBg,
} from '../utils/widgetVisualStyle';

export interface RollingLayout {
  layoutId: number;
  layoutName: string;
  fileName?: string;
  layoutJson?: string;
  /** 이 슬라이드에 입힐 뷰 그룹(선택값 묶음) ID — 단일 모드 */
  displayId: number;
  selectionJson?: string;
  /** 섹션 모드일 때 구역별 뷰 그룹 선택값 (있으면 sectionKey 기준으로 selection을 골라 씀) */
  sectionSelections?: Record<string, TaskboardDisplaySelection>;
}

export interface RollingData {
  transitionType: string;
  layouts: RollingLayout[];
}

export function parseSelection(selectionJson?: string): TaskboardDisplaySelection {
  if (!selectionJson) return {};
  try {
    return JSON.parse(selectionJson) as TaskboardDisplaySelection;
  } catch {
    return {};
  }
}

/** 여러 hashKey의 id→record 맵을 하나로 합친다. */
function mergeByHashKeys(dataByHashKey: Record<string, Record<string, CtiqRecord>>, hashKeys: string[]): Record<string, CtiqRecord> {
  const merged: Record<string, CtiqRecord> = {};
  hashKeys.forEach((hk) => Object.assign(merged, dataByHashKey[hk] ?? {}));
  return merged;
}

/** 레이아웃들의 위젯에서 table-group/queue/agent가 실제 쓰는 컬럼을 모아 WS 구독 columns로 사용(여러 레이아웃 합집합). */
function collectTableColumns(allWidgets: DroppedWidget[]) {
  const tableGroupWidgets = allWidgets.filter((w) => w.item.id === 'table-group' && Array.isArray(w.item.tableConfig?.columns));
  const configuredRtsCols = tableGroupWidgets.flatMap((w) =>
    (w.item.tableConfig!.columns as TableColumn[]).filter((c) => !['name', 'agents', 'talk'].includes(c.key)).map((c) => c.key.toUpperCase()),
  );
  const groupColumns = configuredRtsCols.length > 0 ? [...new Set(configuredRtsCols)] : undefined;

  const tableQueueWidgets = allWidgets.filter((w) => w.item.id === 'table-queue' && Array.isArray(w.item.tableConfig?.columns));
  const queueChartWidgets = allWidgets.filter((w) => w.item.id === 'chart-bar-queue' || w.item.id === 'chart-line-trend');
  const queueColumns = [
    ...new Set(
      [
        ...tableQueueWidgets.flatMap((w) =>
          (w.item.tableConfig!.columns as TableColumn[]).map((c) =>
            c.key === 'wait' ? 'RTS_WAIT_CNT' : c.key === 'talk' ? 'SUM_CONN_CNT' : c.key === 'name' ? null : c.key.toUpperCase(),
          ),
        ),
        ...(queueChartWidgets.length > 0 ? ['RTS_WAIT_CNT'] : []),
      ].filter((c): c is string => !!c),
    ),
  ];

  const tableAgentWidgets = allWidgets.filter((w) => w.item.id === 'table-agent' && Array.isArray(w.item.tableConfig?.columns));
  const agentColumns = [
    ...new Set(
      tableAgentWidgets.flatMap((w) =>
        (w.item.tableConfig!.columns as TableColumn[]).map((c) =>
          c.key === 'status' ? 'AGENT_STATUS' : c.key === 'count' ? 'SUM_ANSW_CNT' : c.key === 'name' ? null : c.key.toUpperCase(),
        ),
      ),
    ),
  ].filter((c): c is string => !!c);

  // 미디어타입은 디스플레이 선택값이 아니라 위젯 등록 시점에 고정된 값(item.mediaType) — 위젯별로 합집합
  const groupMediaTypes = [...new Set(tableGroupWidgets.map((w) => w.item.mediaType ?? '0'))];
  const queueMediaTypes = [...new Set([...tableQueueWidgets, ...queueChartWidgets].map((w) => w.item.mediaType ?? '0'))];
  const agentMediaTypes = [...new Set(tableAgentWidgets.map((w) => w.item.mediaType ?? '0'))];

  return { groupColumns, queueColumns, agentColumns, configuredRtsCols, tableGroupWidgets, groupMediaTypes, queueMediaTypes, agentMediaTypes };
}

export const parseRollingData = (raw?: string): RollingData => {
  try {
    if (!raw) return { transitionType: 'fade', layouts: [] };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { transitionType: 'fade', layouts: parsed as RollingLayout[] };
    return {
      transitionType: (parsed as RollingData).transitionType ?? 'fade',
      layouts: (parsed as RollingData).layouts ?? [],
    };
  } catch {
    return { transitionType: 'fade', layouts: [] };
  }
};

export const TRANSITION_OPTIONS = [
  { value: 'none', label: '기본', icon: '■' },
  { value: 'fade', label: '페이드', icon: '✦' },
  { value: 'slideLeft', label: '← 슬라이드', icon: '←' },
  { value: 'slideRight', label: '→ 슬라이드', icon: '→' },
  { value: 'slideUp', label: '↑ 슬라이드', icon: '↑' },
  { value: 'slideDown', label: '↓ 슬라이드', icon: '↓' },
  { value: 'zoomIn', label: '줌 인', icon: '⊕' },
  { value: 'zoomOut', label: '줌 아웃', icon: '⊖' },
  { value: 'blur', label: '블러', icon: '◎' },
  { value: 'flip', label: '플립', icon: '⟳' },
  { value: 'mosaic', label: '모자이크', icon: '▦' },
  { value: 'wipe', label: '와이프', icon: '◨' },
  { value: 'rotateIn', label: '회전', icon: '↻' },
  { value: 'bounce', label: '바운스', icon: '⤵' },
  { value: 'random', label: '랜덤', icon: '⚄' },
];

const TRANSITION_ANIMATION: Record<string, string> = {
  none: '',
  fade: 'rollingFadeIn 0.7s ease-in-out',
  slideLeft: 'rollingSlideLeft 0.5s ease-out',
  slideRight: 'rollingSlideRight 0.5s ease-out',
  slideUp: 'rollingSlideUp 0.5s ease-out',
  slideDown: 'rollingSlideDown 0.5s ease-out',
  zoomIn: 'rollingZoomIn 0.6s ease-out',
  zoomOut: 'rollingZoomOut 0.6s ease-out',
  blur: 'rollingBlur 0.7s ease-in-out',
  flip: 'rollingFlip 0.7s ease-out',
  mosaic: 'rollingMosaicIn 0.9s ease-out',
  wipe: 'rollingWipeIn 0.6s ease-in-out',
  rotateIn: 'rollingRotateIn 0.6s ease-out',
  bounce: 'rollingBounceIn 0.8s ease-out',
};

/** '랜덤' 선택 시 매 전환마다 이 목록에서 하나를 골라 적용 ('기본'은 제외) */
export const RANDOM_TRANSITION_POOL = Object.keys(TRANSITION_ANIMATION).filter((key) => key !== 'none');

export const TRANSITION_PREVIEW_ANIMATION: Record<string, string> = {
  none: 'pvNone 2s ease-in-out infinite',
  fade: 'pvFade 2s ease-in-out infinite',
  slideLeft: 'pvSlideLeft 2s ease-in-out infinite',
  slideRight: 'pvSlideRight 2s ease-in-out infinite',
  slideUp: 'pvSlideUp 2s ease-in-out infinite',
  slideDown: 'pvSlideDown 2s ease-in-out infinite',
  zoomIn: 'pvZoomIn 2s ease-in-out infinite',
  zoomOut: 'pvZoomOut 2s ease-in-out infinite',
  blur: 'pvBlur 2s ease-in-out infinite',
  flip: 'pvFlip 2s ease-in-out infinite',
  mosaic: 'pvMosaic 2s ease-in-out infinite',
  wipe: 'pvWipe 2s ease-in-out infinite',
  rotateIn: 'pvRotateIn 2s ease-in-out infinite',
  bounce: 'pvBounce 2s ease-in-out infinite',
  random: 'pvRandom 2s ease-in-out infinite',
};

const TRANSITION_CSS = `
  @keyframes rollingFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes rollingSlideLeft { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
  @keyframes rollingSlideRight { from { opacity: 0; transform: translateX(-100%); } to { opacity: 1; transform: translateX(0); } }
  @keyframes rollingSlideUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
  @keyframes rollingSlideDown { from { opacity: 0; transform: translateY(-100%); } to { opacity: 1; transform: translateY(0); } }
  @keyframes rollingZoomIn { from { opacity: 0; transform: scale(0.75); } to { opacity: 1; transform: scale(1); } }
  @keyframes rollingZoomOut { from { opacity: 0; transform: scale(1.25); } to { opacity: 1; transform: scale(1); } }
  @keyframes rollingBlur { from { opacity: 0; filter: blur(24px); } to { opacity: 1; filter: blur(0); } }
  @keyframes rollingFlip { from { opacity: 0; transform: perspective(1000px) rotateY(-90deg); } to { opacity: 1; transform: perspective(1000px) rotateY(0); } }
  @keyframes rollingMosaicIn {
    from {
      opacity: 0;
      filter: blur(2px);
      -webkit-mask-image: radial-gradient(circle, #000 55%, transparent 55%);
      -webkit-mask-size: 28px 28px;
      mask-image: radial-gradient(circle, #000 55%, transparent 55%);
      mask-size: 28px 28px;
    }
    to {
      opacity: 1;
      filter: blur(0);
      -webkit-mask-image: radial-gradient(circle, #000 55%, transparent 55%);
      -webkit-mask-size: 2px 2px;
      mask-image: radial-gradient(circle, #000 55%, transparent 55%);
      mask-size: 2px 2px;
    }
  }
  @keyframes rollingWipeIn { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
  @keyframes rollingRotateIn { from { opacity: 0; transform: rotate(-10deg) scale(0.85); } to { opacity: 1; transform: rotate(0deg) scale(1); } }
  @keyframes rollingBounceIn {
    0% { opacity: 0; transform: translateY(-60px); }
    60% { opacity: 1; transform: translateY(12px); }
    80% { transform: translateY(-6px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`;

export const TRANSITION_PREVIEW_CSS = `
  @keyframes pvFade { 0%,100%{opacity:0} 40%,60%{opacity:1} }
  @keyframes pvSlideLeft { 0%{transform:translateX(12px);opacity:0} 40%,60%{transform:translateX(0);opacity:1} 100%{transform:translateX(-12px);opacity:0} }
  @keyframes pvSlideRight { 0%{transform:translateX(-12px);opacity:0} 40%,60%{transform:translateX(0);opacity:1} 100%{transform:translateX(12px);opacity:0} }
  @keyframes pvSlideUp { 0%{transform:translateY(10px);opacity:0} 40%,60%{transform:translateY(0);opacity:1} 100%{transform:translateY(-10px);opacity:0} }
  @keyframes pvSlideDown { 0%{transform:translateY(-10px);opacity:0} 40%,60%{transform:translateY(0);opacity:1} 100%{transform:translateY(10px);opacity:0} }
  @keyframes pvZoomIn { 0%,100%{transform:scale(0.4);opacity:0} 40%,60%{transform:scale(1);opacity:1} }
  @keyframes pvZoomOut { 0%,100%{transform:scale(1.6);opacity:0} 40%,60%{transform:scale(1);opacity:1} }
  @keyframes pvBlur { 0%,100%{filter:blur(6px);opacity:0} 40%,60%{filter:blur(0);opacity:1} }
  @keyframes pvFlip { 0%{transform:perspective(60px) rotateY(-90deg);opacity:0} 40%,60%{transform:perspective(60px) rotateY(0);opacity:1} 100%{transform:perspective(60px) rotateY(90deg);opacity:0} }
  @keyframes pvMosaic {
    0%,100% {
      opacity: 0; filter: blur(2px);
      -webkit-mask-image: radial-gradient(circle, #000 55%, transparent 55%); -webkit-mask-size: 14px 14px;
      mask-image: radial-gradient(circle, #000 55%, transparent 55%); mask-size: 14px 14px;
    }
    40%,60% {
      opacity: 1; filter: blur(0);
      -webkit-mask-image: radial-gradient(circle, #000 55%, transparent 55%); -webkit-mask-size: 2px 2px;
      mask-image: radial-gradient(circle, #000 55%, transparent 55%); mask-size: 2px 2px;
    }
  }
  @keyframes pvWipe { 0%{clip-path:inset(0 100% 0 0)} 40%,60%{clip-path:inset(0 0 0 0)} 100%{clip-path:inset(0 0 0 100%)} }
  @keyframes pvRotateIn { 0%,100%{transform:rotate(-10deg) scale(0.7);opacity:0} 40%,60%{transform:rotate(0deg) scale(1);opacity:1} }
  @keyframes pvBounce {
    0%,100% { opacity:0; transform: translateY(-12px); }
    30% { opacity:1; transform: translateY(4px); }
    40% { transform: translateY(-2px); }
    50%,65% { opacity:1; transform: translateY(0); }
  }
  @keyframes pvRandom {
    0%,100% { opacity:0; transform: scale(0.5) rotate(-12deg); filter: blur(3px); }
    30% { opacity:1; transform: scale(1) rotate(0deg) translateX(0); filter: blur(0); }
    50%,60% { opacity:1; transform: scale(1) rotate(0deg) translateX(0); }
    80% { opacity:1; transform: translateX(6px); }
  }
  @keyframes pvNone { 0%,39.9%{opacity:0} 40%,60%{opacity:1} 60.1%,100%{opacity:0} }
`;

const CHART_ROLLING_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

/** 정렬 기준 컬럼(sortKey)이 있으면 숫자 기준 정렬 후, limit(미지정 시 20)만큼만 잘라서 반환 */
function applySortAndLimit(rows: Record<string, string | number>[], sortConfig?: { key?: string; order?: 'asc' | 'desc'; limit?: number }): Record<string, string | number>[] {
  let result = rows;
  if (sortConfig?.key) {
    const order = sortConfig.order ?? 'desc';
    const key = sortConfig.key;
    result = [...result].sort((a, b) => {
      const av = Number(a[key]) || 0;
      const bv = Number(b[key]) || 0;
      return order === 'asc' ? av - bv : bv - av;
    });
  }
  if (sortConfig?.limit && sortConfig.limit > 0) return result.slice(0, sortConfig.limit);
  return result;
}

// ── 실시간 테이블 행 생성 헬퍼 ───────────────────────────────────────────────
function buildLiveTableRows(
  widgetId: string,
  queueRows: CtiQueueRow[],
  agentRows: CtiAgentRow[],
  groupRows: CtiGroupRow[],
  columns: TableColumn[],
  selection: TaskboardDisplaySelection,
  mediaTypes: string[],
  dataByHashKey: Record<string, Record<string, CtiqRecord>>,
  agentHashKeys: string[],
  sortConfig?: { key?: string; order?: 'asc' | 'desc'; limit?: number },
): Record<string, string | number>[] {
  if (widgetId === 'table-queue') {
    const selectedQueueIds = selection.queueIds ?? [];
    const ctiqWsData = mergeByHashKeys(
      dataByHashKey,
      mediaTypes.map((mt) => `IC:CTIQ:${mt}`),
    );
    const filtered = selectedQueueIds.length > 0 ? queueRows.filter((q) => selectedQueueIds.includes(q.ctiqId)) : queueRows;
    const result = filtered.map((q) => {
      const ws = ctiqWsData[q.ctiqId];
      const row: Record<string, string | number> = {};
      columns.forEach((col) => {
        switch (col.key) {
          case 'name':
            row[col.key] = q.ctiqName;
            break;
          case 'wait':
            row[col.key] = Number(ws?.RTS_WAIT_CNT ?? q.rtsWaitCnt ?? 0);
            break;
          case 'talk':
            row[col.key] = Number(ws?.SUM_CONN_CNT ?? q.totalIn ?? 0);
            break;
          default:
            row[col.key] = ws?.[col.key.toUpperCase()] != null ? String(ws[col.key.toUpperCase()]) : q[col.key] != null ? String(q[col.key]) : '';
        }
      });
      return row;
    });
    return applySortAndLimit(result, sortConfig);
  }
  if (widgetId === 'table-agent') {
    const selectedAgentIds = selection.agentIds ?? [];
    const agentWsData = mergeByHashKeys(dataByHashKey, agentHashKeys);
    const filtered = selectedAgentIds.length > 0 ? agentRows.filter((a) => selectedAgentIds.includes(a.agentId)) : agentRows;
    const result = filtered.map((agent) => {
      const ws = agentWsData[agent.agentId];
      const row: Record<string, string | number> = {};
      columns.forEach((col) => {
        switch (col.key) {
          case 'name':
            row[col.key] = agent.agentName;
            break;
          case 'status':
            row[col.key] = String(ws?.AGENT_STATUS ?? agent.statusName ?? '');
            break;
          case 'count':
            row[col.key] = Number(ws?.SUM_ANSW_CNT ?? agent.talkCount ?? 0);
            break;
          default:
            row[col.key] = ws?.[col.key.toUpperCase()] != null ? String(ws[col.key.toUpperCase()]) : agent[col.key] != null ? String(agent[col.key]) : '';
        }
      });
      return row;
    });
    return applySortAndLimit(result, sortConfig);
  }
  if (widgetId === 'table-group') {
    const selectedGroupIds = selection.groupIds ?? [];
    const filtered = selectedGroupIds.length > 0 ? groupRows.filter((g) => selectedGroupIds.includes(g.groupId)) : groupRows;
    const result = filtered.map((group) => {
      const row: Record<string, string | number> = {};
      columns.forEach((col) => {
        switch (col.key) {
          case 'name':
            row[col.key] = group.groupName;
            break;
          case 'agents':
            row[col.key] = group.agentCount;
            break;
          case 'talk':
            row[col.key] = group.talkCount;
            break;
          default: {
            // IC:GROUP:{mediaType} 해시에서 compositeKey별 값을 조회하여 합산
            row[col.key] = (group.compositeKeys ?? []).reduce((sum, ck) => {
              return sum + mediaTypes.reduce((mSum, mt) => mSum + Number(dataByHashKey[`IC:GROUP:${mt}`]?.[ck]?.[col.key.toUpperCase()] ?? 0), 0);
            }, 0);
            break;
          }
        }
      });
      return row;
    });
    return applySortAndLimit(result, sortConfig);
  }
  return [];
}

// ── 실시간 차트 데이터 생성 헬퍼 ─────────────────────────────────────────────
function buildLiveChartData(
  widgetId: string,
  queueRows: CtiQueueRow[],
  agentRows: CtiAgentRow[],
  groupRows: CtiGroupRow[],
  ctiqWsData: Record<string, CtiqRecord>,
  selectedQueueIds: string[],
): Array<{ name: string; value: number }> {
  if (widgetId === 'chart-bar-queue' || widgetId === 'chart-line-trend') {
    const hasWs = Object.keys(ctiqWsData).length > 0;
    if (hasWs) {
      const qIds = selectedQueueIds.length > 0 ? selectedQueueIds : Object.keys(ctiqWsData);
      return qIds.slice(0, 8).map((qId) => {
        const q = ctiqWsData[qId] ?? {};
        const name = queueRows.find((r) => r.ctiqId === qId)?.ctiqName ?? qId;
        const value = Number(q.RTS_WAIT_CNT ?? 0);
        return { name, value };
      });
    }
    const filtered = selectedQueueIds.length > 0 ? queueRows.filter((q) => selectedQueueIds.includes(q.ctiqId)) : queueRows;
    return filtered.slice(0, 8).map((q) => ({ name: q.ctiqName, value: q.rtsWaitCnt ?? 0 }));
  }
  if (widgetId === 'chart-pie-agent') {
    const statusMap: Record<string, number> = {};
    agentRows.forEach((agent) => {
      const s = agent.statusName || '알수없음';
      statusMap[s] = (statusMap[s] ?? 0) + 1;
    });
    return Object.entries(statusMap).map(([name, value]) => ({ name, value }));
  }
  if (widgetId === 'chart-donut-group') {
    return groupRows.slice(0, 6).map((g) => ({ name: g.groupName, value: g.talkCount }));
  }
  return [];
}

// ── 테이블 위젯 렌더 ────────────────────────────────────────────────────────
function RollingTableWidget({
  widget,
  liveRows,
  columns: columnsOverride,
  fontScale = 1,
}: {
  widget: DroppedWidget;
  liveRows?: Record<string, string | number>[];
  columns?: TableColumn[];
  fontScale?: number;
}) {
  const cfg = widget.item.tableConfig;
  if (!cfg) return null;
  const showTitle = widget.showTitle !== false;
  const displayTitle = widget.customTitle ?? widget.item.label;
  const rows = liveRows && liveRows.length > 0 ? liveRows : cfg.sampleRows;
  const columns = (columnsOverride ?? (cfg.columns as TableColumn[])).filter((c) => !c.hidden);
  const cellBorderBottom = cfg.showBorder === false ? 'none' : `${cfg.borderWidth ?? 1}px solid ${widget.style.color}40`;
  const cellBorderRight = cellBorderBottom;
  const rowHeight = cfg.rowGap ?? 0;
  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {showTitle && (
        <div
          className="truncate font-semibold px-1 flex-shrink-0"
          style={{
            fontSize: `${Math.max(8, Math.round(widget.style.fontSize * 0.65 * fontScale))}px`,
            textAlign: widget.style.titleAlign ?? 'left',
            color: widget.style.color,
            fontFamily: widget.style.fontFamily,
          }}
        >
          {displayTitle}
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <table
          className="w-full"
          style={{
            fontSize: `${Math.max(7, Math.round(widget.style.fontSize * 0.6 * fontScale))}px`,
            color: widget.style.color,
            fontFamily: widget.style.fontFamily,
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
          }}
        >
          <thead>
            <tr>
              {columns.map((col, colIdx) => (
                <th
                  key={col.key}
                  style={{
                    width: col.width,
                    padding: cfg.hideColumnLabels ? 0 : '1px 3px',
                    height: cfg.hideColumnLabels ? 0 : rowHeight || undefined,
                    textAlign: col.align ?? 'center',
                    verticalAlign: col.verticalAlign ?? 'middle',
                    fontWeight: 600,
                    fontFamily: widget.style.fontFamily,
                    borderRight: colIdx < columns.length - 1 ? cellBorderRight : 'none',
                  }}
                >
                  <span
                    style={{
                      opacity: 0.7,
                      display: 'block',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      ...(cfg.hideColumnLabels ? { fontSize: 0, lineHeight: 0 } : {}),
                    }}
                  >
                    {!cfg.hideColumnLabels && col.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                {columns.map((col, colIdx) => (
                  <AnimatedTableCell
                    key={col.key}
                    value={row[col.key]}
                    col={col}
                    style={widget.style}
                    align={col.align ?? 'center'}
                    borderBottom={cellBorderBottom}
                    borderRight={colIdx < columns.length - 1 ? cellBorderRight : 'none'}
                    rowHeight={rowHeight}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 차트 위젯 렌더 ───────────────────────────────────────────────────────────
function RollingChartWidget({ widget, liveData, fontScale = 1 }: { widget: DroppedWidget; liveData: Array<{ name: string; value: number }>; fontScale?: number }) {
  const cfg = widget.item.chartConfig as ChartConfig | undefined;
  const chartType = cfg?.chartType ?? 'bar';
  const data = liveData.length > 0 ? liveData : (cfg?.sampleData ?? []);
  const showTitle = widget.showTitle !== false;
  const displayTitle = widget.customTitle ?? widget.item.label;
  const tickFontSize = Math.round(8 * fontScale);
  const tooltipFontSize = Math.round(10 * fontScale);
  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {showTitle && (
        <div
          className="truncate font-semibold px-1 flex-shrink-0"
          style={{
            fontSize: `${Math.max(8, Math.round(widget.style.fontSize * 0.65 * fontScale))}px`,
            textAlign: widget.style.titleAlign ?? 'left',
            color: widget.style.color,
            fontFamily: widget.style.fontFamily,
          }}
        >
          {displayTitle}
        </div>
      )}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={data} margin={{ top: 2, right: 4, bottom: 2, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" tick={{ fill: widget.style.color, fontSize: tickFontSize }} />
              <YAxis tick={{ fill: widget.style.color, fontSize: tickFontSize }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', fontSize: tooltipFontSize }} />
              <Bar dataKey="value">
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_ROLLING_COLORS[i % CHART_ROLLING_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : chartType === 'line' ? (
            <LineChart data={data} margin={{ top: 2, right: 4, bottom: 2, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" tick={{ fill: widget.style.color, fontSize: tickFontSize }} />
              <YAxis tick={{ fill: widget.style.color, fontSize: tickFontSize }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', fontSize: tooltipFontSize }} />
              <Line type="monotone" dataKey="value" stroke={widget.item.color} strokeWidth={2} dot={false} />
            </LineChart>
          ) : (
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={chartType === 'donut' ? '40%' : 0} outerRadius="70%">
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_ROLLING_COLORS[i % CHART_ROLLING_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', fontSize: tooltipFontSize }} />
              <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: tickFontSize, color: widget.style.color }} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const ROLLING_ETC_CLOCK_IDS = new Set(['etc-date', 'etc-time', 'etc-datetime', 'etc-custom']);

function RollingValueWidget({
  widget,
  widgets,
  redisData,
  selectionIdsByHashKey,
  targetGroupIds = [],
  fontScale = 1,
}: {
  widget: DroppedWidget;
  widgets: DroppedWidget[];
  redisData?: CtiWsDataByHashKey;
  selectionIdsByHashKey?: Record<string, string[]>;
  /** IC:GROUP:REASON 패밀리 단일값 위젯 전용 — 이 슬라이드의 디스플레이 선택 그룹ID 목록(없으면 전체 그룹). */
  targetGroupIds?: string[];
  fontScale?: number;
}) {
  const isEtcClock = widget.item.category === 'etc' && ROLLING_ETC_CLOCK_IDS.has(widget.item.id);
  const isDbQuery = widget.item.category === 'DbQuery' && !!widget.item.dbQueryKey;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isEtcClock) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isEtcClock]);

  // DbQuery: WS(DB:QUERY 가상 해시키)로 실시간 데이터 수신 — REST 폴링 불필요.
  const dbRecord = isDbQuery ? ((redisData?.['DB:QUERY'] as Record<string, Record<string, string>> | undefined)?.[widget.item.dbQueryKey!] ?? {}) : {};
  const dbQueryValue = isDbQuery
    ? widget.item.dbQueryColumn
      ? (dbRecord[widget.item.dbQueryColumn] ?? dbRecord[widget.item.dbQueryColumn.toUpperCase()] ?? String(widget.item.sampleValue ?? ''))
      : (Object.values(dbRecord)[0] ?? String(widget.item.sampleValue ?? ''))
    : '';

  const getLiveValue = (): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = now.getFullYear();
    const mo = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    const h = pad(now.getHours());
    const mi = pad(now.getMinutes());
    const s = pad(now.getSeconds());
    if (widget.item.id === 'etc-date') return `${y}${mo}${d}`;
    if (widget.item.id === 'etc-time') return `${h}${mi}${s}`;
    if (widget.item.id === 'etc-datetime') return `${y}${mo}${d} ${h}:${mi}:${s}`;
    if (widget.item.id === 'etc-custom') return formatCustomClock(now, widget.clockFormat ?? DEFAULT_CUSTOM_CLOCK_FORMAT);
    return String(widget.item.sampleValue);
  };

  const isRedis = widget.item.category === 'Redis' && !!widget.item.redisHashKey;
  const isCalc = widget.item.category === 'Calc';
  const groupBy = isRedis ? widget.item.groupBy : undefined;
  // IC:GROUP:REASON:{groupId}:{mediaType}처럼 그룹마다 키가 따로 있는 패밀리는 이 슬라이드가 선택한
  // 그룹들의 키를 전부 모아 합산한다(뷰그룹에 없는 그룹은 절대 섞이지 않음). 데이터는 REST 폴링이 아니라
  // 화면 단일 WS 연결(redisData)에서 그대로 읽는다.
  const groupReason = isRedis ? parseGroupReasonHashKey(widget.item.redisHashKey!) : null;
  const groupBySum = groupBy
    ? groupReason
      ? (groupSumAcrossHashKeys(redisData ?? {}, buildGroupReasonHashKeys(groupReason.mediaType, targetGroupIds), groupBy.byKey, groupBy.aggKey).get(groupBy.matchValue) ?? 0)
      : (groupSumRedisHashEntries(redisData?.[widget.item.redisHashKey!] ?? {}, groupBy.byKey, groupBy.aggKey).get(groupBy.matchValue) ?? 0)
    : undefined;
  const displayValue = isEtcClock
    ? getLiveValue()
    : isDbQuery
      ? dbQueryValue
      : isCalc
        ? getCalcDisplayValue(widget, widgets, redisData, selectionIdsByHashKey)
        : (groupBySum ?? (isRedis ? getRedisDisplayValue(widget, redisData, selectionIdsByHashKey) : widget.item.sampleValue));
  const showTitle = widget.showTitle !== false;
  const displayTitle = widget.customTitle ?? widget.item.label;
  const animKey = useValueChangeKey(displayValue);
  const thresholdColor = getThresholdColor(displayValue, widget.style);
  return (
    <div className="relative w-full h-full flex flex-col justify-center px-2 overflow-hidden">
      {/* 하이라이트 모션은 텍스트가 아니라 위젯 박스 전체를 덮는 오버레이로 그려서, 값 위치 세밀조정으로
          텍스트가 어디로 이동해 있어도 사용자가 정한 위젯 영역 전체에 배경색이 채워지게 한다. */}
      {widget.style.valueChangeAnimation === 'highlight' && (
        <div key={`hl-${animKey}`} className="absolute inset-0 pointer-events-none tb-anim-highlight" style={getValueAnimationStyle(widget.style)} />
      )}
      {showTitle && (
        <div
          className="truncate mb-0.5 opacity-80 leading-tight"
          style={{ fontSize: `${Math.max(8, Math.round(widget.style.fontSize * 0.65 * fontScale))}px`, textAlign: widget.style.titleAlign ?? 'left' }}
        >
          {displayTitle}
        </div>
      )}
      <div
        key={animKey}
        className={`font-bold leading-tight truncate ${widget.style.valueChangeAnimation !== 'highlight' ? getValueAnimationClass(widget.style.valueChangeAnimation) : ''}`}
        style={{
          fontSize: widget.style.fontSize * fontScale,
          textAlign: widget.style.valueAlign ?? 'left',
          color: thresholdColor,
          ...getValueOffsetStyle(widget.style),
          ...(widget.style.valueChangeAnimation !== 'highlight' ? getValueAnimationStyle(widget.style) : {}),
        }}
      >
        {formatWidgetValue(displayValue, widget.style.useThousandSep)}
        {isCalc && widget.calc?.showPercent && (
          <span
            className="font-normal ml-0.5 opacity-70"
            style={{ fontSize: `${Math.max(8, Math.round(widget.style.fontSize * (widget.calc?.percentFontScale ?? 0.65) * fontScale))}px` }}
          >
            %
          </span>
        )}
        {widget.item.unit && (
          <span className="font-normal ml-0.5 opacity-70" style={{ fontSize: `${Math.max(8, Math.round(widget.style.fontSize * 0.65 * fontScale))}px` }}>
            {widget.item.unit}
          </span>
        )}
      </div>
    </div>
  );
}

// ── LayoutScreen ─────────────────────────────────────────────────────────────
interface LayoutScreenProps {
  layout: RollingLayout;
  liveQueues?: CtiQueueRow[];
  liveAgents?: CtiAgentRow[];
  liveGroups?: CtiGroupRow[];
  /** RollingPlayer가 로테이션 전체 레이아웃 합산으로 구독한 WS 데이터(공유) */
  dataByHashKey?: Record<string, Record<string, CtiqRecord>>;
  agentHashKeys?: string[];
}

export function LayoutScreen({ layout, liveQueues = [], liveAgents = [], liveGroups = [], dataByHashKey = {}, agentHashKeys = [] }: LayoutScreenProps) {
  const widgets = parseLayoutWidgets(layout.layoutJson);
  const selection = parseSelection(layout.selectionJson);
  const { sectionSelections } = layout;
  const [imgRatio, setImgRatio] = useState(16 / 9);
  const fontScale = useResponsiveFontScale(imgRatio);

  // 미디어타입은 이 레이아웃 자신의 위젯(item.mediaType)에서 가져온다 — 디스플레이 선택값이 아님.
  const { queueMediaTypes, groupMediaTypes } = collectTableColumns(widgets);

  // GROUP/CTIQ/AGENT(미디어타입 해시) 단일값 위젯이 보여줄 id들은 이 슬라이드 자신의 선택값 기준으로 결정.
  // (RollingPlayer가 모든 슬라이드를 합산해 구독은 이미 끝냈으므로, 여기서는 받은 데이터 중 이 슬라이드 몫만 골라 읽는다)
  const selectionIdsByHashKey = buildSelectionIdsByHashKey(widgets, {
    queueRows: liveQueues,
    selectedQueueIds: selection.queueIds ?? [],
    groupRows: liveGroups,
    selectedGroupIds: selection.groupIds ?? [],
    agentRows: liveAgents,
    selectedAgentIds: selection.agentIds ?? [],
  });

  const ctiqWsData = mergeByHashKeys(
    dataByHashKey,
    queueMediaTypes.map((mt) => `IC:CTIQ:${mt}`),
  );

  // table-group 위젯 컬럼 — 커스텀 컬럼 없을 때만, 공유 WS 응답(전체 컬럼)에서 RTS_ 컬럼 자동 추론
  const tableGroupWidgets = widgets.filter((w) => w.item.id === 'table-group' && Array.isArray(w.item.tableConfig?.columns));
  const configuredRtsCols = tableGroupWidgets.flatMap((w) =>
    (w.item.tableConfig!.columns as TableColumn[]).filter((c) => !['name', 'agents', 'talk'].includes(c.key)).map((c) => c.key.toUpperCase()),
  );
  const groupCompositeKeys = [...new Set(liveGroups.filter((g) => !selection.groupIds?.length || selection.groupIds.includes(g.groupId)).flatMap((g) => g.compositeKeys ?? []))];
  // IC:GROUP:REASON 패밀리 전용 — 이 슬라이드 자신의 선택값 기준(선택 없음=전체 그룹). 뷰그룹에 없는
  // 그룹은 절대 나오지 않아야 하므로 다른 슬라이드의 선택값과 섞지 않는다.
  const groupReasonTargetGroupIds = selection.groupIds?.length ? selection.groupIds : liveGroups.map((g) => g.groupId);
  const groupHashRtsFallback =
    configuredRtsCols.length === 0 && tableGroupWidgets.length > 0
      ? [...new Set(groupMediaTypes.flatMap((mt) => Object.keys(dataByHashKey?.[`IC:GROUP:${mt}`]?.[groupCompositeKeys[0] ?? ''] ?? {}).filter((k) => k.startsWith('RTS_'))))]
      : [];

  useEffect(() => {
    if (!layout.fileName) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) setImgRatio(img.naturalWidth / img.naturalHeight);
    };
    img.src = layout.fileName;
  }, [layout.fileName]);

  const renderWidget = (widget: DroppedWidget) => {
    if (isAnnouncementWidget(widget)) return <AnnouncementWidget widget={widget} />;
    // 섹션 모드: 위젯의 sectionKey로 구역별 선택값 적용, 없으면 __etc fallback, 그것도 없으면 기본 selection
    const effectiveSel = widget.sectionKey && sectionSelections ? (sectionSelections[widget.sectionKey] ?? sectionSelections['__etc'] ?? selection) : selection;
    const dt = widget.item.displayType;
    // table-redis는 표/차트 전환 모두 RedisTableWidget 내부에서 처리(실데이터 fetch가 거기 있어서)
    if (isRedisTableWidget(widget)) return <RedisTableWidget widget={widget} fontScale={fontScale} dataByHashKey={dataByHashKey} targetGroupIds={groupReasonTargetGroupIds} />;
    if (dt === 'chart') {
      const liveChartData = buildLiveChartData(widget.item.id, liveQueues, liveAgents, liveGroups, ctiqWsData, effectiveSel.queueIds ?? []);
      return <RollingChartWidget widget={widget} liveData={liveChartData} fontScale={fontScale} />;
    }
    if (dt === 'table') {
      const cfg = widget.item.tableConfig;
      let tableColumns = (cfg?.columns ?? []) as TableColumn[];
      if (widget.item.id === 'table-group' && groupHashRtsFallback.length > 0) {
        const existingKeys = new Set(tableColumns.map((c) => c.key.toUpperCase()));
        const extraCols: TableColumn[] = groupHashRtsFallback.filter((k) => !existingKeys.has(k)).map((k) => ({ key: k.toLowerCase(), label: k }));
        tableColumns = [...tableColumns, ...extraCols];
      }
      const liveRows = cfg
        ? buildLiveTableRows(widget.item.id, liveQueues, liveAgents, liveGroups, tableColumns, effectiveSel, [widget.item.mediaType ?? '0'], dataByHashKey, agentHashKeys, {
            key: cfg.sortKey,
            order: cfg.sortOrder,
            limit: cfg.limit,
          })
        : [];
      return <RollingTableWidget widget={widget} liveRows={liveRows} columns={tableColumns} fontScale={fontScale} />;
    }
    return (
      <RollingValueWidget
        widget={widget}
        widgets={widgets}
        redisData={dataByHashKey}
        selectionIdsByHashKey={selectionIdsByHashKey}
        targetGroupIds={groupReasonTargetGroupIds}
        fontScale={fontScale}
      />
    );
  };

  return (
    <div className="w-full h-full relative bg-black overflow-hidden flex items-center justify-center">
      <div
        className="relative overflow-hidden flex-shrink-0"
        style={{
          width: `min(100vw, calc(${imgRatio} * 100vh))`,
          height: `min(100vh, calc(100vw / ${imgRatio}))`,
        }}
      >
        {layout.fileName && <img src={layout.fileName} alt={layout.layoutName} className="absolute inset-0 w-full h-full object-fill pointer-events-none" />}
        {widgets.map((widget) => (
          <div
            key={widget.id}
            style={{
              position: 'absolute',
              left: `${widget.x}%`,
              top: `${widget.y}%`,
              width: `${widget.w ?? 13}%`,
              height: `${widget.h ?? 16}%`,
              ...getWidgetVisualStyle(widget.style, fontScale),
            }}
            className={isTransparentBg(widget.style) ? '' : 'shadow-xl backdrop-blur-sm'}
          >
            {renderWidget(widget)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── RollingPlayer ─────────────────────────────────────────────────────────────
export interface RollingPlayerProps {
  layouts: RollingLayout[];
  intervalSec: number;
  transitionType?: string;
  onStop?: () => void;
}

export function RollingPlayer({ layouts, intervalSec, transitionType = 'fade', onStop }: RollingPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // HTTP 폴링 — 큐/상담사/그룹 전체 목록 (정적 마스터성 데이터, 마운트 시 1회만)
  const { data: queueRows = [], isLoading: queueLoading } = useGetCtiQueueList({ queryOptions: { refetchInterval: false } });
  const { data: agentRows = [], isLoading: agentLoading } = useGetCtiAgentList({ queryOptions: { refetchInterval: false } });
  const { data: groupRows = [], isLoading: groupLoading } = useGetCtiGroupList({ queryOptions: { refetchInterval: false } });
  // 마스터 데이터가 모두 로드될 때까지 WS 연결을 미뤄 데이터 로드 순서에 따른 재연결을 방지한다.
  const isMasterLoading = queueLoading || agentLoading || groupLoading;

  // 로테이션에 포함된 모든 레이아웃의 디스플레이 선택값(큐/그룹/상담사) + 위젯 컬럼/미디어타입을 합산해 WS 구독 하나로 커버.
  // 미디어타입은 디스플레이 선택값이 아니라 위젯 등록 시점에 고정된 값(item.mediaType).
  const allSelections = layouts.map((l) => parseSelection(l.selectionJson));

  // 로테이션 전체 레이아웃 중 그 데이터를 실제로 쓰는 위젯이 하나라도 있을 때만 해당 종류를 구독(불필요한 대량 조회 방지)
  const allWidgets = layouts.flatMap((l) => parseLayoutWidgets(l.layoutJson));
  const { groupColumns, queueColumns, agentColumns, groupMediaTypes, queueMediaTypes, agentMediaTypes } = collectTableColumns(allWidgets);
  const needsQueue = allWidgets.some((w) => w.item.id === 'table-queue' || w.item.id === 'chart-bar-queue' || w.item.id === 'chart-line-trend');
  const needsGroup = allWidgets.some((w) => w.item.id === 'table-group');
  const needsAgent = allWidgets.some((w) => w.item.id === 'table-agent');

  // GROUP과 동일한 "선택 없음 = 전체" 규칙 — 합집합이 비어있으면(슬라이드 전부 미선택) 마스터 큐 전체를 구독한다.
  const allSelectedQueueIds = [...new Set(allSelections.flatMap((s) => s.queueIds ?? []))];
  const allQueueIds = needsQueue ? (allSelectedQueueIds.length > 0 ? allSelectedQueueIds : queueRows.map((q) => q.ctiqId)) : [];
  const allSelectedGroupIds = [...new Set(allSelections.flatMap((s) => s.groupIds ?? []))];
  const groupCompositeKeys = needsGroup
    ? [...new Set(groupRows.filter((g) => allSelectedGroupIds.length === 0 || allSelectedGroupIds.includes(g.groupId)).flatMap((g) => g.compositeKeys ?? []))]
    : [];
  const allSelectedAgentIds = [...new Set(allSelections.flatMap((s) => s.agentIds ?? []))];
  const targetAgents = allSelectedAgentIds.length > 0 ? agentRows.filter((a) => allSelectedAgentIds.includes(a.agentId)) : agentRows;
  const agentIdsByGroupId = needsAgent
    ? targetAgents.reduce<Record<string, string[]>>((acc, a) => {
        if (!a.groupId) return acc;
        (acc[a.groupId] ??= []).push(a.agentId);
        return acc;
      }, {})
    : {};
  const agentHashKeys = Object.keys(agentIdsByGroupId).flatMap((groupId) => agentMediaTypes.map((mt) => `IC:AGENT:${groupId}:${mt}`));

  // 좌측 트리에서 드래그한 임의 hashKey 단일값 Redis 위젯 — 로테이션 내 모든 레이아웃 합산해 같은 WS 소켓으로 구독.
  // GROUP/CTIQ/AGENT(미디어타입 해시) 위젯은 슬라이드마다 선택값이 다를 수 있으므로, 구독은 전체 슬라이드 선택값의
  // 합집합으로 넉넉히 받아두고 실제 화면 표시는 LayoutScreen에서 그 슬라이드 자신의 선택값으로 다시 골라 읽는다.
  const widgetRedisSubscriptions = collectRedisWsSubscriptions(
    allWidgets,
    buildSelectionIdsByHashKey(allWidgets, {
      queueRows,
      selectedQueueIds: allSelectedQueueIds,
      groupRows,
      selectedGroupIds: allSelectedGroupIds,
      agentRows,
      selectedAgentIds: allSelectedAgentIds,
    }),
  );

  // IC:GROUP:REASON 패밀리 전용 — 로테이션 내 모든 슬라이드 선택값의 합집합(없으면 전체 그룹). 화면별
  // 실제 표시는 LayoutScreen이 그 슬라이드 자신의 선택값으로 다시 걸러서 보여준다.
  const allGroupReasonTargetGroupIds = allSelectedGroupIds.length > 0 ? allSelectedGroupIds : groupRows.map((g) => g.groupId);
  // table-redis(임의 해시 통째로 보여주는 위젯) 구독도 같이 모아서 화면당 단일 소켓에 합친다 — 따로 소켓을
  // 열면 위젯이 있는 화면마다 ctiq 소켓이 2개로 보임(RedisTableWidget.tsx의 collectRedisTableWsSubscriptions 참고)
  const { data: allRedisHashKeysForTable = [] } = useGetRedisHashKeys();
  const redisTableSubscriptions = collectRedisTableWsSubscriptions(allWidgets, allRedisHashKeysForTable, allGroupReasonTargetGroupIds);

  // WebSocket — 전체 레이아웃 큐/그룹/상담사 KPI + 단일값 Redis + DbQuery 위젯 실시간 수신
  // 마스터 데이터 로딩 중에는 빈 구독 → WS 연결 미룸(로드 순서에 따른 재연결 방지)
  const subscriptions: CtiWsSubscription[] = isMasterLoading
    ? []
    : mergeWsSubscriptions([
        ...(allQueueIds.length > 0 ? queueMediaTypes.map((mt) => ({ hashKey: `IC:CTIQ:${mt}`, ids: allQueueIds, columns: queueColumns })) : []),
        ...(groupCompositeKeys.length > 0 ? groupMediaTypes.map((mt) => ({ hashKey: `IC:GROUP:${mt}`, ids: groupCompositeKeys, columns: groupColumns })) : []),
        ...Object.entries(agentIdsByGroupId).flatMap(([groupId, ids]) => agentMediaTypes.map((mt) => ({ hashKey: `IC:AGENT:${groupId}:${mt}`, ids, columns: agentColumns }))),
        ...widgetRedisSubscriptions,
        ...redisTableSubscriptions,
        ...collectDbQueryWsSubscriptions(allWidgets),
      ]);
  const { dataByHashKey } = useCtiqWebSocket(subscriptions);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [resetHideTimer]);

  useEffect(() => {
    if (layouts.length <= 1) return;
    setProgress(0);
    let elapsed = 0;
    const totalMs = intervalSec * 1000;
    const progressInterval = setInterval(() => {
      elapsed += 100;
      setProgress(Math.min((elapsed / totalMs) * 100, 100));
    }, 100);
    const slideTimer = setTimeout(() => setCurrentIndex((prev) => (prev + 1) % layouts.length), totalMs);
    return () => {
      clearInterval(progressInterval);
      clearTimeout(slideTimer);
    };
  }, [currentIndex, layouts.length, intervalSec]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) await containerRef.current?.requestFullscreen();
    else await document.exitFullscreen();
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // '랜덤'은 매 전환(currentIndex 변경)마다 한 번씩 새로 뽑아 전환 도중 애니메이션이 바뀌지 않도록 고정
  const [randomAnimation, setRandomAnimation] = useState(() => TRANSITION_ANIMATION[RANDOM_TRANSITION_POOL[Math.floor(Math.random() * RANDOM_TRANSITION_POOL.length)]]);
  useEffect(() => {
    if (transitionType !== 'random') return;
    setRandomAnimation(TRANSITION_ANIMATION[RANDOM_TRANSITION_POOL[Math.floor(Math.random() * RANDOM_TRANSITION_POOL.length)]]);
  }, [transitionType, currentIndex]);

  const current = layouts[currentIndex];
  if (!current) return null;

  const animation = transitionType === 'random' ? (randomAnimation ?? TRANSITION_ANIMATION.fade) : (TRANSITION_ANIMATION[transitionType] ?? TRANSITION_ANIMATION.fade);
  const styleContent = TRANSITION_CSS + VALUE_CHANGE_ANIMATION_CSS + `body { cursor: ${showControls ? 'auto' : 'none'} !important; }`;

  return (
    <div ref={containerRef} className="w-full h-screen bg-black overflow-hidden relative select-none" onMouseMove={resetHideTimer} onTouchStart={resetHideTimer}>
      <style dangerouslySetInnerHTML={{ __html: styleContent }} />
      <div key={currentIndex} className="absolute inset-0" style={{ animation }}>
        <LayoutScreen layout={current} liveQueues={queueRows} liveAgents={agentRows} liveGroups={groupRows} dataByHashKey={dataByHashKey} agentHashKeys={agentHashKeys} />
      </div>

      <div
        className={`absolute top-0 left-0 right-0 z-50 transition-all duration-500 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-black/70 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            {onStop && (
              <button onClick={onStop} className="text-white/70 hover:text-white text-sm font-semibold px-3 py-1 rounded hover:bg-white/10 transition-colors flex-shrink-0">
                ← 그룹 목록
              </button>
            )}
            <span className="text-white font-bold text-sm truncate min-w-0">{current.layoutName}</span>
            <span className="text-white/40 text-xs flex-shrink-0">
              {currentIndex + 1} / {layouts.length}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-white/40 text-xs">{intervalSec}초마다 전환</span>
            <button
              onClick={toggleFullscreen}
              className="text-white/70 hover:text-white p-1.5 rounded hover:bg-white/10 transition-colors"
              title={isFullscreen ? '전체화면 종료' : '전체화면'}
            >
              {isFullscreen ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 right-0 z-50 transition-all duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {layouts.length > 1 && (
          <div className="flex justify-center gap-2 pb-3 pt-4 bg-gradient-to-t from-black/60 to-transparent">
            {layouts.map((l, i) => (
              <button
                key={i}
                onClick={() => {
                  setCurrentIndex(i);
                  setProgress(0);
                }}
                className={`h-1.5 rounded-full transition-all ${i === currentIndex ? 'w-8 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'}`}
                title={l.layoutName}
              />
            ))}
          </div>
        )}
        <div className="h-1 bg-white/20">
          <div className="h-full bg-[#0f5b9e] transition-none" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
