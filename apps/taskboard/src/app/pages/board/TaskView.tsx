import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from '@/shared-util';
import { type CtiAgentRow, type CtiGroupRow, type CtiQueueRow } from '../../features/board/api/ctiRedisApi';
import { AnnouncementWidget, isAnnouncementWidget } from '../../features/board/components/AnnouncementWidget';
import { MultiSelectDropdown } from '../../features/board/components/MultiSelectDropdown';
import { type CtiWsDataByHashKey, type CtiWsSubscription, type CtiqRecord, useCtiqWebSocket } from '../../features/board/hooks/useCtiqWebSocket';
import { useResponsiveFontScale } from '../../features/board/hooks/useResponsiveFontScale';
import {
  useGetCtiAgentList,
  useGetCtiGroupList,
  useGetCtiQueueList,
  useGetTaskboardDisplayList,
  useGetTaskboardLayoutList,
  useUpdateTaskboardDisplay,
} from '../../features/board/hooks/useTaskboardQueries';
import { useValueChangeKey } from '../../features/board/hooks/useValueChangeAnimation';
import { type ChartConfig, type DroppedWidget, type TableColumn, type TaskboardDisplaySelection, parseLayoutWidgets } from '../../features/board/types/taskboard.types';
import { DEFAULT_CUSTOM_CLOCK_FORMAT, formatCustomClock } from '../../features/board/utils/clockFormat';
import { buildSelectionIdsByHashKey, collectRedisWsSubscriptions, getCalcDisplayValue, getRedisDisplayValue, mergeWsSubscriptions } from '../../features/board/utils/redisValue';
import {
  VALUE_CHANGE_ANIMATION_CSS,
  formatWidgetValue,
  getThresholdColor,
  getValueAnimationClass,
  getValueAnimationStyle,
  getValueOffsetStyle,
  getWidgetVisualStyle,
  isTransparentBg,
} from '../../features/board/utils/widgetVisualStyle';

const CHART_VIEW_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

function parseSelection(selectionJson?: string): TaskboardDisplaySelection {
  if (!selectionJson) return {};
  try {
    return JSON.parse(selectionJson) as TaskboardDisplaySelection;
  } catch {
    return {};
  }
}

