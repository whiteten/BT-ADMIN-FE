import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Input, Tooltip } from 'antd';
import { BarChart3, Grid2X2, List as ListIcon, PanelTopClose, PanelTopOpen, Search, TrendingUp } from 'lucide-react';
import { DEMO_CHANNELS, isChannelDemoMode } from './demoData';
import { countByStatus, groupBySystem, irTypeLabel, matchSearch, toChannelRows, toNum } from './helpers';
import ChannelBarChart from './parts/ChannelBarChart';
import ChannelCellGrid from './parts/ChannelCellGrid';
import ChannelLineChart from './parts/ChannelLineChart';
import ChannelStatusGrid from './parts/ChannelStatusGrid';
import { CHANNEL_STATUS, CHANNEL_STATUS_ORDER } from './statusMap';
import type { ChannelRow, ChannelUiState, ChannelView } from './types';
import { widgetToolbarSlotId } from '../../components/canvas/WidgetCardHeader';
import type { CustomWidgetComponentProps } from '../registry';
import NoData from '@/components/custom/NoData';
import { usePersistentState } from '@/libs/shared-ui/src/hooks/usePersistentState';

/**
 * 채널 상세 위젯 — AS-IS `sleeSipSystemChannelStatus.jsp` 의 TO-BE.
 *
 * 레이아웃:
 *  ┌────────────────────────────────────────────────────────────────┐
 *  │ ① 툴바(Portal) — 검색 · 채널상태/목록/막대/선 · 요약접기        │
 *  ├────────────────────────────────────────────────────────────────┤
 *  │ ② 시스템(SLEE) 탭 + KPI 스트립 — [전체][점유][IN][OUT][장애]   │  (접기 가능)
 *  ├────────────────────────────────────────────────────────────────┤
 *  │ ③ 상태 레전드 = 필터 칩 (CHNL_STATUS 10종)                      │
 *  ├────────────────────────────────────────────────────────────────┤
 *  │ ④ 본문 — 채널상태 격자 / 목록(ag-Grid) / 막대 / 선 (ECharts)   │
 *  └────────────────────────────────────────────────────────────────┘
 *
 * 데이터: CH:IVR:{SYSTEM_ID} (DS_SLEE_CH_STATE). BE 가 전 시스템 채널을 내려주면
 * FE 가 SYSTEM_ID 로 그룹핑해 시스템 탭으로 전환. 점유 판정은 IR_TYPE 별(statusMap.isChannelBusy).
 */
const VIEW_META: { key: ChannelView; label: string; icon: typeof Grid2X2 }[] = [
  { key: 'grid', label: '채널상태', icon: Grid2X2 },
  { key: 'list', label: '목록', icon: ListIcon },
  { key: 'bar', label: '막대', icon: BarChart3 },
  { key: 'line', label: '선', icon: TrendingUp },
];

