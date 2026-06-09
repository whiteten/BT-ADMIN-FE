import { useMemo } from 'react';
import PanelEChart from './PanelEChart';
import { FONT_FAMILY, PANEL_PALETTE, baseLegend, baseTooltip, koNum } from './echartsPanelTheme';
import { useReportViewStore } from '../../../report/hooks/useReportViewStore';
import type { PanelDetail, PieChartOptions } from '../../../report/types';
import { usePanelData } from '../../hooks/usePanelQueries';

interface PanelPieChartProps {
  panel: PanelDetail;
  reportId: number;
}

export default function PanelPieChart({ panel, reportId }: PanelPieChartProps) {
  const { committedFilter, queryTrigger } = useReportViewStore();

  const sliceField = panel.fieldMap.find((f) => f.slotType === 'SLICE');
  const valueField = panel.fieldMap.find((f) => f.slotType === 'VALUE' || f.slotType === 'Y_AXIS');
  const isDraft = reportId === 0 || panel.panelId < 0;
  const hasMapping = !!sliceField && !!valueField;

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

  const options = (panel.chartOptions ?? {}) as PieChartOptions;
  const isDonut = options.donut ?? true;
  const showLegend = options.legend ?? true;
  const labelType = options.labelType ?? 'percent';
  const showCenterTotal = isDonut && (options.centerTotal ?? true);

  const option = useMemo(() => {
    if (!sliceField || !valueField) return {};
    const raw = (isDraft ? [] : (queryResult?.current ?? [])) as Record<string, unknown>[];
    const data = raw.map((row, i) => ({
      name: String(row[sliceField.fieldName] ?? ''),
      value: Number(row[valueField.fieldName] ?? 0),
      itemStyle: { color: PANEL_PALETTE[i % PANEL_PALETTE.length] },
    }));
    const total = data.reduce((s, d) => s + d.value, 0);

    const labelFormatter = (p: { name: string; value: number; percent: number }) => {
      if (labelType === 'name') return p.name;
      if (labelType === 'value') return koNum(p.value);
      return `${p.name} ${p.percent.toFixed(1)}%`;
    };

    return {
      animationDuration: 700,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'item',
        formatter: (p: { name: string; value: number; percent: number }) => `${p.name}<br/>${koNum(p.value)} (${p.percent.toFixed(1)}%)`,
        ...baseTooltip,
      },
      legend: { ...baseLegend(showLegend), type: 'scroll', orient: 'horizontal' },
      // 도넛 중앙 총합 라벨
      graphic: showCenterTotal
        ? [
            {
              type: 'text',
              left: 'center',
              top: showLegend ? '42%' : '46%',
              style: { text: koNum(total), fontSize: 22, fontWeight: 700, fill: '#1f2937', fontFamily: FONT_FAMILY, textAlign: 'center' },
            },
            {
              type: 'text',
              left: 'center',
              top: showLegend ? '53%' : '57%',
              style: { text: '합계', fontSize: 11, fill: '#98a2b3', fontFamily: FONT_FAMILY, textAlign: 'center' },
            },
          ]
        : undefined,
      series: [
        {
          type: 'pie',
          radius: isDonut ? ['52%', '78%'] : ['0%', '78%'],
          center: ['50%', showLegend ? '46%' : '50%'],
          avoidLabelOverlap: true,
          padAngle: 2,
          itemStyle: { borderColor: '#ffffff', borderWidth: 2, borderRadius: 6 },
          label: { show: true, formatter: labelFormatter, fontSize: 11, color: '#475467', fontFamily: FONT_FAMILY },
          labelLine: { length: 10, length2: 8, lineStyle: { color: '#cbd2dc' } },
          emphasis: { scaleSize: 6, itemStyle: { shadowBlur: 14, shadowColor: 'rgba(16,24,40,0.18)' } },
          data,
        },
      ],
    };
  }, [sliceField, valueField, isDraft, queryResult, isDonut, showLegend, labelType, showCenterTotal]);

  if (!hasMapping) {
    return (
      <div className="flex min-h-[160px] items-center justify-center">
        <p className="text-xs text-[var(--color-bt-fg-muted)]">패널 편집에서 슬라이스·값 필드를 매핑하세요</p>
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

  return <PanelEChart option={option} />;
}