/** 여러 hashKey의 id→record 맵을 하나로 합친다 (큐: 미디어타입별, 상담사: 그룹별로 나뉜 hashKey를 평탄화). */
function mergeByHashKeys(dataByHashKey: CtiWsDataByHashKey, hashKeys: string[]): Record<string, CtiqRecord> {
  const merged: Record<string, CtiqRecord> = {};
  hashKeys.forEach((hk) => Object.assign(merged, dataByHashKey[hk] ?? {}));
  return merged;
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
  dataByHashKey: CtiWsDataByHashKey,
  agentHashKeys: string[],
): Record<string, string | number>[] {
  if (widgetId === 'table-queue') {
    const selectedQueueIds = selection.queueIds ?? [];
    const ctiqWsData = mergeByHashKeys(
      dataByHashKey,
      mediaTypes.map((mt) => `IC:CTIQ:${mt}`),
    );
    const filtered = selectedQueueIds.length > 0 ? queueRows.filter((q) => selectedQueueIds.includes(q.ctiqId)) : queueRows;
    return filtered.slice(0, 20).map((q) => {
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
  }
  if (widgetId === 'table-agent') {
    const selectedAgentIds = selection.agentIds ?? [];
    const agentWsData = mergeByHashKeys(dataByHashKey, agentHashKeys);
    const filtered = selectedAgentIds.length > 0 ? agentRows.filter((a) => selectedAgentIds.includes(a.agentId)) : agentRows;
    return filtered.slice(0, 20).map((agent) => {
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
  }
  if (widgetId === 'table-group') {
    const selectedGroupIds = selection.groupIds ?? [];
    const filtered = selectedGroupIds.length > 0 ? groupRows.filter((g) => selectedGroupIds.includes(g.groupId)) : groupRows;
    return filtered.slice(0, 20).map((group) => {
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
function ViewTableWidget({
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
  const columns = columnsOverride ?? (cfg.columns as TableColumn[]);
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
          className="w-full border-collapse"
          style={{ fontSize: `${Math.max(7, Math.round(widget.style.fontSize * 0.6 * fontScale))}px`, color: widget.style.color, fontFamily: widget.style.fontFamily }}
        >
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width, borderBottom: `1px solid ${widget.style.color}40`, padding: '1px 3px', textAlign: 'center', opacity: 0.7, fontWeight: 600 }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                {columns.map((col) => (
                  <td key={col.key} style={{ padding: '1px 3px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {row[col.key]}
                  </td>
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
function ViewChartWidget({ widget, liveData, fontScale = 1 }: { widget: DroppedWidget; liveData: Array<{ name: string; value: number }>; fontScale?: number }) {
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
                  <Cell key={i} fill={CHART_VIEW_COLORS[i % CHART_VIEW_COLORS.length]} />
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
                  <Cell key={i} fill={CHART_VIEW_COLORS[i % CHART_VIEW_COLORS.length]} />
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

// ── 단일값 위젯 렌더 ────────────────────────────────────────────────────────
const VIEW_ETC_CLOCK_IDS = new Set(['etc-date', 'etc-time', 'etc-datetime', 'etc-custom']);

function ViewValueWidget({
  widget,
  widgets,
  redisData,
  selectionIdsByHashKey,
  fontScale = 1,
}: {
  widget: DroppedWidget;
  widgets: DroppedWidget[];
  redisData?: CtiWsDataByHashKey;
  selectionIdsByHashKey?: Record<string, string[]>;
  fontScale?: number;
}) {
  const isEtcClock = widget.item.category === 'etc' && VIEW_ETC_CLOCK_IDS.has(widget.item.id);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isEtcClock) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isEtcClock]);

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
  const displayValue = isEtcClock
    ? getLiveValue()
    : isCalc
      ? getCalcDisplayValue(widget, widgets, redisData, selectionIdsByHashKey)
      : isRedis
        ? getRedisDisplayValue(widget, redisData, selectionIdsByHashKey)
        : widget.item.sampleValue;
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

// ── 디스플레이 설정 패널(톱니바퀴) ──────────────────────────────────────────
function DisplaySettingsPanel({ displayId, selection, onClose, onSaved }: { displayId: number; selection: TaskboardDisplaySelection; onClose: () => void; onSaved: () => void }) {
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>(selection.queueIds ?? []);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(selection.groupIds ?? []);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(selection.agentIds ?? []);
  const [isSaving, setIsSaving] = useState(false);

  const [queueDropdownOpen, setQueueDropdownOpen] = useState(false);
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const queueDropdownRef = useRef<HTMLDivElement>(null);
  const groupDropdownRef = useRef<HTMLDivElement>(null);
  const agentDropdownRef = useRef<HTMLDivElement>(null);

  const { data: queueRows = [], isFetching: queueFetching } = useGetCtiQueueList({ queryOptions: { refetchInterval: false } });
  const { data: groupRows = [], isFetching: groupFetching } = useGetCtiGroupList({ queryOptions: { refetchInterval: false } });
  const { data: agentRows = [], isFetching: agentFetching } = useGetCtiAgentList({ queryOptions: { refetchInterval: false } });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (queueDropdownRef.current && !queueDropdownRef.current.contains(e.target as Node)) setQueueDropdownOpen(false);
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(e.target as Node)) setGroupDropdownOpen(false);
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(e.target as Node)) setAgentDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleQueue = (id: string) => setSelectedQueueIds((prev) => (prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]));
  const toggleAllQueues = () => setSelectedQueueIds((prev) => (prev.length === queueRows.length && queueRows.length > 0 ? [] : queueRows.map((q) => q.ctiqId)));
  const toggleGroup = (id: string) => setSelectedGroupIds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  const toggleAllGroups = () => setSelectedGroupIds((prev) => (prev.length === groupRows.length && groupRows.length > 0 ? [] : groupRows.map((g) => g.groupId)));
  const toggleAgent = (id: string) => setSelectedAgentIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  const toggleAllAgents = () => setSelectedAgentIds((prev) => (prev.length === agentRows.length && agentRows.length > 0 ? [] : agentRows.map((a) => a.agentId)));

  const updateDisplay = useUpdateTaskboardDisplay({});

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const selectionJson = JSON.stringify({
        queueIds: selectedQueueIds,
        groupIds: selectedGroupIds,
        agentIds: selectedAgentIds,
      });
      await updateDisplay.mutateAsync({ displayId, selectionJson });
      toast.success('표시값이 저장되었습니다.');
      onSaved();
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800">표시값 설정</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
            &times;
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">
          <div className="flex flex-col gap-2.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold text-cyan-800 whitespace-nowrap w-14 flex-shrink-0">큐</span>
              <MultiSelectDropdown
                label="큐"
                color="#0891b2"
                isFetching={queueFetching}
                items={queueRows.map((q) => ({ id: q.ctiqId, name: q.ctiqName }))}
                selectedIds={selectedQueueIds}
                isOpen={queueDropdownOpen}
                dropdownRef={queueDropdownRef}
                onToggleOpen={() => setQueueDropdownOpen((v) => !v)}
                onToggleItem={toggleQueue}
                onToggleAll={toggleAllQueues}
                emptyText="큐 데이터 없음"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold text-violet-700 whitespace-nowrap w-14 flex-shrink-0">상담그룹</span>
              <MultiSelectDropdown
                label="상담그룹"
                color="#7c3aed"
                isFetching={groupFetching}
                items={groupRows.map((g) => ({ id: g.groupId, name: g.groupName }))}
                selectedIds={selectedGroupIds}
                isOpen={groupDropdownOpen}
                dropdownRef={groupDropdownRef}
                onToggleOpen={() => setGroupDropdownOpen((v) => !v)}
                onToggleItem={toggleGroup}
                onToggleAll={toggleAllGroups}
                emptyText="그룹 데이터 없음"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold text-emerald-700 whitespace-nowrap w-14 flex-shrink-0">상담사</span>
              <MultiSelectDropdown
                label="상담사"
                color="#059669"
                isFetching={agentFetching}
                items={agentRows.map((a) => ({ id: a.agentId, name: a.agentName }))}
                selectedIds={selectedAgentIds}
                isOpen={agentDropdownOpen}
                dropdownRef={agentDropdownRef}
                onToggleOpen={() => setAgentDropdownOpen((v) => !v)}
                onToggleItem={toggleAgent}
                onToggleAll={toggleAllAgents}
                emptyText="상담사 데이터 없음"
              />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-md transition-colors">
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82] transition-colors shadow-sm disabled:opacity-60"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 단일 레이아웃 뷰 ────────────────────────────────────────────────────────
function SingleLayoutView({
  displayId,
  displayName,
  layout,
  selection,
  onSelectionSaved,
}: {
  displayId: number;
  displayName: string;
  layout: { layoutName: string; layoutJson?: string; fileName?: string; pageName?: string };
  selection: TaskboardDisplaySelection;
  onSelectionSaved: () => void;
}) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [imgRatio, setImgRatio] = useState(16 / 9);
  const fontScale = useResponsiveFontScale(imgRatio);

  const widgets = parseLayoutWidgets(layout.layoutJson);

  const selectedQueueIds = selection.queueIds ?? [];
  const selectedGroupIds = selection.groupIds ?? [];
  const selectedAgentIds = selection.agentIds ?? [];

  // 큐/상담사/그룹 전체 목록 — 이름 표시 및 id↔groupId 매핑용(정적 마스터성 데이터, KPI 값 아님).
  // 실시간 KPI는 WS로 받으므로 5초 자동폴링 끄고 마운트 시 1회만 조회.
  const { data: queueRows = [] } = useGetCtiQueueList({ queryOptions: { refetchInterval: false } });
  const { data: agentRows = [] } = useGetCtiAgentList({ queryOptions: { refetchInterval: false } });
  const { data: groupRows = [] } = useGetCtiGroupList({ queryOptions: { refetchInterval: false } });

  // 좌측 트리에서 드래그한 임의 hashKey 단일값 Redis 위젯 — 큐/그룹/상담사 실시간 KPI와 동일한 WS 소켓으로 구독.
  // GROUP/CTIQ/AGENT(미디어타입 해시) 위젯은 디자인 시점에 고정된 id 대신, 디스플레이 선택값으로 어떤 id들을 볼지 결정한다.
  const selectionIdsByHashKey = buildSelectionIdsByHashKey(widgets, {
    queueRows,
    selectedQueueIds,
    groupRows,
    selectedGroupIds,
    agentRows,
    selectedAgentIds,
  });
  const widgetRedisSubscriptions = collectRedisWsSubscriptions(widgets, selectionIdsByHashKey);

  // 큐/그룹/상담사 실시간 KPI — WS 구독. "캔버스에 그 데이터를 실제로 쓰는 위젯이 있을 때만" 구독해서
  // 디스플레이에 선택만 돼 있고 화면에 안 보여주는 큐/그룹/상담사까지 불필요하게 통째로 받아오는 걸 막는다.
  // 미디어타입은 위젯 등록 시점에 고정된 값(item.mediaType)을 그대로 쓴다 — 디스플레이 단위 선택값이 아님.
  const tableGroupWidgets = widgets.filter((w) => w.item.id === 'table-group' && Array.isArray(w.item.tableConfig?.columns));
  const tableQueueWidgets = widgets.filter((w) => w.item.id === 'table-queue' && Array.isArray(w.item.tableConfig?.columns));
  const tableAgentWidgets = widgets.filter((w) => w.item.id === 'table-agent' && Array.isArray(w.item.tableConfig?.columns));
  const queueChartWidgets = widgets.filter((w) => w.item.id === 'chart-bar-queue' || w.item.id === 'chart-line-trend');
  const needsGroup = tableGroupWidgets.length > 0;
  const needsAgent = tableAgentWidgets.length > 0;
  const needsQueue = tableQueueWidgets.length > 0 || queueChartWidgets.length > 0;

  const groupMediaTypes = [...new Set(tableGroupWidgets.map((w) => w.item.mediaType ?? '0'))];
  const queueMediaTypes = [...new Set([...tableQueueWidgets, ...queueChartWidgets].map((w) => w.item.mediaType ?? '0'))];
  const agentMediaTypes = [...new Set(tableAgentWidgets.map((w) => w.item.mediaType ?? '0'))];

  // GROUP과 동일한 "선택 없음 = 전체" 규칙 — selectedQueueIds가 비어있으면(미선택) 마스터 큐 전체를 구독한다.
  // (row 표시 쪽 selectedQueueIds 필터는 그대로 두고, WS 구독용 id 목록만 별도로 만든다)
  const queueIdsForSub = needsQueue ? (selectedQueueIds.length > 0 ? selectedQueueIds : queueRows.map((q) => q.ctiqId)) : [];

  const groupCompositeKeys = needsGroup
    ? [...new Set(groupRows.filter((g) => selectedGroupIds.length === 0 || selectedGroupIds.includes(g.groupId)).flatMap((g) => g.compositeKeys ?? []))]
    : [];
  const targetAgents = selectedAgentIds.length > 0 ? agentRows.filter((a) => selectedAgentIds.includes(a.agentId)) : agentRows;
  const agentIdsByGroupId = needsAgent
    ? targetAgents.reduce<Record<string, string[]>>((acc, a) => {
        if (!a.groupId) return acc;
        (acc[a.groupId] ??= []).push(a.agentId);
        return acc;
      }, {})
    : {};
  const agentHashKeys = Object.keys(agentIdsByGroupId).flatMap((groupId) => agentMediaTypes.map((mt) => `IC:AGENT:${groupId}:${mt}`));

  // table-group 위젯 컬럼 — 커스텀 컬럼이 있으면 그 컬럼만 구독, 없으면 컬럼 미지정(전체) 요청 후 RTS_ 컬럼 자동 추론
  const configuredRtsCols = tableGroupWidgets.flatMap((w) =>
    (w.item.tableConfig!.columns as TableColumn[]).filter((c) => !['name', 'agents', 'talk'].includes(c.key)).map((c) => c.key.toUpperCase()),
  );
  const groupColumns = configuredRtsCols.length > 0 ? [...new Set(configuredRtsCols)] : undefined;

  // table-queue / chart-queue 위젯이 실제 쓰는 컬럼만 구독
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

  // table-agent 위젯이 실제 쓰는 컬럼만 구독
  const agentColumns = [
    ...new Set(
      tableAgentWidgets.flatMap((w) =>
        (w.item.tableConfig!.columns as TableColumn[]).map((c) =>
          c.key === 'status' ? 'AGENT_STATUS' : c.key === 'count' ? 'SUM_ANSW_CNT' : c.key === 'name' ? null : c.key.toUpperCase(),
        ),
      ),
    ),
  ].filter((c): c is string => !!c);

  const subscriptions: CtiWsSubscription[] = mergeWsSubscriptions([
    ...(queueIdsForSub.length > 0 ? queueMediaTypes.map((mt) => ({ hashKey: `IC:CTIQ:${mt}`, ids: queueIdsForSub, columns: queueColumns })) : []),
    ...(groupCompositeKeys.length > 0 ? groupMediaTypes.map((mt) => ({ hashKey: `IC:GROUP:${mt}`, ids: groupCompositeKeys, columns: groupColumns })) : []),
    ...Object.entries(agentIdsByGroupId).flatMap(([groupId, ids]) => agentMediaTypes.map((mt) => ({ hashKey: `IC:AGENT:${groupId}:${mt}`, ids, columns: agentColumns }))),
    ...widgetRedisSubscriptions,
  ]);
  const { dataByHashKey, isConnected: wsConnected } = useCtiqWebSocket(subscriptions);
  const ctiqWsData = mergeByHashKeys(
    dataByHashKey,
    queueMediaTypes.map((mt) => `IC:CTIQ:${mt}`),
  );

  // 커스텀 컬럼 없을 때만 — 컬럼 미지정(전체) 응답에서 RTS_ 컬럼 자동 추론
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

  const resetHideTimer = () => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const renderWidget = (widget: DroppedWidget) => {
    if (isAnnouncementWidget(widget)) return <AnnouncementWidget widget={widget} />;
    const dt = widget.item.displayType;
    if (dt === 'table') {
      const cfg = widget.item.tableConfig;
      let tableColumns = (cfg?.columns ?? []) as TableColumn[];
      if (widget.item.id === 'table-group' && groupHashRtsFallback.length > 0) {
        const existingKeys = new Set(tableColumns.map((c) => c.key.toUpperCase()));
        const extraCols: TableColumn[] = groupHashRtsFallback.filter((k) => !existingKeys.has(k)).map((k) => ({ key: k.toLowerCase(), label: k }));
        tableColumns = [...tableColumns, ...extraCols];
      }
      const liveRows = cfg
        ? buildLiveTableRows(widget.item.id, queueRows, agentRows, groupRows, tableColumns, selection, [widget.item.mediaType ?? '0'], dataByHashKey, agentHashKeys)
        : [];
      return <ViewTableWidget widget={widget} liveRows={liveRows} columns={tableColumns} fontScale={fontScale} />;
    }
    if (dt === 'chart') {
      const liveChartData = buildLiveChartData(widget.item.id, queueRows, agentRows, groupRows, ctiqWsData, selectedQueueIds);
      return <ViewChartWidget widget={widget} liveData={liveChartData} fontScale={fontScale} />;
    }
    return <ViewValueWidget widget={widget} widgets={widgets} redisData={dataByHashKey} selectionIdsByHashKey={selectionIdsByHashKey} fontScale={fontScale} />;
  };

  const hasLiveSelection = subscriptions.length > 0;

  return (
    <div ref={containerRef} className="w-full h-screen bg-black overflow-hidden relative select-none" onMouseMove={resetHideTimer} onTouchStart={resetHideTimer}>
      <div className="absolute inset-0 flex items-center justify-center">
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

      <div
        className={`absolute top-0 left-0 right-0 z-50 transition-all duration-500 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-black/70 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            <button
              onClick={() => navigate('/taskboard/board/task-list')}
              className="text-white/70 hover:text-white text-sm font-semibold px-3 py-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
            >
              ← 목록
            </button>
            <span className="text-white font-bold text-sm truncate min-w-0">{displayName}</span>
            <span className="text-white/50 text-xs truncate flex-shrink-0 max-w-[200px]">({layout.layoutName})</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasLiveSelection && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${wsConnected ? 'bg-green-500/30 text-green-300' : 'bg-yellow-500/30 text-yellow-300'}`}>
                {wsConnected ? '● 실시간' : '○ 연결중'}
              </span>
            )}
            <span className="text-white/40 text-xs">{widgets.length}개 위젯</span>
            <button onClick={() => setSettingsOpen(true)} className="text-white/70 hover:text-white p-1.5 rounded hover:bg-white/10 transition-colors" title="표시값 설정">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <circle cx={12} cy={12} r={3} />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
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

      {settingsOpen && (
        <DisplaySettingsPanel
          displayId={displayId}
          selection={selection}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => {
            setSettingsOpen(false);
            onSelectionSaved();
          }}
        />
      )}

      <style>{VALUE_CHANGE_ANIMATION_CSS + `body { cursor: ${showControls ? 'auto' : 'none'} !important; }`}</style>
    </div>
  );
}

// ── TaskView 진입점 ─────────────────────────────────────────────────────────
// 레이아웃(전광판)과 뷰 그룹(표시값)은 서로 매핑되지 않는 독립된 풀이다 — URL에 두 id를 직접 받아 그 자리에서 조합한다.
export default function TaskView() {
  const { layoutId, displayId } = useParams<{ layoutId: string; displayId: string }>();
  const navigate = useNavigate();
  const numLayoutId = layoutId ? Number(layoutId) : undefined;
  const numDisplayId = displayId ? Number(displayId) : undefined;

  const { data: layoutList = [], isLoading: layoutLoading } = useGetTaskboardLayoutList();
  const { data: displayList = [], isLoading: displayLoading, refetch } = useGetTaskboardDisplayList();

  if (!numLayoutId || !numDisplayId) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
        <p className="text-lg">전광판 정보가 없습니다.</p>
        <button onClick={() => navigate('/taskboard/board/task-list')} className="px-4 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82]">
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  if (layoutLoading || displayLoading) {
    return <div className="h-screen flex items-center justify-center bg-slate-900 text-white">불러오는 중...</div>;
  }

  const layout = layoutList.find((l) => l.layoutId === numLayoutId);
  const display = displayList.find((d) => d.displayId === numDisplayId);

  if (!layout || !display) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
        <p className="text-lg">{!layout ? '전광판을 찾을 수 없습니다.' : '뷰 그룹을 찾을 수 없습니다.'}</p>
        <button onClick={() => navigate('/taskboard/board/task-list')} className="px-4 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82]">
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <SingleLayoutView
      displayId={display.displayId}
      displayName={display.displayName}
      layout={layout}
      selection={parseSelection(display.selectionJson)}
      onSelectionSaved={() => refetch()}
    />
  );
}
