import { Fragment, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Input, InputNumber, Radio, Tooltip } from 'antd';
import {
  AlertTriangle,
  ChevronDown,
  CircleHelp,
  Grid2X2,
  Headset,
  LayoutList,
  List as ListIcon,
  PanelTopClose,
  PanelTopOpen,
  PhoneCall,
  PhoneIncoming,
  Search,
  Settings,
  Users,
} from 'lucide-react';
import List, { type ListRef } from 'rc-virtual-list';
import { toast } from '@/shared-util';
import { DEMO_AGENTS, isDemoMode } from './demoData';
import { answerRatePct, formatDuration, groupAgents, liveDurationSec, matchSearch, toAgentRows, toNum, totalHandled } from './helpers';
import AgentCard from './parts/AgentCard';
import AgentDot from './parts/AgentDot';
import AgentRadarModal from './parts/AgentRadarModal';
import AgentStatusGrid from './parts/AgentStatusGrid';
import MosLegend from './parts/MosLegend';
import { DEFAULT_THRESHOLDS, alarmLevel, reasonThresholdKey, statusKey, statusMeta } from './statusMap';
import type { AgentRow, Density, GroupBy, SortBy, StatusGroup, Threshold } from './types';
import type { AgentReasonCodeItem } from '../../api/widgetSettingApi';
import { widgetToolbarSlotId } from '../../components/canvas/WidgetCardHeader';
import { useGetAgentReasonCodes, useGetMediaTypes, useGetWidgetUserSetting, useUpdateWidgetUserSetting, widgetSettingKeys } from '../../hooks/useWidgetSettingQueries';
import NoData from '@/components/custom/NoData';
import { usePersistentState } from '@/libs/shared-ui/src/hooks/usePersistentState';

// 가상 리스트용 아이템 타입 정의
type VirtualItem =
  | { type: 'header'; id: string; label: string; groupRows: AgentRow[]; allRows: AgentRow[]; isCollapsed: boolean; onToggle: () => void }
  | {
      type: 'row';
      id: string;
      rows: AgentRow[];
      density: Density;
      nowMs: number;
      thresholds?: Record<string, Threshold>;
      reasonNames?: Record<string, string>;
      onActivate: (r: AgentRow) => void;
    };

/**
 * 상담사 상태 모니터 위젯 v3 — 디자인은 원본 유지 + 가상 렌더링(성능 최적화) 적용.
 */
export interface AgentStatusWidgetProps {
  data: unknown;
  options?: {
    thresholds?: Record<string, Threshold>;
    density?: Density;
    groupBy?: GroupBy;
    defaultGroups?: StatusGroup[];
  } & Record<string, unknown>;
  widgetId?: number | string;
  /** 설정 변경 시 호출 — 부모 대시보드가 WebSocket SUBSCRIBE 를 끊도록 신호. */
  onRequestPause?: () => void;
}

/** 상태 칩 — codes 는 이 칩이 합산·필터·토글할 statusKey 목록. */
interface StateChip {
  key: string;
  label: string;
  codes: string[];
}

/**
 * 대기 표시 방식(standbyType)에 따른 상태 칩 목록.
 * - 1: 대기 통합 — '대기' 하나로(40·41·42 합산)  (레거시 기본)
 * - 2: 대기 IB / 대기 OB 분리
 */
function buildStateChips(standbyType: 1 | 2): StateChip[] {
  const waiting: StateChip[] =
    standbyType === 2
      ? [
          { key: '41', label: '대기 IB', codes: ['41'] },
          { key: '42', label: '대기 OB', codes: ['42'] },
        ]
      : [{ key: '40', label: '대기', codes: ['40', '41', '42'] }];
  return [
    { key: '10', label: '로그아웃', codes: ['10'] },
    { key: '30', label: '이석', codes: ['30'] },
    ...waiting,
    { key: '5010', label: '통화 IB', codes: ['5010'] },
    { key: '5020', label: '통화 OB', codes: ['5020'] },
    { key: '51', label: '벨울림', codes: ['51'] },
    { key: '52', label: '다이얼링', codes: ['52'] },
    { key: '53', label: '보류', codes: ['53'] },
    { key: '60', label: '후처리', codes: ['60'] },
  ];
}

const DEFAULT_ACTIVE_STATES = new Set(['30', '40', '41', '42', '5010', '5020', '60']);

