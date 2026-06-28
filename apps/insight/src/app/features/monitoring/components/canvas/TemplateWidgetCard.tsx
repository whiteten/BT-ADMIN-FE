import { useEffect, useMemo, useState } from 'react';
import WidgetCardHeader from './WidgetCardHeader';
import { useGetMonitoringDataset } from '../../hooks/useDatasetQueries';
import { generateMockRows } from '../../mocks/mockWidgetData';
import type { KpiDirection, TemplateWidget, VizType } from '../../types';
import WidgetBarChart from '../widget/WidgetBarChart';
import WidgetGrid from '../widget/WidgetGrid';
import WidgetKpiCard from '../widget/WidgetKpiCard';
import WidgetLineChart from '../widget/WidgetLineChart';
import WidgetPieChart from '../widget/WidgetPieChart';

interface TemplateWidgetCardProps {
  widget: TemplateWidget;
  editMode: boolean;
  onDelete?: () => void;
  draggableClass?: string;
}

export default function TemplateWidgetCard({ widget, editMode, onDelete, draggableClass }: TemplateWidgetCardProps) {
  const [currentViz, setCurrentViz] = useState<VizType>(widget.defaultViz);
  const [jitter, setJitter] = useState(0.5);

  const { data: detail } = useGetMonitoringDataset({ params: { datasetId: widget.datasetId }, queryOptions: { enabled: !!widget.datasetId, retry: false } });

  // 실시간 갱신 시뮬레이션
  useEffect(() => {
    const interval = widget.refreshInterval > 0 ? widget.refreshInterval : 3;
    const id = setInterval(() => setJitter(Math.random()), interval * 1000);
    return () => clearInterval(id);
  }, [widget.refreshInterval]);

  const rows = useMemo(() => generateMockRows(detail, jitter), [detail, jitter]);

  if (!detail) {
    return (
      <div className="flex flex-col h-full bg-white rounded shadow-sm border border-[var(--color-bt-border)]">
        <WidgetCardHeader widget={widget} editMode={editMode} onDelete={onDelete} draggableClass={draggableClass} />
        <div className="flex-1 flex items-center justify-center text-[12px] text-[var(--color-bt-fg-muted)]">데이터셋 로딩 중…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded shadow-sm border border-[var(--color-bt-border)] overflow-hidden">
      <WidgetCardHeader widget={widget} currentViz={currentViz} onChangeViz={setCurrentViz} editMode={editMode} onDelete={onDelete} draggableClass={draggableClass} />
      <div className="flex-1 overflow-hidden">
        {currentViz === 'GRID' && <WidgetGrid detail={detail} columns={widget.mapping.GRID?.columns ?? []} groupBy={widget.mapping.GRID?.groupBy} rows={rows} />}
        {currentViz === 'BAR' && <WidgetBarChart detail={detail} x={widget.mapping.BAR?.x ?? ''} y={widget.mapping.BAR?.y ?? []} rows={rows} />}
        {currentViz === 'LINE' && <WidgetLineChart detail={detail} x={widget.mapping.LINE?.x ?? ''} y={widget.mapping.LINE?.y ?? []} rows={rows} />}
        {currentViz === 'CARD' && (
          <WidgetKpiCard
            detail={detail}
            measure={widget.mapping.CARD?.measure ?? ''}
            unit={widget.mapping.CARD?.unit}
            kpiDirection={(widget.mapping.CARD?.kpiDirection ?? 'NEUTRAL') as KpiDirection}
            threshold={widget.mapping.CARD?.threshold}
            rows={rows}
          />
        )}
        {currentViz === 'PIE' && (
          <WidgetPieChart
            detail={detail}
            dimension={widget.mapping.PIE?.dimension ?? ''}
            measure={widget.mapping.PIE?.measure ?? ''}
            donut={widget.mapping.PIE?.donut}
            rows={rows}
          />
        )}
      </div>
    </div>
  );
}
