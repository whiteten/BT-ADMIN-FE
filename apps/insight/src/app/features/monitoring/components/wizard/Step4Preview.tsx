import { useState } from 'react';
import { Input, Segmented } from 'antd';
import type { Step2FieldOverride } from './Step2DatasetConfig';
import { VIZ_ICON, VIZ_LABELS } from '../../constants/monitoringConstants';
import { useGetMonitoringDataset } from '../../hooks/useDatasetQueries';
import type { KpiDirection, TemplateWidgetMapping, VizType, WidgetCategory } from '../../types';
import { CATEGORY_PRESET } from '../../utils/autoPackPosition';
import WidgetSizePicker from '../WidgetSizePicker';
import WidgetBarChart from '../widget/WidgetBarChart';
import WidgetGrid from '../widget/WidgetGrid';
import WidgetKpiCard from '../widget/WidgetKpiCard';
import WidgetLineChart from '../widget/WidgetLineChart';
import WidgetPieChart from '../widget/WidgetPieChart';

/** 기본 시각화 → 추천 크기 산출용 카테고리. */
const VIZ_CATEGORY: Record<VizType, WidgetCategory> = { GRID: 'TABLE', BAR: 'CHART', LINE: 'CHART', CARD: 'KPI', PIE: 'CHART' };
/** 템플릿 위젯 최소 크기 (DashboardCanvas 와 동일). */
const TEMPLATE_MIN = { w: 2, h: 2 };
/** 미리보기는 설정 구조만 보여준다 — 데이터는 표시하지 않음(통계 보고서와 동일). */
const EMPTY_ROWS: Record<string, unknown>[] = [];

interface Step4Props {
  datasetId: number;
  fieldOverrides: Record<string, Step2FieldOverride>;
  visualizations: VizType[];
  defaultViz: VizType;
  mapping: TemplateWidgetMapping;
  widgetName: string;
  refreshInterval: number;
  layoutW?: number;
  layoutH?: number;
  onChange: (patch: { widgetName?: string; refreshInterval?: number; layoutW?: number; layoutH?: number }) => void;
}

