import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Input, Tooltip } from 'antd';
import { AlertTriangle, PanelTopClose, PanelTopOpen, PhoneCall, PhoneIncoming, PhoneOutgoing, Radio, Search } from 'lucide-react';
import { DEMO_CHANNELS, isChannelDemoMode } from './demoData';
import { countByStatus, groupBySystem, irTypeLabel, matchSearch, toChannelRows, toNum } from './helpers';
import ChannelCellGrid from './parts/ChannelCellGrid';
import { CHANNEL_STATUS, CHANNEL_STATUS_ORDER } from './statusMap';
import type { ChannelRow, ChannelUiState } from './types';
import { widgetToolbarSlotId } from '../../components/canvas/WidgetCardHeader';
import type { CustomWidgetComponentProps } from '../registry';
import NoData from '@/components/custom/NoData';
import { usePersistentState } from '@/libs/shared-ui/src/hooks/usePersistentState';

/**
 * 채널 상세 위젯 — AS-IS `sleeSipSystemChannelStatus.jsp` 의 TO-BE.
 *
 * 레이아웃:
 *  ┌────────────────────────────────────────────────────────────────┐
 *  │ ① 툴바(Portal) — 검색 · 요약접기                                │
 *  ├────────────────────────────────────────────────────────────────┤
 *  │ ② 시스템(SLEE) 탭 + KPI 스트립 — [전체][점유][IN][OUT][장애]   │  (접기 가능)
 *  ├────────────────────────────────────────────────────────────────┤
 *  │ ③ 상태 레전드 = 필터 칩 (CHNL_STATUS 10종)                      │
 *  ├────────────────────────────────────────────────────────────────┤
 *  │ ④ 본문 — 채널상태 격자                                          │
 *  └────────────────────────────────────────────────────────────────┘
 *
 * 데이터: CH:IVR:{SYSTEM_ID} (DS_SLEE_CH_STATE). BE 가 전 시스템 채널을 내려주면
 * FE 가 SYSTEM_ID 로 그룹핑해 시스템 탭으로 전환. 점유 판정은 IR_TYPE 별(statusMap.isChannelBusy).
 */
export default function ChannelDetailWidget({ data, widgetId }: CustomWidgetComponentProps) {
  const rows = useMemo<ChannelRow[]>(() => (isChannelDemoMode() ? DEMO_CHANNELS : toChannelRows(data)), [data]);
  const groups = useMemo(() => groupBySystem(rows), [rows]);

  // ─── 영속 UI 상태 ──────────────────────────────────────────────
  const storageKey = widgetId != null ? `bt-admin.insight.monitoring.widget.${widgetId}.ui` : 'bt-admin.insight.monitoring.widget.channel-detail.ui';
  const [ui, setUi] = usePersistentState<ChannelUiState>(storageKey, {
    hiddenStatuses: [],
    systemId: null,
    summaryCollapsed: false,
  });
  const { summaryCollapsed } = ui;
  const hidden = useMemo(() => new Set(ui.hiddenStatuses), [ui.hiddenStatuses]);

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

  // ─── 본문 필터 (격자) ─────────────────────────────────────────
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
      />
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
            <KpiTile label="전체 채널" value={curGroup.total} icon={<Radio className="h-3.5 w-3.5" />} />
            <KpiTile
              label="점유"
              value={`${curGroup.busy}`}
              suffix={`${curGroup.occPct}%`}
              valueColor={curGroup.occPct >= 80 ? 'text-amber-600' : 'text-gray-900'}
              icon={<PhoneCall className="h-3.5 w-3.5" />}
            />
            <KpiTile label="인바운드 점유" value={curGroup.inBusy} icon={<PhoneIncoming className="h-3.5 w-3.5" />} />
            <KpiTile label="아웃바운드 점유" value={curGroup.outBusy} icon={<PhoneOutgoing className="h-3.5 w-3.5" />} />
            <KpiTile
              label="장애·경고"
              value={curGroup.errCnt}
              valueColor={curGroup.errCnt > 0 ? 'text-red-600' : 'text-gray-400'}
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
            />
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
        <span className="ml-2 text-[11px] text-gray-500">
          표시 {visibleRows.length} / 전체 {curGroup.total}
        </span>
      </div>

      {/* ④ 본문 */}
      <div className="min-h-0 flex-1 overflow-auto">
        <ChannelCellGrid rows={visibleRows} irType={curGroup.irType} />
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
  icon?: ReactNode;
}

function KpiTile({ label, value, suffix, valueColor, icon }: KpiTileProps) {
  return (
    <div className="flex flex-col items-start gap-1 rounded-md border border-gray-200 bg-white px-3 py-2">
      <div className="flex items-center gap-1 text-[12px] font-semibold uppercase tracking-wide text-gray-600">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-mono text-[16px] font-semibold tabular-nums ${valueColor ?? 'text-gray-900'}`}>{value}</span>
        {suffix && <span className={`text-[12px] font-bold ${valueColor ?? 'text-gray-500'}`}>{suffix}</span>}
      </div>
    </div>
  );
}
