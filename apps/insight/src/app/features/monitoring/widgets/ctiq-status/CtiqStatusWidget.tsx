import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Input, InputNumber, Radio, Tooltip } from 'antd';
import {
  AlertTriangle,
  Gauge,
  Grid2X2,
  Hourglass,
  LayoutList,
  List as ListIcon,
  PanelTopClose,
  PanelTopOpen,
  Percent,
  PhoneCall,
  PhoneIncoming,
  Search,
  Settings,
} from 'lucide-react';
import { toast } from '@/shared-util';
import { DEMO_CTIQS, isDemoMode } from './demoData';
import { answerRateOf, fmtCount, fmtPct, matchSearch, serviceLevelOf, severityOf, severityWeight, toCtiqRows, toNum } from './helpers';
import CtiqLargeCard from './parts/CtiqLargeCard';
import CtiqSmallCard from './parts/CtiqSmallCard';
import CtiqStatusGrid from './parts/CtiqStatusGrid';
import { SEVERITY_META, SEVERITY_ORDER } from './statusMap';
import {
  type CtiqDensity,
  type CtiqMetricThreshold,
  type CtiqRow,
  type CtiqSeverity,
  type CtiqSortBy,
  type CtiqThresholds,
  type CtiqUiState,
  DEFAULT_CTIQ_THRESHOLDS,
} from './types';
import { widgetToolbarSlotId } from '../../components/canvas/WidgetCardHeader';
import { useGetMediaTypes, useGetWidgetUserSetting, useUpdateWidgetUserSetting, widgetSettingKeys } from '../../hooks/useWidgetSettingQueries';
import NoData from '@/components/custom/NoData';
import { usePersistentState } from '@/libs/shared-ui/src/hooks/usePersistentState';

/**
 * 큐(CTIQ) 상태 모니터 위젯 v2 — AgentStatusWidget 디자인 패턴 차용.
 *
 * 레이아웃:
 *  ┌────────────────────────────────────────────────────────────────┐
 *  │ ① 툴바(Portal) — 검색 · 큰카드/작은카드/목록 · 요약접기 · 설정 │
 *  ├────────────────────────────────────────────────────────────────┤
 *  │ ② KPI 스트립 — [총인입][총응대][응대율][SLA][현재대기][임계]   │  (접기 가능)
 *  ├────────────────────────────────────────────────────────────────┤
 *  │ ③ 시맨틱 칩 + 정렬 — [정상][주의][위험]                        │
 *  ├────────────────────────────────────────────────────────────────┤
 *  │ ④ 본문 — 큰카드 / 작은카드 / ag-Grid 표                        │
 *  └────────────────────────────────────────────────────────────────┘
 *
 * 컴포넌트 분리: parts/CtiqLargeCard, CtiqSmallCard, CtiqStatusGrid (memo + content-visibility).
 * 영속화: usePersistentState — `bt-admin.insight.monitoring.widget.{widgetId}.ui`
 */

export interface CtiqStatusWidgetProps {
  data: unknown;
  options?: Record<string, unknown>;
  widgetId?: number | string;
  /** 설정 변경 시 부모 대시보드 WS 재구독 신호. */
  onRequestPause?: () => void;
}