export default function Step4Preview({ datasetId, fieldOverrides, visualizations, defaultViz, mapping, widgetName, refreshInterval, layoutW, layoutH, onChange }: Step4Props) {
  const { data: detail } = useGetMonitoringDataset({ params: { datasetId }, queryOptions: { enabled: !!datasetId, retry: false } });

  // 현재 활성 시각화 (사용자가 토글 가능)
  const [currentViz, setCurrentViz] = useState<VizType>(defaultViz);

  if (!detail) {
    return (
      <div className="flex items-center justify-center flex-1">
        <p className="text-[14px] text-[var(--color-bt-fg-muted)]">데이터셋이 없습니다.</p>
      </div>
    );
  }

  const displayName = widgetName.trim() || detail.datasetName;
  // 기본 시각화 기준 추천 배치 크기.
  const rec = CATEGORY_PRESET[VIZ_CATEGORY[defaultViz]];

  return (
    <div className="flex flex-1 overflow-hidden bg-[var(--color-bt-bg-canvas)]">
      {/* 좌측: 위젯 미리보기 */}
      <div className="flex-1 flex flex-col overflow-hidden p-7">
        <div className="rounded border border-[var(--color-bt-border)] bg-white shadow-sm flex flex-col overflow-hidden" style={{ minHeight: 420 }}>
          {/* 위젯 헤더 */}
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[13px] font-semibold truncate">{displayName}</span>
              <span className="shrink-0 rounded bg-[var(--color-bt-primary-soft)] px-1.5 py-0.5 mono text-[10px] font-bold text-[var(--color-bt-primary)]">{currentViz}</span>
              <span className="shrink-0 rounded bg-[var(--color-bt-primary)] px-1 py-0.5 text-[9px] font-bold text-white" title="템플릿 위젯">
                템플릿
              </span>
            </div>

            {/* 시각화 토글 (★ 가능한 시각화만) */}
            <div className="flex items-center gap-1">
              {(['GRID', 'BAR', 'LINE', 'CARD', 'PIE'] as VizType[]).map((v) => {
                const enabled = visualizations.includes(v);
                if (!enabled) return null;
                const active = currentViz === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setCurrentViz(v)}
                    title={`${v} · ${VIZ_LABELS[v]}${v === defaultViz ? ' (★ 기본)' : ''}`}
                    className={`relative inline-flex h-7 w-7 items-center justify-center rounded mono text-[14px] transition-colors ${
                      active ? 'bg-[var(--color-bt-primary)] text-white' : 'text-[var(--color-bt-fg-muted)] hover:bg-[var(--color-bt-bg-muted)] hover:text-[var(--color-bt-fg)]'
                    }`}
                  >
                    {VIZ_ICON[v]}
                    {v === defaultViz && <span className="absolute -top-1 -right-1 text-[8px] text-[var(--color-bt-warn)]">★</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 위젯 본문 */}
          <div className="flex-1 overflow-hidden">
            {currentViz === 'GRID' && (
              <WidgetGrid detail={detail} columns={mapping.GRID?.columns ?? []} groupBy={mapping.GRID?.groupBy} rows={EMPTY_ROWS} options={mapping.GRID?.options} />
            )}
            {currentViz === 'BAR' && <WidgetBarChart detail={detail} x={mapping.BAR?.x ?? ''} y={mapping.BAR?.y ?? []} rows={EMPTY_ROWS} options={mapping.BAR?.options} />}
            {currentViz === 'LINE' && <WidgetLineChart detail={detail} x={mapping.LINE?.x ?? ''} y={mapping.LINE?.y ?? []} rows={EMPTY_ROWS} options={mapping.LINE?.options} />}
            {currentViz === 'CARD' && (
              <WidgetKpiCard
                detail={detail}
                measure={mapping.CARD?.measure ?? ''}
                unit={mapping.CARD?.unit}
                kpiDirection={(mapping.CARD?.kpiDirection ?? 'NEUTRAL') as KpiDirection}
                threshold={mapping.CARD?.threshold}
                rows={EMPTY_ROWS}
              />
            )}
            {currentViz === 'PIE' && (
              <WidgetPieChart
                detail={detail}
                dimension={mapping.PIE?.dimension ?? ''}
                measure={mapping.PIE?.measure ?? ''}
                donut={mapping.PIE?.donut}
                rows={EMPTY_ROWS}
                options={mapping.PIE?.options}
              />
            )}
          </div>
        </div>

        {/* 안내 */}
        <div className="mt-3 rounded border-l-4 border-l-[var(--color-bt-primary)] bg-[var(--color-bt-primary-soft)]/30 px-4 py-2 text-[11px] leading-relaxed">
          위 헤더의 <span className="mono">▦▮╱▢</span> 아이콘으로 시각화 구성을 전환해 확인할 수 있습니다. 미리보기에는 데이터를 표시하지 않으며, 실제 데이터는 대시보드에서
          표시됩니다. ★ 기본 시각화는 위젯이 처음 표시될 때 사용됩니다.
        </div>
      </div>

      {/* 우측: 옵션 패널 */}
      <aside className="w-[340px] shrink-0 border-l border-[var(--color-bt-border)] bg-white overflow-y-auto">
        <div className="px-5 py-4 space-y-5">
          {/* 위젯명 */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">
              위젯명 <span className="text-[var(--color-bt-danger)]">*</span>
            </label>
            <Input value={widgetName} onChange={(e) => onChange({ widgetName: e.target.value })} placeholder={`기본: ${detail.datasetName}`} maxLength={120} size="middle" />
            <p className="mt-1 text-[10px] text-[var(--color-bt-fg-muted)]">같은 데이터셋이라도 위젯마다 다른 표시명 가능 (M9)</p>
          </div>

          {/* 갱신 간격 */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">갱신 간격 (위젯 단)</label>
            <Segmented
              value={refreshInterval}
              onChange={(v) => onChange({ refreshInterval: Number(v) })}
              options={[
                { value: 1, label: '1초' },
                { value: 3, label: '3초' },
                { value: 5, label: '5초' },
                { value: 10, label: '10초' },
              ]}
              block
            />
            <p className="mt-1 text-[10px] text-[var(--color-bt-fg-muted)] leading-snug">글로벌 옵션이 더 짧으면 글로벌이 우선 (M7). 일시정지는 사용자 뷰 모드에서.</p>
          </div>

          {/* 캔버스 배치 크기 */}
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">캔버스 배치 크기</label>
            <WidgetSizePicker
              minW={TEMPLATE_MIN.w}
              minH={TEMPLATE_MIN.h}
              recommendedW={rec.w}
              recommendedH={rec.h}
              value={layoutW && layoutH ? { w: layoutW, h: layoutH } : undefined}
              onPick={(w, h) => onChange({ layoutW: w, layoutH: h })}
            />
          </div>

          {/* 위젯 요약 */}
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">위젯 요약</div>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-start gap-2">
                <span className="w-16 shrink-0 text-[var(--color-bt-fg-muted)]">데이터셋</span>
                <div className="flex-1">
                  <div className="font-medium">{detail.datasetName}</div>
                  <div className="mono text-[10px] text-[var(--color-bt-fg-muted)]">{detail.datasetCode}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[var(--color-bt-fg-muted)]">시각화</span>
                <div className="flex-1 flex flex-wrap items-center gap-1">
                  {visualizations.map((v) => (
                    <span
                      key={v}
                      className={`mono text-[10px] rounded px-1.5 py-0.5 font-bold ${
                        v === defaultViz ? 'bg-[var(--color-bt-primary)] text-white' : 'bg-[var(--color-bt-bg-muted)] text-[var(--color-bt-fg-muted)]'
                      }`}
                    >
                      {VIZ_ICON[v]} {v}
                      {v === defaultViz && ' ★'}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[var(--color-bt-fg-muted)]">노출 필드</span>
                <span className="flex-1 mono text-[var(--color-bt-fg)]">{Object.values(fieldOverrides).filter((o) => o?.isVisible).length}개</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[var(--color-bt-fg-muted)]">갱신주기</span>
                <span className="flex-1 mono text-[var(--color-bt-fg)]">{refreshInterval}초</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[var(--color-bt-fg-muted)]">배치 크기</span>
                <span className="flex-1 mono text-[var(--color-bt-fg)]">
                  {layoutW ?? rec.w}×{layoutH ?? rec.h} 칸
                </span>
              </div>
            </div>
          </div>

          <div className="rounded border border-[var(--color-bt-success)]/30 bg-[var(--color-bt-success-soft)]/30 px-3 py-2 text-[10.5px] leading-relaxed">
            ✓ 모든 단계 완료. <strong>위젯 저장</strong>을 누르면 캔버스에 추가됩니다.
          </div>
        </div>
      </aside>
    </div>
  );
}
