import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Input, InputNumber, Radio, Tooltip } from 'antd';
import { AlertTriangle, LayoutGrid, Rows3, Search, Settings } from 'lucide-react';
import { toast } from '@/shared-util';
import { fmtCount, fmtDuration, fmtPct, matchSearch, severityOf, severityWeight, toCtiqRows, toNum } from './helpers';
import { type CtiqDensity, type CtiqRow, type CtiqSeverity, type CtiqSortBy, type CtiqThresholds, DEFAULT_CTIQ_THRESHOLDS } from './types';
import { widgetToolbarSlotId } from '../../components/canvas/WidgetCardHeader';
import { useGetMediaTypes, useGetWidgetUserSetting, useUpdateWidgetUserSetting, widgetSettingKeys } from '../../hooks/useWidgetSettingQueries';
import NoData from '@/components/custom/NoData';
import { usePersistentState } from '@/libs/shared-ui/src/hooks/usePersistentState';

/**
 * 큐(CTIQ) 상태 모니터 위젯.
 *
 * 레이아웃:
 *  ┌────────────────────────────────────────────────────────────────┐
 *  │ ① 헤더 — 실시간 · 검색 · 큰/작은카드 토글 · 설정                │
 *  ├────────────────────────────────────────────────────────────────┤
 *  │ ② KPI 스트립 — [총인입][총응대][응대율][SLA][현재대기][임계]   │
 *  ├────────────────────────────────────────────────────────────────┤
 *  │ ③ 시맨틱 칩 — [정상][주의][경고][위험][휴면] (필터)            │
 *  ├────────────────────────────────────────────────────────────────┤
 *  │ ④ 본문 — 큰카드 격자 또는 작은카드 격자                        │
 *  └────────────────────────────────────────────────────────────────┘
 *
 * 데이터: BE INSIGHT CtiqStatusWidget → WS DATA → widgetData[id].rows
 * 설정: 우측 Drawer 에서 mediaType + 임계값 4종 저장.
 */

export interface CtiqStatusWidgetProps {
  data: unknown;
  options?: Record<string, unknown>;
  widgetId?: number | string;
  /** 설정 변경 시 부모 대시보드 WS 재구독 신호. */
  onRequestPause?: () => void;
}

const SEVERITY_META: Record<CtiqSeverity, { label: string; chipCls: string; dotCls: string; rowBg: string; barCls: string }> = {
  danger: {
    label: '위험',
    chipCls: 'bg-red-50 text-red-700 border-red-200',
    dotCls: 'bg-red-600',
    rowBg: 'bg-red-50/60',
    barCls: 'bg-red-600',
  },
  alert: {
    label: '경고',
    chipCls: 'bg-orange-50 text-orange-700 border-orange-200',
    dotCls: 'bg-orange-600',
    rowBg: 'bg-orange-50/50',
    barCls: 'bg-orange-600',
  },
  warn: {
    label: '주의',
    chipCls: 'bg-amber-50 text-amber-700 border-amber-200',
    dotCls: 'bg-amber-500',
    rowBg: 'bg-amber-50/40',
    barCls: 'bg-amber-500',
  },
  ok: {
    label: '정상',
    chipCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotCls: 'bg-emerald-600',
    rowBg: '',
    barCls: 'bg-emerald-600',
  },
  idle: {
    label: '휴면',
    chipCls: 'bg-gray-100 text-gray-500 border-gray-200',
    dotCls: 'bg-gray-400',
    rowBg: '',
    barCls: 'bg-gray-300',
  },
};

const ALL_SEVERITIES: CtiqSeverity[] = ['danger', 'alert', 'warn', 'ok', 'idle'];

