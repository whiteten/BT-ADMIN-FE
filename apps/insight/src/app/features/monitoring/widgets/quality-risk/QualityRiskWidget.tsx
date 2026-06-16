import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Input } from 'antd';
import { Search } from 'lucide-react';
import { DIST_ROWS, DONUT_R, OK_COLOR, dnStatusLabel, donutArcs, isAlertLevel, matchItem, toQualityData } from './helpers';
import type { QualityRiskData } from './types';
import { widgetToolbarSlotId } from '../../components/canvas/WidgetCardHeader';
import { MOS_META } from '../agent-status/parts/MosLegend';
import type { CustomWidgetComponentProps } from '../registry';
import NoData from '@/components/custom/NoData';
import { usePersistentState } from '@/libs/shared-ui/src/hooks/usePersistentState';

/**
 * 통화 품질 위험판 위젯 — 시안 `04-quality-risk.html` 의 TO-BE (비교/품질추이 컬럼 제외).
 *
 * "지금 품질 나쁜 자리(내선)는? 누가 쓰나?".
 *  ZONE A: 평균 MoS 도넛(위험/주의/정상) + MoS 6단계 분포 막대.
 *  ZONE B: 나쁜 자리 Top-N(MoS 낮은순·통화중) — 내선 / 상담사 / MoS / 상태.
 *
 * MoS 등급·색은 agent-status 의 `MOS_META`(레거시 ieExtDnStatus.jsp getMosClass 기반)를 재사용한다.
 */
interface QualityUiState {
  alertOnly: boolean;
}

