import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Drawer, Input, Tooltip } from 'antd';
import { AlertTriangle, CircleHelp, LayoutGrid, PanelTopClose, PanelTopOpen, Rows3, Search, Settings } from 'lucide-react';
import { DEMO_AGENTS, isDemoMode } from './demoData';
import { answerRatePct, groupAgents, liveDurationSec, matchSearch, toAgentRows, toNum, totalHandled } from './helpers';
import AgentRadarModal from './parts/AgentRadarModal';
import GroupSection from './parts/GroupSection';
import MosLegend from './parts/MosLegend';
import { alarmLevel, statusKey, statusMeta } from './statusMap';
import type { AgentRow, Density, GroupBy, SortBy, StatusGroup, Threshold } from './types';
import { widgetToolbarSlotId } from '../../components/canvas/WidgetCardHeader';
import NoData from '@/components/custom/NoData';
import { usePersistentState } from '@/libs/shared-ui/src/hooks/usePersistentState';

/**
 * 상담사 상태 모니터 위젯 v3 — 레거시 페이지급 정보 밀도.
 *
 * 레이아웃:
 *  ┌─────────────────────────────────────────────────────────────────┐
 *  │ ① 헤더 — 실시간 · 검색 · 정렬 · 그룹 · 밀도                      │
 *  ├─────────────────────────────────────────────────────────────────┤
 *  │ ② KPI 스트립 — [인입][응대][응대율][SLA][점유][임계]              │
 *  ├─────────────────────────────────────────────────────────────────┤
 *  │ ③ 시맨틱 칩 — [가용 N][통화 N][호출 N][후처리·이석 N][오프 N]    │
 *  ├─────────────────────────────────────────────────────────────────┤
 *  │ ④ 본문 — 그룹별 카드/행/도트                                     │
 *  └─────────────────────────────────────────────────────────────────┘
 *
 * 데이터: BE INSIGHT AgentStatusWidget → WS DATA → widgetData[id].rows
 * URL `?agentDemo=1` 일 때 데모 14건 (실 데이터 없이 시각 검증).
 */

export interface AgentStatusWidgetProps {
  data: unknown;
  options?: {
    thresholds?: Record<string, Threshold>;
    density?: Density;
    groupBy?: GroupBy;
    defaultGroups?: StatusGroup[];
  } & Record<string, unknown>;
  /** 위젯 인스턴스 ID — WidgetCardHeader 슬롯에 툴바 portal 시 사용 */
  widgetId?: number | string;
  /** 설정 변경 시 호출 — 부모 대시보드가 WebSocket SUBSCRIBE 를 끊도록 신호. */
  onRequestPause?: () => void;
}

/**
 * 레거시 SWAT `agentStatus.jsp` 의 12 상태 체크박스와 동일.
 * key 는 `statusKey()` 출력과 매칭 (50 통화는 reasonCode 결합 5010/5020).
 */
const LEGACY_STATES: { key: string; label: string }[] = [
  { key: '10', label: '로그아웃' },
  { key: '30', label: '이석' },
  { key: '41', label: '대기 IB' },
  { key: '42', label: '대기 OB' },
  { key: '5010', label: '통화 IB' },
  { key: '5020', label: '통화 OB' },
  { key: '51', label: '벨울림' },
  { key: '52', label: '다이얼링' },
  { key: '53', label: '보류' },
  { key: '60', label: '후처리' },
];
/** 레거시 jsp 기본 체크 상태 — 30·41·42·5010·5020·60 */
const DEFAULT_ACTIVE_STATES = new Set(['30', '41', '42', '5010', '5020', '60']);
const TAG_COLOR_BY_STATE: Record<string, string> = {
  '10': 'default',
  '30': 'default',
  '41': 'green',
  '42': 'green',
  '5010': 'blue',
  '5020': 'blue',
  '51': 'orange',
  '52': 'orange',
  '53': 'purple',
  '60': 'purple',
};

/**
 * 상태 칩 소프트톤 — 활성 시 옅은 색조 + 같은 계열 진한 텍스트 + 옅은 보더.
 * 비활성은 모두 동일 회색 톤. 풀톤 배경 대신 시각 노이즈 최소화.
 */
const CHIP_STYLE: Record<string, { active: string; idle: string }> = {
  default: {
    active: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200',
    idle: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50',
  },
  green: {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    idle: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50',
  },
  blue: {
    active: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    idle: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50',
  },
  orange: {
    active: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    idle: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50',
  },
  purple: {
    active: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
    idle: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50',
  },
};