export default function CtiqStatusWidget({ data, options, widgetId, onRequestPause }: CtiqStatusWidgetProps) {
  const rows = useMemo<CtiqRow[]>(() => toCtiqRows(data), [data]);

  // ─── 영속 UI 상태 ──────────────────────────────────────────────
  type UiState = {
    density: CtiqDensity;
    activeSeverities: CtiqSeverity[];
    sortBy: CtiqSortBy;
    alertOnly: boolean;
  };
  const storageKey = widgetId != null ? `bt-admin.insight.monitoring.widget.${widgetId}.ui` : 'bt-admin.insight.monitoring.widget.ctiq-status.ui';
  const [ui, setUi] = usePersistentState<UiState>(storageKey, {
    density: (options?.density as CtiqDensity | undefined) ?? 'large',
    activeSeverities: [...ALL_SEVERITIES],
    sortBy: 'severity',
    alertOnly: false,
  });
  const density = ui.density;
  const activeSeverities = useMemo(() => new Set(ui.activeSeverities), [ui.activeSeverities]);
  const sortBy = ui.sortBy;
  const alertOnly = ui.alertOnly;
  const setDensity = useCallback((d: CtiqDensity) => setUi((p) => ({ ...p, density: d })), [setUi]);
  const setSortBy = useCallback((s: CtiqSortBy) => setUi((p) => ({ ...p, sortBy: s })), [setUi]);
  const setAlertOnly = useCallback(
    (next: boolean | ((p: boolean) => boolean)) => setUi((p) => ({ ...p, alertOnly: typeof next === 'function' ? (next as (b: boolean) => boolean)(p.alertOnly) : next })),
    [setUi],
  );
  const toggleSeverity = useCallback(
    (k: CtiqSeverity) => {
      setUi((prev) => {
        const s = new Set(prev.activeSeverities);
        if (s.has(k)) s.delete(k);
        else s.add(k);
        return { ...prev, activeSeverities: Array.from(s) };
      });
    },
    [setUi],
  );

  // ephemeral
  const [search, setSearch] = useState('');

  // ─── 임계값 (옵션 → 기본값 폴백) ──────────────────────────────
  const thresholds: CtiqThresholds = useMemo(() => {
    const o = (options?.thresholds as Partial<CtiqThresholds> | undefined) ?? {};
    return {
      waitCnt: toNum(o.waitCnt) ?? DEFAULT_CTIQ_THRESHOLDS.waitCnt,
      maxWaitSec: toNum(o.maxWaitSec) ?? DEFAULT_CTIQ_THRESHOLDS.maxWaitSec,
      slaPct: toNum(o.slaPct) ?? DEFAULT_CTIQ_THRESHOLDS.slaPct,
      abandonRatioPct: toNum(o.abandonRatioPct) ?? DEFAULT_CTIQ_THRESHOLDS.abandonRatioPct,
    };
  }, [options?.thresholds]);

  // ─── 분류 + 필터 + 정렬 ──────────────────────────────────────
  const classified = useMemo(() => rows.map((r) => ({ row: r, sev: severityOf(r, thresholds) })), [rows, thresholds]);

  const sevCounts = useMemo(() => {
    const c: Record<CtiqSeverity, number> = { danger: 0, alert: 0, warn: 0, ok: 0, idle: 0 };
    for (const { sev } of classified) c[sev]++;
    return c;
  }, [classified]);

  const visible = useMemo(() => {
    let f = classified.filter(({ sev }) => activeSeverities.has(sev));
    if (search) f = f.filter(({ row }) => matchSearch(row, search));
    if (alertOnly) f = f.filter(({ sev }) => sev === 'danger' || sev === 'alert');
    return [...f].sort((a, b) => {
      switch (sortBy) {
        case 'severity':
          return severityWeight(b.sev) - severityWeight(a.sev) || (toNum(b.row.RTS_WAIT_CNT) ?? 0) - (toNum(a.row.RTS_WAIT_CNT) ?? 0);
        case 'wait':
          return (toNum(b.row.RTS_WAIT_CNT) ?? 0) - (toNum(a.row.RTS_WAIT_CNT) ?? 0);
        case 'sla':
          return (toNum(a.row.KPI_SVCLEVEL) ?? 1) - (toNum(b.row.KPI_SVCLEVEL) ?? 1);
        case 'answerRate':
          return (toNum(b.row.KPI_ANSWER_RATE) ?? 0) - (toNum(a.row.KPI_ANSWER_RATE) ?? 0);
        case 'id':
          return (toNum(a.row.CTIQ_ID) ?? 0) - (toNum(b.row.CTIQ_ID) ?? 0);
      }
    });
  }, [classified, activeSeverities, search, alertOnly, sortBy]);

  // ─── KPI 스트립 (raw 합계) ───────────────────────────────────
  const stripKpi = useMemo(() => {
    let conn = 0,
      ans = 0,
      wait = 0,
      login = 0,
      maxWait = 0,
      slaNum = 0,
      slaDen = 0;
    let alertCnt = 0;
    for (const { row, sev } of classified) {
      conn += toNum(row.SUM_CONN_CNT) ?? 0;
      ans += toNum(row.SUM_ANSWER_CNT_TOT) ?? toNum(row.SUM_ANSWER_CNT) ?? 0;
      wait += toNum(row.RTS_WAIT_CNT) ?? 0;
      login += toNum(row.RTS_EXP_LOGIN_AGT) ?? 0;
      const mw = toNum(row.RTS_MAXWAIT_TIME) ?? 0;
      if (mw > maxWait) maxWait = mw;
      const sla = toNum(row.KPI_SVCLEVEL);
      const c = toNum(row.SUM_CONN_CNT) ?? 0;
      if (sla != null && c > 0) {
        slaNum += sla * c;
        slaDen += c;
      }
      if (sev === 'danger' || sev === 'alert') alertCnt++;
    }
    const answerRate = conn > 0 ? ans / conn : null;
    const slaAvg = slaDen > 0 ? slaNum / slaDen : null;
    return { conn, ans, wait, login, maxWait, answerRate, slaAvg, alertCnt };
  }, [classified]);

  // ─── 헤더 슬롯 (포털) ────────────────────────────────────────
  const [toolbarSlot, setToolbarSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (widgetId == null) return;
    setToolbarSlot(document.getElementById(widgetToolbarSlotId(widgetId)));
  }, [widgetId]);

  // ─── 설정 드로어 ─────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const handleOpenSettings = useCallback(() => {
    onRequestPause?.();
    setSettingsOpen(true);
  }, [onRequestPause]);
  const handleCloseSettings = useCallback(() => setSettingsOpen(false), []);

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

  /** 폼 로컬 상태 — drawer 가 열릴 때 저장값에서 초기화. */
  const [formMediaType, setFormMediaType] = useState<number | null>(null);
  const [formThresholds, setFormThresholds] = useState<CtiqThresholds>(DEFAULT_CTIQ_THRESHOLDS);
  useEffect(() => {
    if (!settingsOpen) return;
    const saved = userSetting?.settings ?? {};
    const mt = saved.mediaType;
    setFormMediaType(typeof mt === 'number' ? mt : null);
    const th = (saved.thresholds as Partial<CtiqThresholds> | undefined) ?? {};
    setFormThresholds({
      waitCnt: toNum(th.waitCnt) ?? DEFAULT_CTIQ_THRESHOLDS.waitCnt,
      maxWaitSec: toNum(th.maxWaitSec) ?? DEFAULT_CTIQ_THRESHOLDS.maxWaitSec,
      slaPct: toNum(th.slaPct) ?? DEFAULT_CTIQ_THRESHOLDS.slaPct,
      abandonRatioPct: toNum(th.abandonRatioPct) ?? DEFAULT_CTIQ_THRESHOLDS.abandonRatioPct,
    });
  }, [settingsOpen, userSetting]);

  const handleSaveSettings = useCallback(() => {
    if (!hasWidgetId) {
      toast.error('위젯 식별자가 없어 저장할 수 없습니다.');
      return;
    }
    saveUserSetting({
      widgetId: numericWidgetId,
      settings: {
        mediaType: formMediaType ?? 0,
        thresholds: formThresholds,
      },
    });
  }, [hasWidgetId, numericWidgetId, formMediaType, formThresholds, saveUserSetting]);

  // ─── 툴바 (헤더 슬롯 portal) ─────────────────────────────────
  const toolbar = (
    <div className="flex flex-nowrap items-center gap-2">
      <Input
        allowClear
        placeholder="큐명·ID·DN 검색"
        prefix={<Search className="w-4 h-4 text-gray-400" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: 220, height: 32 }}
      />
      <Tooltip title="큰카드" placement="top">
        <span
          onClick={() => setDensity('large')}
          aria-label="큰카드"
          aria-pressed={density === 'large'}
          role="button"
          className={
            'inline-flex w-8 h-8 cursor-pointer items-center justify-center rounded border transition-colors hover:bg-gray-100 ' +
            (density === 'large' ? 'text-[#405189] border-[#405189]' : 'text-gray-400 border-gray-300')
          }
        >
          <LayoutGrid size={16} strokeWidth={1.75} />
        </span>
      </Tooltip>
      <Tooltip title="작은카드" placement="top">
        <span
          onClick={() => setDensity('small')}
          aria-label="작은카드"
          aria-pressed={density === 'small'}
          role="button"
          className={
            'inline-flex w-8 h-8 cursor-pointer items-center justify-center rounded border transition-colors hover:bg-gray-100 ' +
            (density === 'small' ? 'text-[#405189] border-[#405189]' : 'text-gray-400 border-gray-300')
          }
        >
          <Rows3 size={16} strokeWidth={1.75} />
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
      {toolbarSlot ? createPortal(toolbar, toolbarSlot) : <header className="flex items-center justify-end gap-2 border-b border-gray-200 px-4 py-2.5">{toolbar}</header>}

      {/* ② KPI 스트립 */}
      <div className="grid grid-cols-2 gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile label="총 인입" value={fmtCount(stripKpi.conn)} mono />
        <KpiTile label="총 응대" value={fmtCount(stripKpi.ans)} mono />
        <KpiTile label="응대율" value={stripKpi.answerRate != null ? fmtPct(stripKpi.answerRate) : '—'} mono />
        <KpiTile
          label="SLA"
          value={stripKpi.slaAvg != null ? fmtPct(stripKpi.slaAvg) : '—'}
          mono
          valueColor={stripKpi.slaAvg != null && stripKpi.slaAvg * 100 < thresholds.slaPct ? 'text-amber-600' : 'text-gray-900'}
        />
        <KpiTile
          label="현재 대기"
          value={fmtCount(stripKpi.wait)}
          mono
          valueColor={stripKpi.wait > thresholds.waitCnt ? 'text-red-600' : 'text-gray-900'}
          accent={stripKpi.wait > thresholds.waitCnt ? 'red' : undefined}
        />
        <KpiTile
          label="임계"
          value={stripKpi.alertCnt > 0 ? String(stripKpi.alertCnt) : '0'}
          mono
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          valueColor={stripKpi.alertCnt > 0 ? 'text-red-600' : 'text-gray-400'}
          accent={stripKpi.alertCnt > 0 ? 'red' : undefined}
          onClick={stripKpi.alertCnt > 0 ? () => setAlertOnly((b) => !b) : undefined}
          active={alertOnly}
        />
      </div>

      {/* ③ 시맨틱 칩 + 정렬 */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-200 bg-white px-4 py-2">
        {ALL_SEVERITIES.map((s) => {
          const m = SEVERITY_META[s];
          const active = activeSeverities.has(s);
          return (
            <button
              key={s}
              onClick={() => toggleSeverity(s)}
              className={
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold transition-colors ' +
                (active ? m.chipCls : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')
              }
            >
              <span className={`w-1.5 h-1.5 rounded-full ${m.dotCls}`} />
              {m.label} <span className="font-mono">{sevCounts[s]}</span>
            </button>
          );
        })}
        <span className="ml-2 text-[11px] text-gray-500">
          표시 {visible.length} / 전체 {rows.length}
        </span>
        <div className="ml-auto flex items-center gap-1.5 text-[11.5px] text-gray-500">
          <span>정렬:</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as CtiqSortBy)} className="border border-gray-300 rounded px-1.5 py-0.5 text-[11.5px] bg-white">
            <option value="severity">위험순</option>
            <option value="wait">대기수</option>
            <option value="sla">SLA 낮은순</option>
            <option value="answerRate">응대율 낮은순</option>
            <option value="id">큐 ID</option>
          </select>
        </div>
      </div>

      {/* ④ 본문 */}
      <div className="flex-1 overflow-auto p-3">
        {visible.length === 0 ? (
          <NoData />
        ) : density === 'large' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map(({ row, sev }) => (
              <LargeCard key={String(row.CTIQ_ID ?? row.GDN_NO ?? Math.random())} row={row} sev={sev} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {visible.map(({ row, sev }) => (
              <SmallCard key={String(row.CTIQ_ID ?? row.GDN_NO ?? Math.random())} row={row} sev={sev} />
            ))}
          </div>
        )}
      </div>

      {/* 설정 드로어 */}
      <Drawer
        title="큐 상태 모니터 설정"
        placement="right"
        width={420}
        open={settingsOpen}
        onClose={handleCloseSettings}
        destroyOnClose
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={handleCloseSettings} disabled={isSavingSetting}>
              취소
            </Button>
            <Button type="primary" onClick={handleSaveSettings} loading={isSavingSetting} disabled={!hasWidgetId}>
              저장
            </Button>
          </div>
        }
      >
        <div className="flex h-full flex-col gap-5">
          {/* 미디어 타입 */}
          <section className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-700">미디어 타입</span>
            {isMediaTypesLoading ? (
              <div className="text-xs text-gray-400">로딩 중…</div>
            ) : mediaTypes.length === 0 ? (
              <div className="text-xs text-gray-400">표시할 미디어 타입이 없습니다.</div>
            ) : (
              <Radio.Group value={formMediaType} onChange={(e) => setFormMediaType(e.target.value)} disabled={isSavingSetting}>
                <div className="flex flex-col gap-2">
                  {mediaTypes.map((m) => (
                    <Radio key={m.mediaType} value={m.mediaType}>
                      <span className="text-sm text-gray-900">{m.mediaAlias}</span>
                    </Radio>
                  ))}
                </div>
              </Radio.Group>
            )}
          </section>

          {/* 임계값 */}
          <section className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-700">임계값</span>
            <div className="grid grid-cols-[1fr_120px_auto] items-center gap-x-2 gap-y-2 text-[12.5px]">
              <label className="text-gray-600">대기 콜수</label>
              <InputNumber min={0} value={formThresholds.waitCnt} onChange={(v) => setFormThresholds((p) => ({ ...p, waitCnt: Number(v) || 0 }))} className="w-full" />
              <span className="text-[11px] text-gray-400">초과 → 주의</span>

              <label className="text-gray-600">최장 대기(초)</label>
              <InputNumber min={0} value={formThresholds.maxWaitSec} onChange={(v) => setFormThresholds((p) => ({ ...p, maxWaitSec: Number(v) || 0 }))} className="w-full" />
              <span className="text-[11px] text-gray-400">초과 → 경고</span>

              <label className="text-gray-600">SLA 목표(%)</label>
              <InputNumber min={0} max={100} value={formThresholds.slaPct} onChange={(v) => setFormThresholds((p) => ({ ...p, slaPct: Number(v) || 0 }))} className="w-full" />
              <span className="text-[11px] text-gray-400">미달 → 경고</span>

              <label className="text-gray-600">포기율(%)</label>
              <InputNumber
                min={0}
                max={100}
                value={formThresholds.abandonRatioPct}
                onChange={(v) => setFormThresholds((p) => ({ ...p, abandonRatioPct: Number(v) || 0 }))}
                className="w-full"
              />
              <span className="text-[11px] text-gray-400">초과 → 위험</span>
            </div>
          </section>
        </div>
      </Drawer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 큰카드 — 한 큐의 압력·KPI·처리·자원 전체 노출