export default function ChannelDetailWidget({ data, widgetId }: CustomWidgetComponentProps) {
  const rows = useMemo<ChannelRow[]>(() => (isChannelDemoMode() ? DEMO_CHANNELS : toChannelRows(data)), [data]);
  const groups = useMemo(() => groupBySystem(rows), [rows]);

  // ─── 영속 UI 상태 ──────────────────────────────────────────────
  const storageKey = widgetId != null ? `bt-admin.insight.monitoring.widget.${widgetId}.ui` : 'bt-admin.insight.monitoring.widget.channel-detail.ui';
  const [ui, setUi] = usePersistentState<ChannelUiState>(storageKey, {
    view: 'grid',
    hiddenStatuses: [],
    systemId: null,
    summaryCollapsed: false,
  });
  const { view, summaryCollapsed } = ui;
  const hidden = useMemo(() => new Set(ui.hiddenStatuses), [ui.hiddenStatuses]);

  const setView = useCallback((v: ChannelView) => setUi((p) => ({ ...p, view: v })), [setUi]);
  const setSystemId = useCallback((id: number) => setUi((p) => ({ ...p, systemId: id })), [setUi]);
  const toggleSummary = useCallback(() => setUi((p) => ({ ...p, summaryCollapsed: !p.summaryCollapsed })), [setUi]);
  const toggleStatus = useCallback(
    (code: number) =>
      setUi((p) => {
        const s = new Set(p.hiddenStatuses);
        if (s.has(code)) s.delete(code);
        else s.add(code);
        return { ...p, hiddenStatuses: Array.from(s) };
      }),
    [setUi],
  );

  const [search, setSearch] = useState('');

  // ─── 선택 시스템 ──────────────────────────────────────────────
  const curGroup = useMemo(() => groups.find((g) => g.systemId === ui.systemId) ?? groups[0], [groups, ui.systemId]);

  // ─── 점유율 추세 누적 (라이브: 매 틱마다 시스템별 점유율 push) ──────
  const [histories, setHistories] = useState<Record<number, { occ: number; inb: number }[]>>({});
  useEffect(() => {
    if (groups.length === 0) return;
    setHistories((prev) => {
      const next = { ...prev };
      for (const g of groups) {
        const arr = next[g.systemId] ? [...next[g.systemId]] : [];
        arr.push({ occ: g.occPct, inb: g.inPct });
        next[g.systemId] = arr.length > 60 ? arr.slice(arr.length - 60) : arr;
      }
      return next;
    });
  }, [groups]);

  // ─── 본문 필터 (격자/목록) ────────────────────────────────────
  const visibleRows = useMemo(() => {
    if (!curGroup) return [];
    return curGroup.rows.filter((r) => {
      const status = toNum(r.CHNL_STATUS);
      if (status != null && hidden.has(status)) return false;
      return matchSearch(r, search);
    });
  }, [curGroup, hidden, search]);

  const counts = useMemo(() => (curGroup ? countByStatus(curGroup.rows) : {}), [curGroup]);

  // ─── 헤더 슬롯 (포털) ─────────────────────────────────────────
  const [toolbarSlot, setToolbarSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (widgetId == null) return;
    setToolbarSlot(document.getElementById(widgetToolbarSlotId(widgetId)));
  }, [widgetId]);

  const toolbar = (
    <div className="flex flex-nowrap items-center gap-2">
      <Input
        allowClear
        placeholder="채널·ANI·DNIS·UCID 검색"
        prefix={<Search className="h-4 w-4 text-gray-400" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: 220, height: 32 }}
        disabled={view === 'bar' || view === 'line'}
      />
      <div className="flex items-center rounded border border-gray-200 bg-gray-100 p-0.5">
        {VIEW_META.map(({ key, label, icon: Icon }) => (
          <Tooltip key={key} title={label} placement="top">
            <span
              onClick={() => setView(key)}
              role="button"
              className={`inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded transition-all ${
                view === key ? 'bg-white text-[#405189] shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={15} strokeWidth={2} />
            </span>
          </Tooltip>
        ))}
      </div>
      <div className="ml-1 flex items-center gap-1 border-l border-gray-200 pl-2">
        <Tooltip title={summaryCollapsed ? '요약정보 펴기' : '요약정보 접기'} placement="top">
          <span
            onClick={toggleSummary}
            role="button"
            className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded border transition-colors hover:bg-gray-100 ${
              summaryCollapsed ? 'border-[#405189] text-[#405189]' : 'border-gray-300 text-gray-400'
            }`}
          >
            {summaryCollapsed ? <PanelTopOpen size={16} strokeWidth={2} /> : <PanelTopClose size={16} strokeWidth={2} />}
          </span>
        </Tooltip>
      </div>
    </div>
  );

  if (groups.length === 0 || !curGroup) {
    return (
      <div className="flex h-full flex-col bg-white">
        {toolbarSlot ? createPortal(toolbar, toolbarSlot) : null}
        <div className="flex flex-1 items-center justify-center">
          <NoData message="채널 데이터가 없습니다." />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {toolbarSlot ? createPortal(toolbar, toolbarSlot) : <header className="flex items-center justify-end gap-2 border-b border-gray-200 px-4 py-2.5">{toolbar}</header>}

      {/* ② 시스템 탭 + KPI 스트립 (접기 가능) */}
      <div className={`grid transition-all duration-300 ease-in-out ${summaryCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
        <div className="min-h-0 overflow-hidden">
          {/* 시스템(SLEE) 탭 */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-200 bg-white px-4 py-2">
            <span className="mr-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">시스템(SLEE)</span>
            {groups.map((g) => {
              const active = g.systemId === curGroup.systemId;
              const danger = g.occPct >= 80;
              return (
                <button
                  key={g.systemId}
                  onClick={() => setSystemId(g.systemId)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-bold transition-colors ${
                    active ? 'border-[#405189] bg-[#eef2fb] text-[#405189]' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${danger ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'}`} />
                  {g.systemName}
                  <span className={`rounded px-1 py-0.5 text-[9px] font-bold ${g.irType === 2 ? 'bg-[#eef2fb] text-[#405189]' : 'bg-gray-100 text-gray-500'}`}>
                    {irTypeLabel(g.irType)}
                  </span>
                  <span className={`font-mono text-[10.5px] ${danger ? 'text-amber-600' : 'text-gray-400'}`}>{g.occPct}%</span>
                </button>
              );
            })}
          </div>

          {/* KPI 스트립 */}
          <div className="grid grid-cols-2 gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiTile label="전체 채널" value={curGroup.total} />
            <KpiTile label="점유" value={`${curGroup.busy}`} suffix={`${curGroup.occPct}%`} valueColor={curGroup.occPct >= 80 ? 'text-amber-600' : 'text-gray-900'} />
            <KpiTile label="인바운드 점유" value={curGroup.inBusy} />
            <KpiTile label="아웃바운드 점유" value={curGroup.outBusy} />
            <KpiTile label="장애·경고" value={curGroup.errCnt} valueColor={curGroup.errCnt > 0 ? 'text-red-600' : 'text-gray-400'} />
          </div>
        </div>
      </div>

      {/* ③ 상태 레전드 = 필터 칩 */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-200 bg-white px-4 py-2">
        {CHANNEL_STATUS_ORDER.map((code) => {
          const m = CHANNEL_STATUS[code];
          const off = hidden.has(code);
          return (
            <button
              key={code}
              onClick={() => toggleStatus(code)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold transition-opacity ${off ? 'opacity-35' : ''}`}
              style={{ borderColor: `${m.hex}40`, background: `${m.hex}14`, color: m.hex }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: m.hex }} />
              {m.label} <span className="font-mono">{counts[code] ?? 0}</span>
            </button>
          );
        })}
        {(view === 'grid' || view === 'list') && (
          <span className="ml-2 text-[11px] text-gray-500">
            표시 {visibleRows.length} / 전체 {curGroup.total}
          </span>
        )}
      </div>

      {/* ④ 본문 */}
      <div className="min-h-0 flex-1 overflow-auto">
        {view === 'grid' && <ChannelCellGrid rows={visibleRows} irType={curGroup.irType} />}
        {view === 'list' && <ChannelStatusGrid rows={visibleRows} />}
        {view === 'bar' && (
          <div className="h-full w-full p-3">
            <ChannelBarChart counts={counts} total={curGroup.total} hidden={hidden} />
          </div>
        )}
        {view === 'line' && (
          <div className="h-full w-full p-3">
            <ChannelLineChart history={histories[curGroup.systemId] ?? []} current={{ occ: curGroup.occPct, inb: curGroup.inPct }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// KPI 타일 (CtiqStatusWidget 와 동일 패턴)
// ═══════════════════════════════════════════════════════════════════
interface KpiTileProps {
  label: string;
  value: string | number;
  suffix?: string;
  valueColor?: string;
}

function KpiTile({ label, value, suffix, valueColor }: KpiTileProps) {
  return (
    <div className="flex flex-col items-start gap-1 rounded-md border border-gray-200 bg-white px-3 py-2">
      <div className="text-[12px] font-semibold uppercase tracking-wide text-gray-600">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-mono text-[16px] font-semibold tabular-nums ${valueColor ?? 'text-gray-900'}`}>{value}</span>
        {suffix && <span className={`text-[12px] font-bold ${valueColor ?? 'text-gray-500'}`}>{suffix}</span>}
      </div>
    </div>
  );
}