/** 정렬·그룹 기본값 — 추후 ... 메뉴 → 우측 Drawer 에서 사용자 설정 */
const DEFAULT_SORT: SortBy = 'duration';
const DEFAULT_GROUP_BY: GroupBy = 'queue';

export default function AgentStatusWidget({ data, options, widgetId, onRequestPause }: AgentStatusWidgetProps) {
  const rows = useMemo<AgentRow[]>(() => (isDemoMode() ? DEMO_AGENTS : toAgentRows(data)), [data]);

  // ─── WidgetCardHeader 슬롯 (검색·뷰토글 portal) ─────────────
  const [toolbarSlot, setToolbarSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (widgetId == null) return;
    const el = document.getElementById(widgetToolbarSlotId(widgetId));
    setToolbarSlot(el);
  }, [widgetId]);

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = window.setInterval(() => setNowMs(Date.now()), reduce ? 5000 : 1000);
    return () => window.clearInterval(id);
  }, []);

  // 영속 UI 상태 — 칩 활성/비활성, 밀도, 임계만 보기, 서머리 접기 (브라우저 localStorage)
  type UiState = {
    activeStates: string[];
    density: Density;
    alertOnly: boolean;
    summaryCollapsed: boolean;
  };
  const storageKey = widgetId != null ? `bt-admin.insight.monitoring.widget.${widgetId}.ui` : 'bt-admin.insight.monitoring.widget.agent-status.ui';
  const [ui, setUi] = usePersistentState<UiState>(storageKey, {
    activeStates: Array.from(DEFAULT_ACTIVE_STATES),
    density: (options?.density ?? 'card') as Density,
    alertOnly: false,
    summaryCollapsed: false,
  });
  const activeStates = useMemo(() => new Set(ui.activeStates), [ui.activeStates]);
  const density = ui.density;
  const alertOnly = ui.alertOnly;
  const summaryCollapsed = ui.summaryCollapsed;

  const setDensity = useCallback((d: Density) => setUi((p) => ({ ...p, density: d })), [setUi]);
  const toggleSummary = useCallback(() => setUi((p) => ({ ...p, summaryCollapsed: !p.summaryCollapsed })), [setUi]);
  const setAlertOnly = useCallback(
    (next: boolean | ((p: boolean) => boolean)) => setUi((p) => ({ ...p, alertOnly: typeof next === 'function' ? (next as (b: boolean) => boolean)(p.alertOnly) : next })),
    [setUi],
  );

  // 영속화 안 하는 ephemeral state
  const [search, setSearch] = useState('');
  // 정렬·그룹은 추후 ... 설정 Drawer 에서 변경. 지금은 기본값 고정.
  const [sort] = useState<SortBy>(DEFAULT_SORT);
  const [groupBy] = useState<GroupBy>(options?.groupBy ?? DEFAULT_GROUP_BY);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const toggleState = useCallback(
    (k: string) => {
      setUi((prev) => {
        const s = new Set(prev.activeStates);
        if (s.has(k)) s.delete(k);
        else s.add(k);
        return { ...prev, activeStates: Array.from(s) };
      });
    },
    [setUi],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const inField = t?.tagName === 'INPUT' || t?.tagName === 'SELECT' || t?.tagName === 'TEXTAREA';
      if (!inField && e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ─── 파생값 ───────────────────────────────────────────────────
  const stateCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) {
      const k = statusKey(r.AGENT_STATUS, r.REASON_CODE);
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [rows]);

  const alertCount = useMemo(() => {
    let n = 0;
    for (const r of rows) {
      if (alarmLevel(r.AGENT_STATUS, r.REASON_CODE, liveDurationSec(r, nowMs), options?.thresholds) === 2) n++;
    }
    return n;
  }, [rows, nowMs, options?.thresholds]);

  // ─── KPI 스트립 — raw 누적값 기반 (가중치 정확) ──────────────
  const stripKpi = useMemo(() => {
    let conn = 0,
      ans = 0;
    let online = 0,
      aux = 0,
      idle = 0;
    for (const r of rows) {
      conn += toNum(r.SUM_CONN_CNT) ?? 0;
      ans += toNum(r.SUM_ANSW_CNT) ?? 0;
      const status = toNum(r.AGENT_STATUS);
      if (status != null && status !== 10) {
        online++;
        if (status === 30) aux++;
        if (status === 41 || status === 42) idle++; // 대기 IB / 대기 OB
      }
    }
    // 분모는 둘 다 온라인 (로그아웃 제외)
    //  · 응대대기 = (대기 IB + 대기 OB) / 온라인 × 100  — 즉시 응대 가능 상담사 비율
    //  · 근무율   = (온라인 - 이석) / 온라인 × 100      — 자리에 있는 비율
    const responseReady = online > 0 ? Math.round((idle / online) * 100) : null;
    const working = online > 0 ? Math.round(((online - aux) / online) * 100) : null;
    return { conn, ans, online, aux, idle, responseReady, working };
  }, [rows]);

  const visible = useMemo(() => {
    let f = rows.filter((r) => activeStates.has(statusKey(r.AGENT_STATUS, r.REASON_CODE)));
    if (search) f = f.filter((r) => matchSearch(r, search));
    if (alertOnly) f = f.filter((r) => alarmLevel(r.AGENT_STATUS, r.REASON_CODE, liveDurationSec(r, nowMs), options?.thresholds) === 2);
    return [...f].sort((a, b) => {
      switch (sort) {
        case 'duration':
          return liveDurationSec(b, nowMs) - liveDurationSec(a, nowMs);
        case 'name':
          return (a.AGENT_NAME ?? '').toString().localeCompare((b.AGENT_NAME ?? '').toString());
        case 'state':
          return stateOrd(a) - stateOrd(b);
        case 'answered':
          return totalHandled(b) - totalHandled(a);
        case 'rate':
          return (answerRatePct(b) ?? -1) - (answerRatePct(a) ?? -1);
      }
    });
  }, [rows, activeStates, search, alertOnly, sort, nowMs, options?.thresholds]);

  const grouped = useMemo(() => groupAgents(visible, groupBy), [visible, groupBy]);

  // 필터와 무관한 그룹별 전체 row 맵 — 그룹 헤더 요약(분포바·N명·KPI) 에 사용
  const allRowsByGroup = useMemo(() => {
    const map = new Map<string, AgentRow[]>();
    for (const g of groupAgents(rows, groupBy)) map.set(g.id, g.rows);
    return map;
  }, [rows, groupBy]);

  // ─── 레이더 비교 모달 ─────────────────────────────────────────
  const [radarAgent, setRadarAgent] = useState<AgentRow | null>(null);
  const handleActivate = useCallback((row: AgentRow) => {
    setRadarAgent(row);
  }, []);
  const closeRadar = useCallback(() => setRadarAgent(null), []);

  // ─── 설정 드로어 ──────────────────────────────────────────────
  // 클릭 시 부모 대시보드의 모니터링을 일시정지하고 드로어를 연다.
  // 설정 변경 후 SUBSCRIBE 페이로드에 반영되도록 세션을 끊는 것이 목적.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const handleOpenSettings = useCallback(() => {
    onRequestPause?.();
    setSettingsOpen(true);
  }, [onRequestPause]);
  const handleCloseSettings = useCallback(() => setSettingsOpen(false), []);

  // 위젯 검색 + 뷰토글 + 설정 (WidgetCardHeader 슬롯에 portal)
  const toolbar = (
    <div className="flex flex-nowrap items-center gap-2">
      <Input
        ref={searchRef as never}
        allowClear
        placeholder="이름·상담그룹 검색"
        prefix={<Search className="w-4 h-4 text-gray-400" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: 240, height: 32 }}
      />
      {/* 위젯 헤더 아이콘 — FCA 봇 현황(BotDashboard) 위젯과 동일 스타일 (w-8 h-8 rounded border) */}
      <Tooltip title="큰 카드" placement="top">
        <span
          onClick={() => setDensity('card')}
          aria-label="큰 카드"
          aria-pressed={density === 'card'}
          role="button"
          className={
            'inline-flex w-8 h-8 cursor-pointer items-center justify-center rounded border transition-colors hover:bg-gray-100 ' +
            (density === 'card' ? 'text-[#405189] border-[#405189]' : 'text-gray-400 border-gray-300')
          }
        >
          <LayoutGrid size={16} strokeWidth={1.75} />
        </span>
      </Tooltip>
      <Tooltip title="작은 카드" placement="top">
        <span
          onClick={() => setDensity('row')}
          aria-label="작은 카드"
          aria-pressed={density === 'row'}
          role="button"
          className={
            'inline-flex w-8 h-8 cursor-pointer items-center justify-center rounded border transition-colors hover:bg-gray-100 ' +
            (density === 'row' ? 'text-[#405189] border-[#405189]' : 'text-gray-400 border-gray-300')
          }
        >
          <Rows3 size={16} strokeWidth={1.75} />
        </span>
      </Tooltip>
      <Tooltip title={summaryCollapsed ? '요약정보 펴기' : '요약정보 접기'} placement="top">
        <span
          onClick={toggleSummary}
          aria-label={summaryCollapsed ? '요약정보 펴기' : '요약정보 접기'}
          aria-pressed={summaryCollapsed}
          role="button"
          className={
            'inline-flex w-8 h-8 cursor-pointer items-center justify-center rounded border transition-colors hover:bg-gray-100 ' +
            (summaryCollapsed ? 'text-[#405189] border-[#405189]' : 'text-gray-400 border-gray-300')
          }
        >
          {summaryCollapsed ? <PanelTopOpen size={16} strokeWidth={2} /> : <PanelTopClose size={16} strokeWidth={2} />}
        </span>
      </Tooltip>
      <Tooltip title="설정" placement="top">
        <span
          onClick={handleOpenSettings}
          aria-label="설정"
          role="button"
          className="inline-flex w-8 h-8 cursor-pointer items-center justify-center rounded border border-gray-300 text-gray-400 transition-colors hover:bg-gray-100"
        >
          <Settings size={16} />
        </span>
      </Tooltip>
    </div>
  );

  return (
    <div className="flex h-full flex-col bg-white">
      {/* 툴바: 가능하면 헤더 슬롯에 portal, 아니면 자체 헤더로 fallback */}
      {toolbarSlot ? createPortal(toolbar, toolbarSlot) : <header className="flex items-center justify-end gap-2 border-b border-gray-200 px-4 py-2.5">{toolbar}</header>}

      {/*
        ② KPI 스트립 — raw 합계 기반 정확값.
        접기 애니메이션: 외곽 grid-rows 0fr↔1fr + opacity 트랜지션.
        max-height 없이 임의 컨텐츠 높이를 부드럽게 펼침/접음.
      */}
      <div
        className={'grid transition-all duration-300 ease-in-out ' + (summaryCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100')}
        aria-hidden={summaryCollapsed}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="grid grid-cols-2 gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiTile label="인입콜" value={stripKpi.conn.toLocaleString()} mono />
            <KpiTile label="응대콜" value={stripKpi.ans.toLocaleString()} mono />
            <KpiTile
              label="응대대기"
              value={stripKpi.responseReady != null ? `${stripKpi.responseReady}%` : '—'}
              mono
              hint={`대기 ${stripKpi.idle} / 온라인 ${stripKpi.online}`}
              help={`즉시 응대 가능한 상담사 비율\n\n응대대기 = (대기 IB + 대기 OB) ÷ 온라인 × 100\n\n· 온라인: 로그아웃이 아닌 모든 상담사\n· 대기 IB / OB 만 즉시 응대 가능으로 집계 (통화·벨·후처리·이석 제외)`}
              valueColor={stripKpi.responseReady == null ? 'text-gray-400' : 'text-gray-900'}
            />
            <KpiTile
              label="근무율"
              value={stripKpi.working != null ? `${stripKpi.working}%` : '—'}
              mono
              hint={`근무 ${stripKpi.online - stripKpi.aux} / 온라인 ${stripKpi.online}`}
              help={`자리에 있는 상담사 비율 (이석 제외)\n\n근무율 = (온라인 − 이석) ÷ 온라인 × 100\n\n· 온라인: 로그아웃이 아닌 모든 상담사\n· 이석: 자리비움 상담사`}
              valueColor={stripKpi.working == null ? 'text-gray-400' : 'text-gray-900'}
            />
            <KpiTile
              label="임계"
              value={alertCount > 0 ? alertCount.toString() : '0'}
              mono
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
              valueColor={alertCount > 0 ? 'text-red-600' : 'text-gray-400'}
              accent={alertCount > 0 ? 'red' : undefined}
              onClick={alertCount > 0 ? () => setAlertOnly((b) => !b) : undefined}
              active={alertOnly}
            />
          </div>
        </div>
      </div>

      {/* ═════ ③ 상태 필터 — 레거시 12 상태 + MoS 안내 ═════ */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-200 bg-white px-4 py-2">
        {LEGACY_STATES.map(({ key, label }) => {
          const checked = activeStates.has(key);
          const palette = CHIP_STYLE[TAG_COLOR_BY_STATE[key] ?? 'default'];
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleState(key)}
              aria-pressed={checked}
              className={[
                'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                checked ? palette.active : palette.idle,
              ].join(' ')}
            >
              <span>{label}</span>
              <span className="font-mono tabular-nums opacity-80">({stateCounts[key] ?? 0})</span>
            </button>
          );
        })}

        <div className="ml-auto">
          <MosLegend />
        </div>
      </div>

      {/* ═════ ④ 본문 ═════ */}
      <div className="flex-1 overflow-auto p-4">
        {visible.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <NoData message={emptyMessage(rows.length, search, alertOnly)} iconSize={40} fontSize="text-sm" gap={2} />
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map((g) => (
              <GroupSection
                key={g.id}
                group={g}
                allRows={allRowsByGroup.get(g.id)}
                density={density}
                nowMs={nowMs}
                thresholds={options?.thresholds}
                onActivate={handleActivate}
                showHeader={groupBy !== 'none'}
              />
            ))}
          </div>
        )}
      </div>

      <AgentRadarModal open={radarAgent != null} onClose={closeRadar} agent={radarAgent} allAgents={rows} />

      {/* 설정 드로어 — SUBSCRIBE 페이로드용 검색 조건/필터 폼 자리 (모니터링 일시정지 상태). */}
      <Drawer title="상담사 상태 모니터 설정" placement="right" width={420} open={settingsOpen} onClose={handleCloseSettings} destroyOnClose>
        <div className="flex h-full flex-col">
          <p className="text-xs text-gray-500">구독 페이로드에 들어갈 검색 조건과 필터를 설정합니다. 변경 후 모니터링을 다시 시작하면 새 옵션으로 구독됩니다.</p>
          <div className="mt-4 flex-1 rounded border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center text-xs text-gray-400">검색 조건 / 필터 폼은 추후 추가됩니다.</div>
        </div>
      </Drawer>
    </div>
  );
}