// ═══════════════════════════════════════════════════════════════════

function LargeCard({ row, sev }: { row: CtiqRow; sev: CtiqSeverity }) {
  const meta = SEVERITY_META[sev];
  const pulse = sev === 'danger' ? 'animate-pulse' : '';
  const cardBorder = sev === 'danger' ? 'border-red-500 shadow-[0_0_0_1px_rgba(201,42,42,0.4)]' : sev === 'alert' ? 'border-orange-300' : 'border-gray-200';
  const wait = toNum(row.RTS_WAIT_CNT) ?? 0;
  const login = toNum(row.RTS_EXP_LOGIN_AGT) ?? 0;
  const conn = toNum(row.SUM_CONN_CNT) ?? 0;
  const answered = toNum(row.SUM_ANSWER_CNT_TOT) ?? toNum(row.SUM_ANSWER_CNT) ?? 0;

  return (
    <div className={`relative bg-white border ${cardBorder} rounded-sm p-3 transition-shadow hover:shadow-md`}>
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${meta.barCls}`} />
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${meta.dotCls} ${pulse}`} />
            <span className="font-mono text-[11px] text-gray-500">#{String(row.CTIQ_ID ?? row.GDN_NO ?? '—')}</span>
            <span className={`inline-flex items-center px-1.5 py-0 text-[10.5px] font-semibold rounded ${meta.chipCls} border`}>{meta.label}</span>
          </div>
          <div className="mt-0.5 truncate text-[13.5px] font-semibold text-gray-900">{row.CTIQ_NAME || '(이름 없음)'}</div>
        </div>
      </div>

      {/* 압력 */}
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        <Cell label="대기" value={fmtCount(wait)} emphasis={sev === 'danger' || sev === 'warn' || sev === 'alert'} severity={sev} big />
        <Cell label="최장" value={fmtDuration(row.RTS_MAXWAIT_TIME)} emphasis={sev === 'alert' || sev === 'danger'} severity={sev} />
        <Cell label="EWT" value={fmtDuration(row.KPI_EWT_TIME)} severity={sev} />
      </div>

      {/* KPI 진행바 (응대율 / SLA) */}
      <ProgressRow label="응대율" value={toNum(row.KPI_ANSWER_RATE)} />
      <ProgressRow label="SLA" value={toNum(row.KPI_SVCLEVEL)} severity={sev} />

      {/* 처리 */}
      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
        <KV label="인입" value={fmtCount(conn)} />
        <KV label="응대" value={fmtCount(answered)} />
        <KV label="포기" value={fmtCount(row.SUM_ABDN_CNT)} danger={(toNum(row.SUM_ABDN_CNT) ?? 0) > 0 && sev === 'danger'} />
        <KV label="포기율" value={fmtPct(row.KPI_ABANDON_RATIO)} danger={sev === 'danger'} />
        <KV label="평균통화" value={fmtDuration(row.AVG_ANSTALK_TIME)} />
        <KV label="평균대기" value={fmtDuration(row.AVG_ANSWAIT_TIME)} />
      </div>

      {/* 자원 */}
      <div className="mt-2 pt-1.5 border-t border-gray-200 text-[11px] text-gray-600 flex items-center justify-between">
        <span>
          로그인 <span className="font-mono text-gray-900">{login}</span>
        </span>
        <span className="text-gray-400">대기율 {fmtPct(row.KPI_WORKREADY_RATIO)}</span>
      </div>
    </div>
  );
}

