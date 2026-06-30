import { useState } from 'react';
import WidgetCardHeader from './WidgetCardHeader';
import { useGetMonitoringDataset } from '../../hooks/useDatasetQueries';
import type { KpiDirection, TemplateWidget, VizType } from '../../types';
import WidgetBarChart from '../widget/WidgetBarChart';
import WidgetGrid from '../widget/WidgetGrid';
import WidgetKpiCard from '../widget/WidgetKpiCard';
import WidgetLineChart from '../widget/WidgetLineChart';
import WidgetPieChart from '../widget/WidgetPieChart';

interface TemplateWidgetCardProps {
  widget: TemplateWidget;
  editMode: boolean;
  /** WebSocket DATA 프레임의 행 배열(키=데이터셋 fieldName). 첫 프레임 도착 전엔 undefined. */
  data?: unknown;
  onDelete?: () => void;
  draggableClass?: string;
}

export default function TemplateWidgetCard({ widget, editMode, data, onDelete, draggableClass }: TemplateWidgetCardProps) {
  const [currentViz, setCurrentViz] = useState<VizType>(widget.defaultViz);

  // 데이터셋 정의(스키마)는 컬럼 메타용으로만 사용. 행은 WS 실데이터.
  const { data: detail } = useGetMonitoringDataset({ params: { datasetId: widget.datasetId }, queryOptions: { enabled: !!widget.datasetId, retry: false } });

  // WS 실데이터 행. 첫 프레임 전(undefined)에는 로딩 표시, 빈 배열이면 빈 그리드/차트로 정상 렌더.
  const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : undefined;

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
        {rows === undefined ? (
          <div className="h-full flex items-center justify-center text-[12px] text-[var(--color-bt-fg-muted)]">데이터 로딩 중…</div>
        ) : (
          <>
            {currentViz === 'GRID' && (
              <WidgetGrid detail={detail} columns={widget.mapping.GRID?.columns ?? []} groupBy={widget.mapping.GRID?.groupBy} rows={rows} options={widget.mapping.GRID?.options} />
            )}
            {currentViz === 'BAR' && (
              <WidgetBarChart detail={detail} x={widget.mapping.BAR?.x ?? ''} y={widget.mapping.BAR?.y ?? []} rows={rows} options={widget.mapping.BAR?.options} />
            )}
            {currentViz === 'LINE' && (
              <WidgetLineChart detail={detail} x={widget.mapping.LINE?.x ?? ''} y={widget.mapping.LINE?.y ?? []} rows={rows} options={widget.mapping.LINE?.options} />
            )}
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
                options={widget.mapping.PIE?.options}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