export default function QualityRiskWidget({ data, widgetId }: CustomWidgetComponentProps) {
  const d = useMemo<QualityRiskData>(() => toQualityData(data), [data]);

  const storageKey = widgetId != null ? `bt-admin.insight.monitoring.widget.${widgetId}.ui` : 'bt-admin.insight.monitoring.widget.quality-risk.ui';
  const [ui, setUi] = usePersistentState<QualityUiState>(storageKey, { alertOnly: true });
  const { alertOnly } = ui;
  const setAlertOnly = useCallback((v: boolean) => setUi((p) => ({ ...p, alertOnly: v })), [setUi]);

  const [search, setSearch] = useState('');

  const visibleItems = useMemo(() => {
    let f = d.items;
    if (alertOnly) f = f.filter((it) => isAlertLevel(it.level));
    if (search.trim()) f = f.filter((it) => matchItem(it, search));
    return f;
  }, [d.items, alertOnly, search]);

  const arcs = useMemo(() => donutArcs(d.summary.riskCnt, d.summary.warnCnt, d.summary.okCnt), [d.summary]);
  const distTotal = useMemo(() => DIST_ROWS.reduce((sum, r) => sum + d.dist[r.key], 0), [d.dist]);

  const avgMos = d.summary.avgMos;
  const avgColor = avgMos == null ? 'text-gray-400' : avgMos < 3.0 ? 'text-red-600' : avgMos < 3.5 ? 'text-amber-600' : 'text-emerald-600';

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
        placeholder="내선·이름 검색"
        prefix={<Search className="h-4 w-4 text-gray-400" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: 200, height: 32 }}
      />
      <button
        type="button"
        onClick={() => setAlertOnly(!alertOnly)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
          alertOnly ? 'border-bt-primary bg-bt-primary-soft text-bt-primary' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
        }`}
      >
        알람만 {alertOnly ? '●ON' : '○OFF'}
      </button>
    </div>
  );

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto bg-white p-4">
      {toolbarSlot ? createPortal(toolbar, toolbarSlot) : <header className="flex items-center justify-end gap-2">{toolbar}</header>}

      {/* ═══ ZONE A · MoS 분포 요약 ═══ */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        {/* 평균 MoS 도넛 */}
        <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-5">
          <div className="self-start text-[12px] font-bold uppercase tracking-wide text-gray-500">전체 평균 MoS</div>
          <div className="relative mt-2">
            <svg viewBox="0 0 130 130" className="h-[140px] w-[140px] -rotate-90">
              <circle cx={65} cy={65} r={DONUT_R} fill="none" stroke="#eef1f6" strokeWidth={15} />
              {arcs.map((a) => (
                <circle key={a.color} cx={65} cy={65} r={DONUT_R} fill="none" stroke={a.color} strokeWidth={15} strokeDasharray={a.dash} strokeDashoffset={a.offset} />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-[32px] font-extrabold leading-none tabular-nums ${avgColor}`}>{avgMos != null ? avgMos.toFixed(2) : '—'}</span>
              <span className="mt-0.5 text-[11px] text-gray-500">통화중 {d.summary.busyCnt}석</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#ef4444' }} />
              위험 {d.summary.riskCnt}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#f59e0b' }} />
              주의 {d.summary.warnCnt}
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-bt-success">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: OK_COLOR }} />
              정상 {d.summary.okCnt}
            </span>
          </div>
        </div>

        {/* MoS 6단계 분포 막대 */}
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-[14px] font-bold">
            MoS 등급 분포 <span className="text-[12px] font-normal text-gray-500">· 통화중 내선</span>
          </h2>
          <div className="flex flex-col gap-2.5">
            {DIST_ROWS.map(({ key, level }) => {
              const meta = MOS_META[level];
              const count = d.dist[key];
              const pct = distTotal > 0 ? (count / distTotal) * 100 : 0;
              const muted = !isAlertLevel(level); // 좋음·보통·미사용은 회색
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className={`w-20 shrink-0 text-[12px] ${muted ? 'text-gray-500' : 'font-semibold'}`} style={muted ? undefined : { color: meta.hex }}>
                    {meta.label}
                  </span>
                  <div className="h-5 flex-1 overflow-hidden rounded bg-gray-100">
                    <div className="h-full rounded" style={{ width: `${pct}%`, background: muted ? '#cdd2d9' : meta.hex }} />
                  </div>
                  <span className={`w-10 text-right text-[13px] font-bold tabular-nums ${muted ? 'text-gray-500' : ''}`} style={muted ? undefined : { color: meta.hex }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ ZONE B · 나쁜 자리 Top-N ═══ */}
      <section className="flex flex-col rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-3.5">
          <h2 className="text-[14px] font-bold">
            나쁜 자리 Top-N <span className="text-[12px] font-normal text-gray-500">· MoS 낮은순 · 통화중</span>
          </h2>
          <span className="ml-auto text-[11px] text-gray-500">표시 {visibleItems.length}석</span>
        </div>

        {visibleItems.length === 0 ? (
          <div className="px-5 py-10">
            <NoData message={alertOnly ? '위험·주의 자리가 없습니다.' : '통화중 품질 데이터가 없습니다.'} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[90px_1fr_70px_110px] gap-2 bg-gray-50 px-5 py-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">
              <span>내선</span>
              <span>상담사</span>
              <span className="text-center">MoS</span>
              <span>상태</span>
            </div>
            <div className="flex flex-col">
              {visibleItems.map((it, i) => {
                const meta = MOS_META[it.level];
                const busy = it.dnStatus === 1 || it.dnStatus === 2;
                return (
                  <div
                    key={it.dn ?? `idx_${i}`}
                    className="grid grid-cols-[90px_1fr_70px_110px] items-center gap-2 border-l-4 px-5 py-3 hover:bg-gray-50"
                    style={{ borderLeftColor: meta.hex }}
                  >
                    <span className="font-bold tabular-nums">{it.dn ?? '—'}</span>
                    <span>{it.agentName != null ? <span className="font-bold">{it.agentName}</span> : <span className="text-[12px] italic text-gray-400">(미로그인)</span>}</span>
                    <span className="text-center">
                      <span
                        className="inline-flex h-7 w-12 items-center justify-center rounded-full text-[14px] font-extrabold tabular-nums text-white"
                        style={{ background: meta.hex }}
                      >
                        {it.mos != null ? it.mos.toFixed(1) : '—'}
                      </span>
                    </span>
                    <span className="text-[12px]">
                      {busy ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-bt-primary" />
                          통화중 {dnStatusLabel(it.dnStatus)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
