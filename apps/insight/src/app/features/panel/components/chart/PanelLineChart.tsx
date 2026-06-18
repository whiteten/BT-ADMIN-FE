import { useMemo } from 'react';
import PanelEChart from './PanelEChart';
import { PANEL_PALETTE, areaGradient, axisLabelStyle, baseGrid, baseLegend, baseTooltip, goalMarkLine, paletteAt, splitLineStyle } from './echartsPanelTheme';
import { formatCell } from '../../../../utils/columnFormat';
import { enumerateTimeKeys, formatTimeKey, isTimeKey } from '../../../../utils/timeKeyFormat';
import { useGetDataSourceFields } from '../../../dataset/hooks/useDatasetQueries';
import { useReportViewStore } from '../../../report/hooks/useReportViewStore';
import type { ColumnFormat, LineChartOptions, PanelDetail } from '../../../report/types';
import type { EffectiveFormat } from '../../api/panelApi';
import { usePanelData } from '../../hooks/usePanelQueries';

interface PanelLineChartProps {
  panel: PanelDetail;
  reportId: number;
}

export default function PanelLineChart({ panel, reportId }: PanelLineChartProps) {
  const { committedFilter, queryTrigger } = useReportViewStore();

  // 데이터셋 표시명 — 범례/툴팁 라벨을 fieldName 대신 displayName 으로 (패널별 데이터셋)
  const { data: fields = [] } = useGetDataSourceFields({
    params: { datasetId: panel.datasetId ?? 0 },
    queryOptions: { enabled: !!panel.datasetId },
  });
  const displayNameMap = useMemo(() => new Map(fields.map((f) => [f.fieldName, f.displayName])), [fields]);

  const xField = panel.fieldMap.find((f) => f.slotType === 'X_AXIS');
  const yFields = panel.fieldMap.filter((f) => f.slotType === 'Y_AXIS');
  const isDraft = reportId === 0 || panel.panelId < 0;
  const hasMapping = !!xField && yFields.length > 0;

  const { data: queryResult, isFetching } = usePanelData({
    params: {
      reportId,
      panelId: panel.panelId,
      period: { from: committedFilter.period.from, to: committedFilter.period.to, unit: committedFilter.timeUnit },
      searchValues: committedFilter.searchValues,
      comparison: committedFilter.comparison,
      conditions: committedFilter.conditions,
    },
    queryTrigger,
    queryOptions: { enabled: !isDraft && hasMapping && queryTrigger > 0 },
  });

  const options = (panel.chartOptions ?? {}) as LineChartOptions;
  const showDataLabel = options.dataLabel ?? false;
  const goalLine = options.goalLine;
  // 시리즈 슬롯(그룹 분리 디멘션) — 있으면 그 값별로 라인 분리
  const seriesField = panel.fieldMap.find((f) => f.slotType === 'SERIES');
  // Top N(LIMIT 슬롯) — BE 후처리(시간축 제외 디멘션 그룹별 상위 N)가 누락된 경계 대비.
  // BE 가 이미 상위 N 시리즈만 내려주면(시리즈 ≤ N) FE 는 무동작 → 중복/오작동 없음.
  const limitField = panel.fieldMap.find((f) => f.slotType === 'LIMIT');

  const option = useMemo(() => {
    if (!xField) return {};
    const dn = (name: string) => displayNameMap.get(name) ?? name;
    const data = (isDraft ? [] : (queryResult?.current ?? [])) as Record<string, unknown>[];
    const fmtMap = new Map((queryResult?.columns ?? []).map((c) => [c.name, c.format]));
    const xName = xField.fieldName;
    const rawOf = (row: Record<string, unknown>) => String(row[xName] ?? '');

    // ── X축 카테고리(원본 키): 기간 전체를 빈 구간 없이 채운다 ──
    // BE 는 데이터 있는 구간만 row 로 내려주므로, 시간축이면 기간 기준으로 축을 열거하고
    // 데이터 distinct 키를 병합(안전망)한다. 비시간축은 등장 순서로 중복만 제거.
    const timeAxis = data.length > 0 && data.every((r) => isTimeKey(rawOf(r)));
    let catKeys: string[];
    const enumerated = timeAxis ? enumerateTimeKeys(committedFilter.period.from, committedFilter.period.to, committedFilter.timeUnit, committedFilter.conditions) : null;
    if (enumerated) {
      const set = new Set(enumerated);
      for (const r of data) {
        const k = rawOf(r);
        if (k) set.add(k);
      }
      catKeys = [...set].sort();
    } else if (timeAxis) {
      catKeys = [...new Set(data.map(rawOf))].sort();
    } else {
      catKeys = [...new Set(data.map(rawOf))];
    }
    const categories = catKeys.map((k) => formatTimeKey(k));

    // 공통 라인 시리즈 스타일 빌더
    const makeLine = (name: string, i: number, values: number[], single: boolean, format: ColumnFormat | undefined, eff: EffectiveFormat | undefined) => {
      const color = paletteAt(i);
      return {
        type: 'line',
        name,
        smooth: true,
        showSymbol: false,
        symbolSize: 7,
        lineStyle: { width: 2.5, color },
        itemStyle: { color },
        // 단일 라인일 때만 하단 면적 채움(다중이면 겹쳐서 지저분)
        areaStyle: single ? { color: areaGradient(color) } : undefined,
        emphasis: { focus: 'series' as const },
        label: showDataLabel
          ? { show: true, position: 'top', fontSize: 10, color: '#475467', formatter: (p: { value: number }) => formatCell(Number(p.value ?? 0), eff, format) }
          : { show: false },
        // 툴팁 값도 컬럼 서식 적용
        tooltip: { valueFormatter: (v: unknown) => formatCell(v, eff, format) },
        markLine: goalLine?.enabled && goalLine.value != null ? goalMarkLine(goalLine.value) : undefined,
        data: values,
      };
    };

    let series;
    let lineCount: number;
    if (seriesField) {
      // SERIES 디멘션 값별 라인 분리(측정값은 첫 Y 필드). 빈 슬롯은 0.
      const sName = seriesField.fieldName;
      const measure = yFields[0];
      const order: string[] = [];
      const bySeries = new Map<string, Map<string, number>>();
      for (const row of data) {
        const sv = String(row[sName] ?? '');
        let m = bySeries.get(sv);
        if (!m) {
          m = new Map();
          bySeries.set(sv, m);
          order.push(sv);
        }
        m.set(rawOf(row), (m.get(rawOf(row)) ?? 0) + Number(row[measure.fieldName] ?? 0));
      }
      // 상위 N 시리즈 제한 — 정렬기준 측정값(LIMIT.fieldName, 없으면 첫 Y) 합 기준.
      let keptOrder = order;
      if (limitField?.topN && order.length > limitField.topN) {
        const sortFld = limitField.fieldName || measure?.fieldName;
        const totals = new Map<string, number>();
        for (const row of data) totals.set(String(row[sName] ?? ''), (totals.get(String(row[sName] ?? '')) ?? 0) + Number(row[sortFld as string] ?? 0));
        const dir = limitField.sortDirection === 'ASC' ? 1 : -1;
        keptOrder = [...order].sort((a, b) => dir * ((totals.get(a) ?? 0) - (totals.get(b) ?? 0))).slice(0, limitField.topN);
      }
      lineCount = keptOrder.length;
      series = keptOrder.map((sv, i) => {
        const m = bySeries.get(sv)!;
        return makeLine(
          sv || '(미지정)',
          i,
          catKeys.map((k) => m.get(k) ?? 0),
          lineCount === 1,
          measure?.columnFormat,
          measure ? fmtMap.get(measure.fieldName) : undefined,
        );
      });
    } else {
      // 시리즈 없음: Y 필드별 라인. 동일 키 중복은 합산, 빈 슬롯은 0.
      const byKey = new Map<string, Record<string, number>>();
      for (const row of data) {
        const k = rawOf(row);
        const cur = byKey.get(k) ?? {};
        for (const f of yFields) cur[f.fieldName] = (cur[f.fieldName] ?? 0) + Number(row[f.fieldName] ?? 0);
        byKey.set(k, cur);
      }
      lineCount = yFields.length;
      series = yFields.map((f, i) =>
        makeLine(
          dn(f.fieldName),
          i,
          catKeys.map((k) => byKey.get(k)?.[f.fieldName] ?? 0),
          lineCount === 1,
          f.columnFormat,
          fmtMap.get(f.fieldName),
        ),
      );
    }

    const legendOn = options.legend ?? lineCount > 1;
    // boundaryGap:false 라 마지막 점이 grid 오른쪽 경계에 붙고, X축 마지막 일자 라벨은 가운데 정렬돼
    // 오른쪽 절반이 grid 밖으로 잘린다. 마지막 라벨 절반폭(≈글자수×6.2px/2)만큼 right 여백을 확보한다.
    const lastLabel = categories[categories.length - 1] ?? '';
    const rightPad = Math.min(60, Math.max(16, Math.ceil((lastLabel.length * 6.2) / 2) + 8));
    return {
      animationDuration: 600,
      animationEasing: 'cubicOut',
      color: [...PANEL_PALETTE],
      grid: { ...baseGrid(legendOn), right: rightPad },
      tooltip: { trigger: 'axis', ...baseTooltip },
      legend: baseLegend(legendOn),
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: categories,
        axisLabel: axisLabelStyle,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e4e7ec' } },
      },
      yAxis: { type: 'value', axisLabel: axisLabelStyle, splitLine: splitLineStyle },
      series,
    };
  }, [xField, yFields, seriesField, limitField, isDraft, queryResult, committedFilter, options.legend, showDataLabel, goalLine, displayNameMap]);

  if (!hasMapping) {
    return (
      <div className="flex min-h-[160px] items-center justify-center">
        <p className="text-xs text-[var(--color-bt-fg-muted)]">패널 편집에서 X축·Y축 필드를 매핑하세요</p>
      </div>
    );
  }

  if (!isDraft && isFetching) {
    return (
      <div className="flex min-h-[160px] items-center justify-center">
        <p className="text-xs text-[var(--color-bt-fg-muted)]">데이터 조회 중…</p>
      </div>
    );
  }

  return <PanelEChart option={option} panelId={panel.panelId} />;
}