// 오리지널 디자인 (Soft Tone) 유지
const CHIP_STYLE: Record<string, { active: string; idle: string }> = {
  default: { active: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200', idle: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50' },
  green: { active: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100', idle: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50' },
  blue: { active: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100', idle: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50' },
  orange: { active: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100', idle: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50' },
  purple: { active: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100', idle: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50' },
};

const TAG_COLOR_BY_STATE: Record<string, string> = {
  '10': 'default',
  '30': 'default',
  '40': 'green',
  '41': 'green',
  '42': 'green',
  '5010': 'blue',
  '5020': 'blue',
  '51': 'orange',
  '52': 'orange',
  '53': 'purple',
  '60': 'purple',
};

// 상담사 상태 서머리 컬러 일치화
const DIST_BG_BY_GROUP: Record<StatusGroup, string> = {
  talking: 'bg-blue-600',
  available: 'bg-emerald-600',
  ringing: 'bg-amber-500',
  wrapup: 'bg-violet-600',
  offline: 'bg-slate-500',
};

export default function AgentStatusWidget({ data, options, widgetId, onRequestPause }: AgentStatusWidgetProps) {
  const rows = useMemo<AgentRow[]>(() => (isDemoMode() ? DEMO_AGENTS : toAgentRows(data)), [data]);
  const [toolbarSlot, setToolbarSlot] = useState<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<ListRef>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (widgetId == null) return;
    setToolbarSlot(document.getElementById(widgetToolbarSlotId(widgetId)));
  }, [widgetId]);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const storageKey = widgetId != null ? `bt-admin.insight.monitoring.widget.${widgetId}.ui` : 'bt-admin.insight.monitoring.widget.agent-status.ui';
  const [ui, setUi] = usePersistentState<any>(storageKey, {
    activeStates: Array.from(DEFAULT_ACTIVE_STATES),
    density: (options?.density ?? 'card') as Density,
    alertOnly: false,
    summaryCollapsed: false,
  });

  const activeStates = useMemo(() => new Set(ui.activeStates), [ui.activeStates]);
  const { density, alertOnly, summaryCollapsed } = ui;

  // 대기 표시 방식(1=대기 통합 / 2=대기 IB·OB 분리). 저장 설정 → SUBSCRIBE options 로 전달, 기본 1.
  const standbyType: 1 | 2 = options?.standbyType === 2 ? 2 : 1;
  const stateChips = useMemo(() => buildStateChips(standbyType), [standbyType]);
  // 상담사 상태 임계 행 — 통화도 대기 표시 방식(standbyType)에 따라 통합('통화')/분리('통화 IB'/'통화 OB').
  const thresholdRows = useMemo<{ key: string; label: string; codes: string[] }[]>(() => {
    const talk =
      standbyType === 2
        ? [
            { key: '5010', label: '통화 IB', codes: ['5010'] },
            { key: '5020', label: '통화 OB', codes: ['5020'] },
          ]
        : [{ key: '5010', label: '통화', codes: ['5010', '5020'] }];
    return [
      ...talk,
      { key: '53', label: '보류', codes: ['53'] },
      { key: '51', label: '벨울림', codes: ['51'] },
      { key: '52', label: '다이얼링', codes: ['52'] },
      { key: '60', label: '후처리', codes: ['60'] },
    ];
  }, [standbyType]);

  const setDensity = useCallback((d: Density) => setUi((p: any) => ({ ...p, density: d })), [setUi]);
  const toggleSummary = useCallback(() => setUi((p: any) => ({ ...p, summaryCollapsed: !p.summaryCollapsed })), [setUi]);
  const setAlertOnly = useCallback((next: any) => setUi((p: any) => ({ ...p, alertOnly: typeof next === 'function' ? next(p.alertOnly) : next })), [setUi]);

  const [search, setSearch] = useState('');
  const [groupBy] = useState<GroupBy>(options?.groupBy ?? 'queue');
  const searchRef = useRef<HTMLInputElement>(null);

  // 칩 토글 — codes(여러 statusKey)를 한꺼번에 켜고/끈다. 하나라도 켜져 있으면 전체 끄기.
  const toggleStates = useCallback(
    (codes: string[]) => {
      setUi((prev: any) => {
        const s = new Set(prev.activeStates);
        const anyOn = codes.some((c) => s.has(c));
        codes.forEach((c) => (anyOn ? s.delete(c) : s.add(c)));
        return { ...prev, activeStates: Array.from(s) };
      });
    },
    [setUi],
  );

  const toggleGroup = useCallback((id: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
    for (const r of rows) if (alarmLevel(r.AGENT_STATUS, r.REASON_CODE, r.TENANT_ID, liveDurationSec(r, nowMs), options?.thresholds) === 2) n++;
    return n;
  }, [rows, nowMs, options?.thresholds]);

  const stripKpi = useMemo(() => {
    let conn = 0,
      ans = 0,
      online = 0,
      aux = 0,
      idle = 0;
    for (const r of rows) {
      conn += toNum(r.SUM_CONN_CNT) ?? 0;
      ans += toNum(r.SUM_ANSW_CNT) ?? 0;
      const status = toNum(r.AGENT_STATUS);
      if (status != null && status !== 10) {
        online++;
        if (status === 30) aux++;
        if (status === 41 || status === 42) idle++;
      }
    }
    return {
      conn,
      ans,
      online,
      aux,
      idle,
      responseReady: online > 0 ? Math.round((idle / online) * 100) : null,
      working: online > 0 ? Math.round(((online - aux) / online) * 100) : null,
    };
  }, [rows]);

  const visible = useMemo(() => {
    let f = rows.filter((r) => activeStates.has(statusKey(r.AGENT_STATUS, r.REASON_CODE)));
    if (search) f = f.filter((r) => matchSearch(r, search));
    if (alertOnly) f = f.filter((r) => alarmLevel(r.AGENT_STATUS, r.REASON_CODE, r.TENANT_ID, liveDurationSec(r, nowMs), options?.thresholds) === 2);
    return [...f].sort((a, b) => liveDurationSec(b, nowMs) - liveDurationSec(a, nowMs));
  }, [rows, activeStates, search, alertOnly, nowMs, options?.thresholds]);

  const grouped = useMemo(() => groupAgents(visible, groupBy), [visible, groupBy]);
  const allRowsByGroup = useMemo(() => {
    const map = new Map<string, AgentRow[]>();
    for (const g of groupAgents(rows, groupBy)) map.set(g.id, g.rows);
    return map;
  }, [rows, groupBy]);

  const columnCount = useMemo(() => {
    if (density === 'grid') return 1;
    const w = containerSize.width || 1200;
    if (density === 'dot') return Math.floor((w - 40) / 26);
    if (density === 'card') {
      if (w > 1536) return 6;
      if (w > 1280) return 5;
      if (w > 1024) return 4;
      if (w > 768) return 3;
      if (w > 640) return 2;
      return 1;
    } else {
      // row density
      if (w > 1536) return 9;
      if (w > 1280) return 7;
      if (w > 1024) return 5;
      if (w > 768) return 3;
      return 2;
    }
  }, [containerSize.width, density]);

  // 이석 사유명 맵 — 카드/그리드/도트의 이석 상태 라벨에 테넌트별 사유명 표시 (현재 테넌트 컨텍스트 스코프, 5분 캐시).
  const { data: reasonCodes = [], isLoading: isReasonLoading } = useGetAgentReasonCodes();
  const reasonNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of reasonCodes) m[`${r.tenantId}_${r.reasonCode}`] = r.reasonName;
    return m;
  }, [reasonCodes]);

  const virtualItems = useMemo<VirtualItem[]>(() => {
    if (density === 'grid') return [];
    const items: VirtualItem[] = [];
    grouped.forEach((g) => {
      const isCollapsed = collapsedGroups.has(g.id);
      if (groupBy !== 'none') {
        items.push({ type: 'header', id: `h_${g.id}`, label: g.label, groupRows: g.rows, allRows: allRowsByGroup.get(g.id) || [], isCollapsed, onToggle: () => toggleGroup(g.id) });
      }
      if (!isCollapsed) {
        for (let i = 0; i < g.rows.length; i += columnCount) {
          const chunk = g.rows.slice(i, i + columnCount);
          items.push({
            type: 'row',
            id: `r_${g.id}_${i}`,
            rows: chunk,
            density,
            nowMs,
            thresholds: options?.thresholds,
            reasonNames: reasonNameMap,
            onActivate: (r) => setRadarAgent(r),
          });
        }
      }
    });
    return items;
  }, [grouped, columnCount, density, nowMs, options?.thresholds, reasonNameMap, groupBy, allRowsByGroup, collapsedGroups, toggleGroup]);

  // 그룹 접기/펴기로 data 길이가 바뀌면 rc-virtual-list 의 높이 캐시·scrollTop 이 stale 상태가 되어
  // 맨 아래 그룹 카드가 스크롤 전까지 렌더되지 않는다. 토글 후 현재 위치로 재스크롤해 강제 재계산한다.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const raf = requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.getScrollInfo().y });
    });
    return () => cancelAnimationFrame(raf);
  }, [collapsedGroups]);

  const [radarAgent, setRadarAgent] = useState<AgentRow | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ─── 설정 로직 ────────────────────────────────────────────────
  const numericWidgetId = typeof widgetId === 'number' ? widgetId : Number(widgetId);
  const hasWidgetId = Number.isFinite(numericWidgetId) && numericWidgetId > 0;
  const queryClient = useQueryClient();
  const { data: mediaTypes = [], isLoading: isMediaTypesLoading } = useGetMediaTypes();
  const { data: userSetting } = useGetWidgetUserSetting({
    params: { widgetId: hasWidgetId ? numericWidgetId : 0 },
    queryOptions: { enabled: hasWidgetId && settingsOpen },
  });
  const { mutate: saveUserSetting, isPending: isSavingSetting } = useUpdateWidgetUserSetting({
    mutationOptions: {
      onSuccess: () => {
        if (hasWidgetId) {
          queryClient.invalidateQueries({ queryKey: widgetSettingKeys.userSetting(numericWidgetId).queryKey });
        }
        toast.success('설정이 저장되었습니다.');
        setSettingsOpen(false);
      },
    },
  });

  // 테넌트별 이석 설정용 그룹 (사유 조회는 상단 reasonNameMap 과 공유)
  const reasonGroups = useMemo(() => {
    const m = new Map<number, { tenantId: number; tenantName: string; reasons: AgentReasonCodeItem[] }>();
    for (const r of reasonCodes) {
      let g = m.get(r.tenantId);
      if (!g) {
        g = { tenantId: r.tenantId, tenantName: r.tenantName, reasons: [] };
        m.set(r.tenantId, g);
      }
      g.reasons.push(r);
    }
    return [...m.values()];
  }, [reasonCodes]);

  const [formMediaType, setFormMediaType] = useState<number | null>(null);
  const [formStandbyType, setFormStandbyType] = useState<1 | 2>(1);
  const [formThresholds, setFormThresholds] = useState<Record<string, Threshold>>({});
  useEffect(() => {
    if (!settingsOpen) return;
    const saved = userSetting?.settings?.mediaType;
    setFormMediaType(typeof saved === 'number' ? saved : null);
    setFormStandbyType(userSetting?.settings?.standbyType === 2 ? 2 : 1);
    // 상태 기본 임계 위에 사용자 저장값(상태 오버라이드 + reason:{tid}:{code})을 덮어 병합
    const savedTh = (userSetting?.settings?.thresholds ?? {}) as Record<string, Threshold>;
    setFormThresholds({ ...DEFAULT_THRESHOLDS, ...savedTh });
  }, [settingsOpen, userSetting]);

  const setThreshold = useCallback((key: string, v: Threshold) => setFormThresholds((p) => ({ ...p, [key]: v })), []);
  // 통화 통합 표시 시 한 행이 5010·5020 두 키에 같은 값을 쓴다.
  const setThresholdCodes = useCallback(
    (codes: string[], v: Threshold) =>
      setFormThresholds((p) => {
        const next = { ...p };
        codes.forEach((c) => (next[c] = v));
        return next;
      }),
    [],
  );

  const handleSaveSettings = useCallback(() => {
    if (!hasWidgetId) {
      toast.error('위젯 식별자가 없어 저장할 수 없습니다.');
      return;
    }
    const settings: Record<string, unknown> = { mediaType: formMediaType ?? 0, standbyType: formStandbyType, thresholds: formThresholds };
    saveUserSetting({ widgetId: numericWidgetId, settings });
  }, [hasWidgetId, numericWidgetId, formMediaType, formStandbyType, formThresholds, saveUserSetting]);

  // 툴바 디자인 확정 (오리지널 스타일 기반 + 스위치 그룹화 + 아이콘 개선)
  const toolbar = (
    <div className="flex flex-nowrap items-center gap-2">
      <Input
        ref={searchRef as any}
        allowClear
        placeholder="이름·상담그룹 검색"
        prefix={<Search className="w-4 h-4 text-gray-400" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: 240, height: 32 }}
      />

      {/* 뷰 전환 스위치 그룹 */}
      <div className="flex items-center bg-gray-100 p-0.5 rounded border border-gray-200">
        <Tooltip title="큰 카드" placement="top">
          <span
            onClick={() => setDensity('card')}
            role="button"
            className={`inline-flex w-7 h-7 cursor-pointer items-center justify-center rounded transition-all ${density === 'card' ? 'bg-white shadow-sm text-[#405189] font-bold' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Grid2X2 size={15} strokeWidth={2} />
          </span>
        </Tooltip>
        <Tooltip title="작은 카드" placement="top">
          <span
            onClick={() => setDensity('row')}
            role="button"
            className={`inline-flex w-7 h-7 cursor-pointer items-center justify-center rounded transition-all ${density === 'row' ? 'bg-white shadow-sm text-[#405189] font-bold' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <LayoutList size={15} strokeWidth={2} />
          </span>
        </Tooltip>
        <Tooltip title="목록" placement="top">
          <span
            onClick={() => setDensity('grid')}
            role="button"
            className={`inline-flex w-7 h-7 cursor-pointer items-center justify-center rounded transition-all ${density === 'grid' ? 'bg-white shadow-sm text-[#405189] font-bold' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <ListIcon size={15} strokeWidth={2} />
          </span>
        </Tooltip>
      </div>

      <div className="flex items-center gap-1 ml-1 border-l border-gray-200 pl-2">
        <Tooltip title={summaryCollapsed ? '요약정보 펴기' : '요약정보 접기'} placement="top">
          <span
            onClick={toggleSummary}
            className={`inline-flex w-8 h-8 cursor-pointer items-center justify-center rounded border transition-colors hover:bg-gray-100 ${summaryCollapsed ? 'text-[#405189] border-[#405189]' : 'text-gray-400 border-gray-300'}`}
          >
            {summaryCollapsed ? <PanelTopOpen size={16} strokeWidth={2} /> : <PanelTopClose size={16} strokeWidth={2} />}
          </span>
        </Tooltip>
        <Tooltip title="설정" placement="top">
          <span
            onClick={() => {
              onRequestPause?.();
              setSettingsOpen(true);
            }}
            className="inline-flex w-8 h-8 cursor-pointer items-center justify-center rounded border border-gray-300 text-gray-400 transition-colors hover:bg-gray-100"
          >
            <Settings size={16} />
          </span>
        </Tooltip>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col bg-white overflow-hidden" ref={containerRef}>
      {toolbarSlot ? createPortal(toolbar, toolbarSlot) : <header className="flex items-center justify-end gap-2 border-b border-gray-200 px-4 py-2.5">{toolbar}</header>}

      <div className={`grid transition-all duration-300 ease-in-out ${summaryCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="grid grid-cols-2 gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiTile label="인입콜" value={stripKpi.conn.toLocaleString()} mono icon={<PhoneIncoming className="w-3.5 h-3.5" />} />
            <KpiTile label="응대콜" value={stripKpi.ans.toLocaleString()} mono icon={<PhoneCall className="w-3.5 h-3.5" />} />
            <KpiTile
              label="응대대기"
              value={stripKpi.responseReady != null ? `${stripKpi.responseReady}%` : '—'}
              mono
              hint={`대기 ${stripKpi.idle}`}
              icon={<Headset className="w-3.5 h-3.5" />}
            />
            <KpiTile
              label="근무율"
              value={stripKpi.working != null ? `${stripKpi.working}%` : '—'}
              mono
              hint={`근무 ${stripKpi.online - stripKpi.aux}`}
              icon={<Users className="w-3.5 h-3.5" />}
            />
            <KpiTile
              label="임계"
              value={alertCount.toString()}
              mono
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
              valueColor={alertCount > 0 ? 'text-red-600' : 'text-gray-400'}
              accent={alertCount > 0 ? 'red' : undefined}
              onClick={() => setAlertOnly((b: any) => !b)}
              active={alertOnly}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-200 bg-white px-4 py-2">
        {stateChips.map(({ key, label, codes }) => {
          const checked = codes.some((c) => activeStates.has(c));
          const count = codes.reduce((n, c) => n + (stateCounts[c] ?? 0), 0);
          const palette = CHIP_STYLE[TAG_COLOR_BY_STATE[key] ?? 'default'];
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleStates(codes)}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors ${checked ? palette.active : palette.idle}`}
            >
              <span>{label}</span>
              <span className="font-mono tabular-nums opacity-80">({count})</span>
            </button>
          );
        })}
        <div className="ml-auto">
          <MosLegend />
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {density === 'grid' ? (
          <AgentStatusGrid rows={visible} nowMs={nowMs} reasonNames={reasonNameMap} />
        ) : visible.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <NoData message="데이터가 없습니다." />
          </div>
        ) : (
          <List
            ref={listRef}
            data={virtualItems}
            height={containerSize.height - (summaryCollapsed ? (toolbarSlot ? 56 : 100) : toolbarSlot ? 136 : 180)}
            // itemHeight 는 "아직 측정 안 된 아이템"의 추정 높이로만 쓰인다(렌더 후 실제 offsetHeight 로 교체).
            // 간격은 margin 이 아닌 padding 으로 준다(아래 렌더 함수 참고) — margin 은 offsetHeight 에
            // 포함되지 않아 가상 스크롤 높이가 어긋나고, 전체 접기 시 하단 그룹이 스크롤로도 도달 불가해진다.
            // 추정값은 "가장 작은 실제 아이템(그룹 헤더 ~80px, dot 행 ~50px)" 이하로 잡아, 측정 전에도
            // 과소추정 → over-render(안전 방향)가 되게 한다. 과대추정하면 tail 아이템이 스크롤 전까지 잘린다.
            itemHeight={groupBy === 'none' ? (density === 'card' ? 164 : density === 'row' ? 84 : 50) : density === 'dot' ? 40 : 48}
            itemKey="id"
            className="virtual-agent-list"
          >
            {(item: VirtualItem) =>
              item.type === 'header' ? (
                // 간격을 wrapper 의 padding 으로 준다(GroupHeader 의 mt-6/mb-4 를 옮김).
                // margin 은 rc-virtual-list 의 offsetHeight 측정에서 제외되어 가상 스크롤 높이를 어긋나게 한다.
                <div className="pt-6 pb-4">
                  <GroupHeader item={item} allRows={item.allRows} stateChips={stateChips} />
                </div>
              ) : (
                <div className={`grid px-4 pb-3 ${density === 'dot' ? 'gap-1' : 'gap-2'}`} style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}>
                  {item.rows.map((r: AgentRow, i: number) =>
                    density === 'dot' ? (
                      <AgentDot key={i} row={r} nowMs={nowMs} thresholds={item.thresholds} reasonNames={item.reasonNames} onActivate={item.onActivate} />
                    ) : (
                      <AgentCard
                        key={i}
                        row={r}
                        nowMs={nowMs}
                        thresholds={item.thresholds}
                        reasonNames={item.reasonNames}
                        onActivate={item.onActivate}
                        compact={density === 'row'}
                      />
                    ),
                  )}
                  {Array.from({ length: columnCount - item.rows.length }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                </div>
              )
            }
          </List>
        )}
      </div>

      <AgentRadarModal open={radarAgent != null} onClose={() => setRadarAgent(null)} agent={radarAgent} allAgents={rows} />

      <Drawer
        title="상담사 상태 모니터 설정"
        closable={{ placement: 'end' }}
        placement="right"
        size={420}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        destroyOnHidden
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setSettingsOpen(false)} disabled={isSavingSetting}>
              취소
            </Button>
            <Button type="primary" onClick={handleSaveSettings} loading={isSavingSetting} disabled={!hasWidgetId}>
              저장
            </Button>
          </div>
        }
      >
        <div className="flex h-full flex-col gap-4">
          {/* ① 미디어 타입 */}
          <section className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
            <span className="text-sm font-semibold text-gray-800">미디어 타입</span>
            <p className="text-[12px] leading-relaxed text-gray-500">이 위젯에 표시할 상담사의 미디어 타입을 선택합니다.</p>
            {isMediaTypesLoading ? (
              <div className="text-xs text-gray-400">로딩 중…</div>
            ) : mediaTypes.length === 0 ? (
              <div className="text-xs text-gray-400">표시할 미디어 타입이 없습니다.</div>
            ) : (
              <Radio.Group value={formMediaType} onChange={(e) => setFormMediaType(e.target.value)} disabled={isSavingSetting}>
                <div className="flex flex-col gap-2">
                  {mediaTypes.map((m: any) => (
                    <Radio key={m.mediaType} value={m.mediaType}>
                      <span className="text-sm text-gray-900">{m.mediaAlias}</span>
                    </Radio>
                  ))}
                </div>
              </Radio.Group>
            )}
          </section>

          {/* ② 대기 표시 방식 */}
          <section className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
            <span className="text-sm font-semibold text-gray-800">대기 표시 방식</span>
            <p className="text-[12px] leading-relaxed text-gray-500">상태 서머리·그룹 상태에서 대기 상담사를 합쳐서 또는 IB/OB로 나눠서 표시합니다.</p>
            <Radio.Group value={formStandbyType} onChange={(e) => setFormStandbyType(e.target.value)} disabled={isSavingSetting}>
              <div className="flex flex-col gap-2">
                <Radio value={1}>
                  <span className="text-sm text-gray-900">대기 (통합)</span>
                </Radio>
                <Radio value={2}>
                  <span className="text-sm text-gray-900">대기 IB + 대기 OB (분리)</span>
                </Radio>
              </div>
            </Radio.Group>
          </section>

          {/* ③ 상담사 상태 임계 (초) */}
          <section className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
            <span className="text-sm font-semibold text-gray-800">상담사 상태 임계 (초)</span>
            <p className="text-[12px] leading-relaxed text-gray-500">
              상태 지속이 <span className="font-medium text-amber-600">주의(초)</span> 초과 시 노랑, <span className="font-medium text-red-600">위험(초)</span> 초과 시 빨강으로
              강조됩니다.
            </p>
            <div className="grid grid-cols-[1fr_84px_84px] items-center gap-x-2 gap-y-1.5">
              <span />
              <span className="text-center text-[11px] font-medium text-amber-600">주의</span>
              <span className="text-center text-[11px] font-medium text-red-600">위험</span>
              {thresholdRows.map(({ key, label, codes }) => {
                const v = formThresholds[key] ?? { warn: 0, danger: 0 };
                return (
                  <Fragment key={key}>
                    <span className="text-[13px] text-gray-700">{label}</span>
                    <InputNumber
                      size="small"
                      min={0}
                      max={7200}
                      step={5}
                      value={v.warn}
                      disabled={isSavingSetting}
                      style={{ width: '100%' }}
                      onChange={(n) => setThresholdCodes(codes, { ...v, warn: typeof n === 'number' ? n : 0 })}
                    />
                    <InputNumber
                      size="small"
                      min={0}
                      max={7200}
                      step={5}
                      value={v.danger}
                      disabled={isSavingSetting}
                      style={{ width: '100%' }}
                      onChange={(n) => setThresholdCodes(codes, { ...v, danger: typeof n === 'number' ? n : 0 })}
                    />
                  </Fragment>
                );
              })}
            </div>
          </section>

          {/* ③ 테넌트별 이석 임계 (초) */}
          <section className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
            <span className="text-sm font-semibold text-gray-800">테넌트별 이석 임계 (초)</span>
            <p className="text-[12px] leading-relaxed text-gray-500">이석 임계는 사유별로 지정합니다. 미지정 사유는 기본 이석 기준으로 강조됩니다.</p>
            {isReasonLoading ? (
              <div className="text-xs text-gray-400">로딩 중…</div>
            ) : reasonGroups.length === 0 ? (
              <div className="text-xs text-gray-400">조회 가능한 이석 사유가 없습니다.</div>
            ) : (
              reasonGroups.map((g) => (
                <div key={g.tenantId} className="flex flex-col gap-1.5 rounded-md border border-gray-100 bg-gray-50/50 p-2.5">
                  <span className="text-[12px] font-semibold text-gray-700">{g.tenantName}</span>
                  <div className="grid grid-cols-[1fr_84px_84px] items-center gap-x-2 gap-y-1.5">
                    <span />
                    <span className="text-center text-[11px] font-medium text-amber-600">주의</span>
                    <span className="text-center text-[11px] font-medium text-red-600">위험</span>
                    {g.reasons.map((r) => {
                      const key = reasonThresholdKey(r.tenantId, r.reasonCode);
                      const fallback = formThresholds['30'] ?? DEFAULT_THRESHOLDS['30'] ?? { warn: 0, danger: 0 };
                      const v = formThresholds[key] ?? fallback;
                      return (
                        <Fragment key={key}>
                          <span className="truncate text-[13px] text-gray-700" title={r.reasonName}>
                            {r.reasonName}
                          </span>
                          <InputNumber
                            size="small"
                            min={0}
                            max={7200}
                            step={5}
                            value={v.warn}
                            disabled={isSavingSetting}
                            style={{ width: '100%' }}
                            onChange={(n) => setThreshold(key, { ...v, warn: typeof n === 'number' ? n : 0 })}
                          />
                          <InputNumber
                            size="small"
                            min={0}
                            max={7200}
                            step={5}
                            value={v.danger}
                            disabled={isSavingSetting}
                            style={{ width: '100%' }}
                            onChange={(n) => setThreshold(key, { ...v, danger: typeof n === 'number' ? n : 0 })}
                          />
                        </Fragment>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </Drawer>
    </div>
  );
}

function GroupHeader({ item, allRows, stateChips }: { item: VirtualItem & { type: 'header' }; allRows: AgentRow[]; stateChips: StateChip[] }) {
  const dist = useMemo(() => {
    const d: Record<StatusGroup, number> = { available: 0, talking: 0, ringing: 0, wrapup: 0, offline: 0 };
    for (const r of allRows) d[statusMeta(r.AGENT_STATUS, r.REASON_CODE).group]++;
    return d;
  }, [allRows]);

  const stateCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of allRows) {
      const k = statusKey(r.AGENT_STATUS, r.REASON_CODE);
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [allRows]);

  const groupAvg = useMemo(() => {
    if (allRows.length === 0) return { handled: 0, selfRate: 0 };
    let h = 0,
      sr = 0,
      srC = 0;
    for (const r of allRows) {
      h += (toNum(r.SUM_ANSW_CNT) ?? 0) + (toNum(r.SUM_OB_SUCC) ?? 0);
      const s = toNum(r.SELF_HANDLE_RATE);
      if (s != null) {
        sr += s;
        srC++;
      }
    }
    return { handled: h / allRows.length, selfRate: srC > 0 ? sr / srC : 0 };
  }, [allRows]);

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-gray-200 pb-2 mx-4">
      <button type="button" onClick={item.onToggle} className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${item.isCollapsed ? '-rotate-90' : ''}`} />
        <span>{item.label}</span>
      </button>
      <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-medium text-gray-600 tabular-nums">{allRows.length}명</span>

      <Tooltip
        title={
          <div className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 p-1 text-xs">
            {stateChips.map(({ key, label, codes }) => (
              <div key={key} className="contents">
                <span className="text-slate-300 font-medium">{label}</span>
                <span className="text-right font-mono font-bold tabular-nums text-white">{codes.reduce((n, c) => n + (stateCounts[c] ?? 0), 0)}</span>
              </div>
            ))}
          </div>
        }
        placement="top"
      >
        <div className="flex h-2 w-28 overflow-hidden rounded-full border border-gray-200">
          {(['talking', 'available', 'ringing', 'wrapup', 'offline'] as StatusGroup[]).map((g) => {
            const n = dist[g];
            if (!n) return null;
            return <span key={g} className={`${DIST_BG_BY_GROUP[g]}`} style={{ width: `${(n / allRows.length) * 100}%` }} />;
          })}
        </div>
      </Tooltip>

      <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
        <span>
          처리량 <span className="font-mono font-semibold text-gray-700">{groupAvg.handled.toFixed(1)}</span>
        </span>
        <span>
          자율처리 <span className="font-mono font-semibold text-gray-700">{Math.round(groupAvg.selfRate)}%</span>
        </span>
      </div>
    </header>
  );
}

function KpiTile({ label, value, hint, mono, valueColor, icon, accent, active, onClick }: KpiTileProps) {
  const isRed = accent === 'red';
  const cls = [
    'flex flex-col gap-1 rounded-md border px-3 py-2 transition-colors',
    onClick ? 'cursor-pointer hover:shadow-sm' : '',
    isRed ? (active ? 'border-red-500 bg-red-50' : 'border-red-200 bg-white hover:bg-red-50') : 'border-gray-200 bg-white',
  ].join(' ');

  return (
    <div onClick={onClick} className={cls}>
      <div className="flex items-center gap-1 text-[13px] font-semibold uppercase tracking-wide text-gray-600">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-baseline justify-center gap-2 min-w-0">
        <span className={`text-xl font-bold leading-none ${mono ? 'font-mono tabular-nums' : ''} ${valueColor ?? 'text-gray-900'}`}>{value}</span>
        {hint && <span className="truncate text-[11px] text-gray-400">{hint}</span>}
      </div>
    </div>
  );
}

interface KpiTileProps {
  label: string;
  value: string | number;
  hint?: string;
  mono?: boolean;
  valueColor?: string;
  icon?: ReactNode;
  accent?: 'red';
  active?: boolean;
  onClick?: () => void;
}