// ─── KPI 타일 ───────────────────────────────────────────────────

interface KpiTileProps {
  label: string;
  value: string | number;
  /** 값 우측에 인라인으로 표시할 부가 정보 (예: "온라인 12 · 이석 2"). */
  hint?: string;
  mono?: boolean;
  valueColor?: string;
  icon?: React.ReactNode;
  /** 라벨 우측에 ?아이콘 + Tooltip 으로 설명을 표시. */
  help?: React.ReactNode;
  accent?: 'red';
  active?: boolean;
  onClick?: () => void;
}

function KpiTile({ label, value, hint, mono, valueColor, icon, help, accent, active, onClick }: KpiTileProps) {
  const cls = [
    'flex flex-col items-start gap-1 rounded-md border px-3 py-2 transition-colors',
    onClick ? 'cursor-pointer hover:shadow-sm' : '',
    accent === 'red' ? (active ? 'border-red-500 bg-red-50' : 'border-red-200 bg-white hover:bg-red-50') : 'border-gray-200 bg-white',
  ].join(' ');

  const Inner = (
    <>
      <div className="flex items-center gap-1 text-[13px] font-semibold uppercase tracking-wide text-gray-600">
        {icon}
        <span>{label}</span>
        {help && (
          <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{help}</span>} placement="top" styles={{ root: { maxWidth: '320px' } }}>
            <CircleHelp className="ml-0.5 h-3.5 w-3.5 text-gray-300 hover:text-gray-500 cursor-help" />
          </Tooltip>
        )}
      </div>
      <div className="flex items-baseline gap-2 min-w-0">
        <span className={`text-xl font-bold leading-none ${mono ? 'font-mono tabular-nums' : ''} ${valueColor ?? 'text-gray-900'}`}>{value}</span>
        {hint && <span className="truncate text-[11px] text-gray-400">{hint}</span>}
      </div>
    </>
  );

  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={active} className={`${cls} text-left`}>
      {Inner}
    </button>
  ) : (
    <div className={cls}>{Inner}</div>
  );
}

// ─── helpers ────────────────────────────────────────────────────

function stateOrd(r: AgentRow): number {
  const meta = statusMeta(r.AGENT_STATUS, r.REASON_CODE);
  const order: Record<StatusGroup, number> = { talking: 0, ringing: 1, wrapup: 2, available: 3, offline: 4 };
  return order[meta.group];
}

function emptyMessage(rowCount: number, search: string, alertOnly: boolean): string {
  if (rowCount === 0) return '실시간 상담사 데이터가 없습니다.';
  if (alertOnly) return '현재 임계 초과 상담사가 없습니다.';
  if (search) return `"${search}" 에 일치하는 상담사가 없습니다.`;
  return '필터 조건에 맞는 상담사가 없습니다.';
}