function Cell({ label, value, severity, big, emphasis }: { label: string; value: string; severity: CtiqSeverity; big?: boolean; emphasis?: boolean }) {
  const color = emphasis
    ? severity === 'danger'
      ? 'text-red-600'
      : severity === 'alert'
        ? 'text-orange-600'
        : severity === 'warn'
          ? 'text-amber-600'
          : 'text-gray-900'
    : 'text-gray-900';
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`font-mono font-bold leading-tight ${color} ${big ? 'text-[20px]' : 'text-[15px] pt-0.5'}`}>{value}</div>
    </div>
  );
}

function KV({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`font-mono ${danger ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

function ProgressRow({ label, value, severity }: { label: string; value: number | null; severity?: CtiqSeverity }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value * 100));
  const barCls = severity === 'danger' ? 'bg-red-600' : severity === 'alert' ? 'bg-orange-500' : 'bg-emerald-600';
  return (
    <div className="mt-1.5">
      <div className="flex justify-between text-[10.5px] mb-0.5">
        <span className="text-gray-500">{label}</span>
        <span className="font-mono text-gray-900">{value == null ? '—' : `${pct.toFixed(1)}%`}</span>
      </div>
      <div className="h-[5px] bg-gray-100 rounded overflow-hidden">
        <div className={`h-full ${barCls} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 작은카드 — 큐명 + 대기 + SLA 만 노출 (밀도 ↑)
// ═══════════════════════════════════════════════════════════════════

function SmallCard({ row, sev }: { row: CtiqRow; sev: CtiqSeverity }) {
  const meta = SEVERITY_META[sev];
  const pulse = sev === 'danger' ? 'animate-pulse' : '';
  const cardCls = sev === 'danger' ? 'border-red-500' : sev === 'alert' ? 'border-orange-300' : 'border-gray-200';
  const wait = toNum(row.RTS_WAIT_CNT) ?? 0;
  const sla = toNum(row.KPI_SVCLEVEL);
  const slaPct = sla != null ? sla * 100 : null;
  return (
    <div className={`relative bg-white border ${cardCls} rounded-sm p-2`}>
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${meta.barCls}`} />
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full ${meta.dotCls} ${pulse} shrink-0`} />
        <span className="font-mono text-[10px] text-gray-500 shrink-0">#{String(row.CTIQ_ID ?? row.GDN_NO ?? '—')}</span>
        <span className="truncate text-[12px] font-semibold text-gray-900">{row.CTIQ_NAME || '(이름 없음)'}</span>
      </div>
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[9px] uppercase tracking-wide text-gray-500 leading-none">대기</div>
          <div
            className={`font-mono font-bold text-[18px] leading-tight ${sev === 'danger' ? 'text-red-600' : sev === 'alert' ? 'text-orange-600' : sev === 'warn' ? 'text-amber-600' : 'text-gray-900'}`}
          >
            {fmtCount(wait)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-wide text-gray-500 leading-none">SLA</div>
          <div className="font-mono text-[12px] leading-tight text-gray-700">{slaPct == null ? '—' : `${slaPct.toFixed(0)}%`}</div>
        </div>
      </div>
      <div className="mt-1 text-[10px] text-gray-500 flex items-center justify-between">
        <span>
          최장 <span className="font-mono text-gray-700">{fmtDuration(row.RTS_MAXWAIT_TIME)}</span>
        </span>
        <span>
          👤 <span className="font-mono text-gray-700">{toNum(row.RTS_EXP_LOGIN_AGT) ?? 0}</span>
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// KPI 타일 (재사용)
// ═══════════════════════════════════════════════════════════════════

interface KpiTileProps {
  label: string;
  value: string | number;
  mono?: boolean;
  valueColor?: string;
  icon?: React.ReactNode;
  accent?: 'red';
  active?: boolean;
  onClick?: () => void;
}

function KpiTile({ label, value, mono, valueColor, icon, accent, active, onClick }: KpiTileProps) {
  const cls = [
    'flex flex-col items-start gap-1 rounded-md border px-3 py-2 transition-colors',
    onClick ? 'cursor-pointer hover:shadow-sm' : '',
    accent === 'red' ? (active ? 'border-red-500 bg-red-50' : 'border-red-200 bg-white hover:bg-red-50') : 'border-gray-200 bg-white',
  ].join(' ');
  return (
    <div className={cls} onClick={onClick}>
      <div className="flex items-center gap-1 text-[12px] font-semibold uppercase tracking-wide text-gray-600">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-[16px] font-semibold ${mono ? 'font-mono tabular-nums' : ''} ${valueColor ?? 'text-gray-900'}`}>{value}</div>
    </div>
  );
}