export default function CtiqStatusWidget({ data, options, widgetId, onRequestPause }: CtiqStatusWidgetProps) {
  const rows = useMemo<CtiqRow[]>(() => (isDemoMode() ? DEMO_CTIQS : toCtiqRows(data)), [data]);

  // ─── 영속 UI 상태 ──────────────────────────────────────────────
  const storageKey = widgetId != null ? `bt-admin.insight.monitoring.widget.${widgetId}.ui` : 'bt-admin.insight.monitoring.widget.ctiq-status.ui';
  const [ui, setUi] = usePersistentState<CtiqUiState>(storageKey, {
    density: (options?.density as CtiqDensity | undefined) ?? 'large',
    activeSeverities: [...SEVERITY_ORDER],
    sortBy: 'severity',
    alertOnly: false,
    summaryCollapsed: false,
  });
  const { density, sortBy, alertOnly, summaryCollapsed } = ui;
  const activeSeverities = useMemo(() => new Set(ui.activeSeverities), [ui.activeSeverities]);

  const setDensity = useCallback((d: CtiqDensity) => setUi((p) => ({ ...p, density: d })), [setUi]);
  const setSortBy = useCallback((s: CtiqSortBy) => setUi((p) => ({ ...p, sortBy: s })), [setUi]);
  const setAlertOnly = useCallback(
    (next: boolean | ((p: boolean) => boolean)) => setUi((p) => ({ ...p, alertOnly: typeof next === 'function' ? (next as (b: boolean) => boolean)(p.alertOnly) : next })),
    [setUi],
  );
  const toggleSummary = useCallback(() => setUi((p) => ({ ...p, summaryCollapsed: !p.summaryCollapsed })), [setUi]);
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

  // ─── 임계값 (옵션 → 기본값 폴백, 지표별 2단) ───────────────────
  const thresholds: CtiqThresholds = useMemo(() => resolveThresholds(options?.thresholds), [options?.thresholds]);

  // ─── 분류 + 필터 + 정렬 ──────────────────────────────────────
  const classified = useMemo(() => rows.map((r) => ({ row: r, sev: severityOf(r, thresholds) })), [rows, thresholds]);

  const sevCounts = useMemo(() => {
    const c: Record<CtiqSeverity, number> = { danger: 0, warn: 0, ok: 0 };
    for (const { sev } of classified) c[sev]++;
    return c;
  }, [classified]);

  const visible = useMemo(() => {
    let f = classified.filter(({ sev }) => activeSeverities.has(sev));
    if (search) f = f.filter(({ row }) => matchSearch(row, search));
    if (alertOnly) f = f.filter(({ sev }) => sev !== 'ok');
    return [...f].sort((a, b) => {
      switch (sortBy) {
        case 'severity':
          return severityWeight(b.sev) - severityWeight(a.sev) || (toNum(b.row.RTS_WAIT_CNT) ?? 0) - (toNum(a.row.RTS_WAIT_CNT) ?? 0);
        case 'wait':
          return (toNum(b.row.RTS_WAIT_CNT) ?? 0) - (toNum(a.row.RTS_WAIT_CNT) ?? 0);
        case 'sla': {
          // 무트래픽(conn=0)은 SLA 평가 의미가 없으므로 1로 취급해 worst-first 정렬 맨뒤로 보냄.
          const sa = (toNum(a.row.SUM_CONN_CNT) ?? 0) > 0 ? serviceLevelOf(a.row) : 1;
          const sb = (toNum(b.row.SUM_CONN_CNT) ?? 0) > 0 ? serviceLevelOf(b.row) : 1;
          return sa - sb;
        }
        case 'answerRate':
          return answerRateOf(b.row) - answerRateOf(a.row);
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
      maxWait = 0,
      ansRate = 0,
      slaNum = 0;
    let alertCnt = 0;
    for (const { row, sev } of classified) {
      conn += toNum(row.SUM_CONN_CNT) ?? 0;
      // 총응대 타일은 SUM_ANSWER_CNT_TOT 유지 (BE 계산 누적값).
      ans += toNum(row.SUM_ANSWER_CNT_TOT) ?? toNum(row.SUM_ANSWER_CNT) ?? 0;
      wait += toNum(row.RTS_WAIT_CNT) ?? 0;
      const mw = toNum(row.RTS_MAXWAIT_TIME) ?? 0;
      if (mw > maxWait) maxWait = mw;
      // 응대율 분자 = 인입큐응답 + 타큐전환응답 + 타센터전환응답 (raw 누적, 분모 = Σ SUM_CONN_CNT)
      ansRate += (toNum(row.SUM_ANSWER_CNT) ?? 0) + (toNum(row.SUM_EXTQ_ANSWER_CNT) ?? 0) + (toNum(row.SUM_NODE_ANSWER_CNT) ?? 0);
      // SLA 분자 = 서비스레벨내응답 + 서비스레벨내포기 (raw 누적, 분모 = Σ SUM_CONN_CNT)
      slaNum += (toNum(row.SUM_SLANSW_CNT) ?? 0) + (toNum(row.SUM_SLABDN_CNT) ?? 0);
      if (sev !== 'ok') alertCnt++;
    }
    const answerRate = conn > 0 ? ansRate / conn : null;
    const slaAvg = conn > 0 ? slaNum / conn : null;
    return { conn, ans, wait, maxWait, answerRate, slaAvg, alertCnt };
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
    setFormMediaType(typeof saved.mediaType === 'number' ? saved.mediaType : null);
    setFormThresholds(resolveThresholds(saved.thresholds));
  }, [settingsOpen, userSetting]);

  // 위험 경계는 주의 경계보다 "더 나쁜 쪽"이어야 함 (SLA 는 낮을수록 나쁨 → danger ≤ warn, 그 외 → danger ≥ warn).
  const thresholdsValid =
    formThresholds.waitCnt.danger >= formThresholds.waitCnt.warn &&
    formThresholds.maxWaitSec.danger >= formThresholds.maxWaitSec.warn &&
    formThresholds.abandonRatioPct.danger >= formThresholds.abandonRatioPct.warn &&
    formThresholds.slaPct.danger <= formThresholds.slaPct.warn;

  const handleSaveSettings = useCallback(() => {
    if (!hasWidgetId) {
      toast.error('위젯 식별자가 없어 저장할 수 없습니다.');
      return;
    }
    saveUserSetting({
      widgetId: numericWidgetId,
      settings: { mediaType: formMediaType ?? 0, thresholds: formThresholds },
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

      {/* 뷰 전환 스위치 그룹 (AgentStatusWidget 패턴 차용) */}
      <div className="flex items-center bg-gray-100 p-0.5 rounded border border-gray-200">
        <Tooltip title="큰 카드" placement="top">
          <span
            onClick={() => setDensity('large')}
            role="button"
            className={`inline-flex w-7 h-7 cursor-pointer items-center justify-center rounded transition-all ${
              density === 'large' ? 'bg-white shadow-sm text-[#405189] font-bold' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Grid2X2 size={15} strokeWidth={2} />
          </span>
        </Tooltip>
        <Tooltip title="작은 카드" placement="top">
          <span
            onClick={() => setDensity('small')}
            role="button"
            className={`inline-flex w-7 h-7 cursor-pointer items-center justify-center rounded transition-all ${
              density === 'small' ? 'bg-white shadow-sm text-[#405189] font-bold' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <LayoutList size={15} strokeWidth={2} />
          </span>
        </Tooltip>
        <Tooltip title="목록" placement="top">
          <span
            onClick={() => setDensity('grid')}
            role="button"
            className={`inline-flex w-7 h-7 cursor-pointer items-center justify-center rounded transition-all ${
              density === 'grid' ? 'bg-white shadow-sm text-[#405189] font-bold' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <ListIcon size={15} strokeWidth={2} />
          </span>
        </Tooltip>
      </div>

      <div className="flex items-center gap-1 ml-1 border-l border-gray-200 pl-2">
        <Tooltip title={summaryCollapsed ? '요약정보 펴기' : '요약정보 접기'} placement="top">
          <span
            onClick={toggleSummary}
            role="button"
            className={`inline-flex w-8 h-8 cursor-pointer items-center justify-center rounded border transition-colors hover:bg-gray-100 ${
              summaryCollapsed ? 'text-[#405189] border-[#405189]' : 'text-gray-400 border-gray-300'
            }`}
          >
            {summaryCollapsed ? <PanelTopOpen size={16} strokeWidth={2} /> : <PanelTopClose size={16} strokeWidth={2} />}
          </span>
        </Tooltip>
        <Tooltip title="설정" placement="top">
          <span
            onClick={handleOpenSettings}
            role="button"
            className="inline-flex w-8 h-8 cursor-pointer items-center justify-center rounded border border-gray-300 text-gray-400 transition-colors hover:bg-gray-100"
          >
            <Settings size={16} />
          </span>
        </Tooltip>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col bg-white overflow-hidden">
      {toolbarSlot ? createPortal(toolbar, toolbarSlot) : <header className="flex items-center justify-end gap-2 border-b border-gray-200 px-4 py-2.5">{toolbar}</header>}

      {/* ② KPI 스트립 (접기 가능 — grid-rows transition) */}
      <div className={`grid transition-all duration-300 ease-in-out ${summaryCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="grid grid-cols-2 gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:grid-cols-3 lg:grid-cols-6">
            <KpiTile label="총 인입" value={fmtCount(stripKpi.conn)} mono icon={<PhoneIncoming className="w-3.5 h-3.5" />} />
            <KpiTile label="총 응대" value={fmtCount(stripKpi.ans)} mono icon={<PhoneCall className="w-3.5 h-3.5" />} />
            <KpiTile label="응대율" value={stripKpi.answerRate != null ? fmtPct(stripKpi.answerRate) : '—'} mono icon={<Percent className="w-3.5 h-3.5" />} />
            <KpiTile
              label="SLA"
              value={stripKpi.slaAvg != null ? fmtPct(stripKpi.slaAvg) : '—'}
              mono
              icon={<Gauge className="w-3.5 h-3.5" />}
              valueColor={
                stripKpi.slaAvg == null
                  ? 'text-gray-900'
                  : stripKpi.slaAvg * 100 < thresholds.slaPct.danger
                    ? 'text-red-600'
                    : stripKpi.slaAvg * 100 < thresholds.slaPct.warn
                      ? 'text-amber-600'
                      : 'text-gray-900'
              }
            />
            <KpiTile
              label="현재 대기"
              value={fmtCount(stripKpi.wait)}
              mono
              icon={<Hourglass className="w-3.5 h-3.5" />}
              valueColor={stripKpi.wait > thresholds.waitCnt.danger ? 'text-red-600' : stripKpi.wait > thresholds.waitCnt.warn ? 'text-amber-600' : 'text-gray-900'}
              accent={stripKpi.wait > thresholds.waitCnt.danger ? 'red' : undefined}
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
        </div>
      </div>

      {/* ③ 시맨틱 칩 + 정렬 */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-200 bg-white px-4 py-2">
        {SEVERITY_ORDER.map((s) => {
          const m = SEVERITY_META[s];
          const active = activeSeverities.has(s);
          return (
            <button
              key={s}
              onClick={() => toggleSeverity(s)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold transition-colors ${
                active ? m.chipCls : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
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

      {/* ④ 본문 — density 별 분기 */}
      <div className="flex-1 min-h-0 overflow-auto">
        {density === 'grid' ? (
          <CtiqStatusGrid classified={visible} />
        ) : visible.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <NoData message="데이터가 없습니다." />
          </div>
        ) : density === 'large' ? (
          <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {visible.map(({ row, sev }) => (
              <CtiqLargeCard key={String(row.CTIQ_ID ?? row.GDN_NO ?? `${row.MEDIA_TYPE}_${row.CTIQ_NAME}`)} row={row} sev={sev} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {visible.map(({ row, sev }) => (
              <CtiqSmallCard key={String(row.CTIQ_ID ?? row.GDN_NO ?? `${row.MEDIA_TYPE}_${row.CTIQ_NAME}`)} row={row} sev={sev} />
            ))}
          </div>
        )}
      </div>

      {/* 설정 드로어 */}
      <Drawer
        title="큐 상태 모니터 설정"
        closable={{ placement: 'end' }}
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
            <Button type="primary" onClick={handleSaveSettings} loading={isSavingSetting} disabled={!hasWidgetId || !thresholdsValid}>
              저장
            </Button>
          </div>
        }
      >
        <div className="flex h-full flex-col gap-4">
          {/* ① 표시 대상 — 무엇을 볼지 (필터) */}
          <section className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
            <div className="text-sm font-semibold text-gray-800">미디어 타입</div>
            <p className="text-[12px] leading-relaxed text-gray-500">이 위젯에 표시할 큐의 미디어 타입을 선택합니다.</p>
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

          {/* ② 상태 판정 기준 — 각 큐 카드를 어떤 상태로 보일지 (지표별 주의/위험 2단) */}
          <section className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3">
            <div className="flex flex-col gap-1">
              <div className="text-sm font-semibold text-gray-800">상태 판정 기준</div>
              <p className="text-[12px] leading-relaxed text-gray-500">
                지표마다 <span className="font-medium text-amber-600">주의</span>·<span className="font-medium text-red-600">위험</span> 경계를 정하면, 각 지표 중{' '}
                <b>가장 나쁜 등급</b>이 큐 카드 상태가 됩니다.
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              <MetricThresholdRow
                label="포기율"
                direction="초과 시"
                addon="%"
                min={0}
                max={100}
                value={formThresholds.abandonRatioPct}
                disabled={isSavingSetting}
                onChange={(v) => setFormThresholds((p) => ({ ...p, abandonRatioPct: v }))}
              />
              <MetricThresholdRow
                label="최장 대기"
                direction="초과 시"
                addon="초"
                min={0}
                max={9999}
                value={formThresholds.maxWaitSec}
                disabled={isSavingSetting}
                onChange={(v) => setFormThresholds((p) => ({ ...p, maxWaitSec: v }))}
              />
              <MetricThresholdRow
                label="대기 콜수"
                direction="초과 시"
                addon="건"
                min={0}
                max={9999}
                value={formThresholds.waitCnt}
                disabled={isSavingSetting}
                onChange={(v) => setFormThresholds((p) => ({ ...p, waitCnt: v }))}
              />
              <MetricThresholdRow
                label="SLA 목표"
                direction="미달 시"
                addon="%"
                min={0}
                max={100}
                value={formThresholds.slaPct}
                disabled={isSavingSetting}
                onChange={(v) => setFormThresholds((p) => ({ ...p, slaPct: v }))}
              />
            </div>
            {!thresholdsValid && <p className="text-[11px] text-red-500">위험 경계는 주의 경계보다 더 위험한 쪽이어야 합니다. (SLA 는 위험이 주의보다 낮게)</p>}
          </section>
        </div>
      </Drawer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// KPI 타일 (메인 위젯 전용 — AgentStatusWidget 의 KpiTile 와 동일 패턴)
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
  const isRed = accent === 'red';
  const cls = [
    'flex flex-col gap-1 rounded-md border px-3 py-2 transition-colors',
    onClick ? 'cursor-pointer hover:shadow-sm' : '',
    isRed ? (active ? 'border-red-500 bg-red-50' : 'border-red-200 bg-white hover:bg-red-50') : 'border-gray-200 bg-white',
  ].join(' ');
  return (
    <div className={cls} onClick={onClick}>
      <div className="flex items-center gap-1 text-[12px] font-semibold uppercase tracking-wide text-gray-600">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-center text-[16px] font-semibold ${mono ? 'font-mono tabular-nums' : ''} ${valueColor ?? 'text-gray-900'}`}>{value}</div>
    </div>
  );
}

// ─── 임계값 옵션 → CtiqThresholds 해석 (지표별 2단, 누락 키는 기본값) ───
function resolveMetric(raw: unknown, def: CtiqMetricThreshold): CtiqMetricThreshold {
  const o = (raw ?? {}) as Partial<CtiqMetricThreshold>;
  return { warn: toNum(o.warn) ?? def.warn, danger: toNum(o.danger) ?? def.danger };
}

function resolveThresholds(raw: unknown): CtiqThresholds {
  const o = (raw ?? {}) as Partial<Record<keyof CtiqThresholds, unknown>>;
  return {
    waitCnt: resolveMetric(o.waitCnt, DEFAULT_CTIQ_THRESHOLDS.waitCnt),
    maxWaitSec: resolveMetric(o.maxWaitSec, DEFAULT_CTIQ_THRESHOLDS.maxWaitSec),
    slaPct: resolveMetric(o.slaPct, DEFAULT_CTIQ_THRESHOLDS.slaPct),
    abandonRatioPct: resolveMetric(o.abandonRatioPct, DEFAULT_CTIQ_THRESHOLDS.abandonRatioPct),
  };
}

// ═══════════════════════════════════════════════════════════════════
// 지표별 임계 입력 — 한 지표의 주의/위험 경계를 나란히. 입력 라벨 색을 그 값이
// 만들어내는 배지(SEVERITY_META)와 동일하게 칠해 "어떤 상태를 정하는지" 연결한다.
// ═══════════════════════════════════════════════════════════════════
interface MetricThresholdRowProps {
  label: string;
  /** 방향 힌트 — "초과 시" / "미달 시" */
  direction: string;
  addon: string;
  min: number;
  max: number;
  value: CtiqMetricThreshold;
  disabled?: boolean;
  onChange: (v: CtiqMetricThreshold) => void;
}

function MetricThresholdRow({ label, direction, addon, min, max, value, disabled, onChange }: MetricThresholdRowProps) {
  const clamp = (v: number | null) => (typeof v === 'number' ? v : min);
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-gray-100 bg-gray-50/60 p-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] font-semibold text-gray-700">{label}</span>
        <span className="text-[11px] text-gray-400">{direction}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${SEVERITY_META.warn.textCls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_META.warn.dotCls}`} />
            주의
          </span>
          <InputNumber
            size="small"
            value={value.warn}
            min={min}
            max={max}
            addonAfter={addon}
            style={{ width: '100%' }}
            disabled={disabled}
            onChange={(v) => onChange({ ...value, warn: clamp(v) })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${SEVERITY_META.danger.textCls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_META.danger.dotCls}`} />
            위험
          </span>
          <InputNumber
            size="small"
            value={value.danger}
            min={min}
            max={max}
            addonAfter={addon}
            style={{ width: '100%' }}
            disabled={disabled}
            onChange={(v) => onChange({ ...value, danger: clamp(v) })}
          />
        </label>
      </div>
    </div>
  );
}
