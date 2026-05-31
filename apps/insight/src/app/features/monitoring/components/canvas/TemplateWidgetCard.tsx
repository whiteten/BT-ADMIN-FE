import { useEffect, useMemo, useState } from 'react';
import WidgetCardHeader from './WidgetCardHeader';
import { useGetMonitoringDataset } from '../../hooks/useDatasetQueries';
import { generateMockRows } from '../../mocks/mockWidgetData';
import type { KpiDirection, TemplateWidget, VizType } from '../../types';
import MiniBar from '../preview/MiniBar';
import MiniCard from '../preview/MiniCard';
import MiniGrid from '../preview/MiniGrid';
import MiniLine from '../preview/MiniLine';

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
  // 단순화 — Step 2 override를 위젯 카드에서는 비워두고 데이터셋 원본 사용
  const fieldOverrides = useMemo(() => {
    if (!detail) return {};
    const ovr: Record<string, { isVisible: boolean; displayName: string; columnFormat: 'Number' | 'Decimal' | 'Rate' | 'String' | 'Date' | 'Time' }> = {};
    for (const f of detail.fields) {
      ovr[f.columnName] = { isVisible: f.isVisible, displayName: f.displayName, columnFormat: f.columnFormat };
    }
    for (const c of detail.calcFields) {
      ovr[c.fieldCode] = { isVisible: true, displayName: c.displayName, columnFormat: c.columnFormat };
    }
    return ovr;
  }, [detail]);

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
      <WidgetCardHeader
        widget={widget}
        sourceName={detail.datasetName}
        currentViz={currentViz}
        onChangeViz={setCurrentViz}
        editMode={editMode}
        onDelete={onDelete}
        draggableClass={draggableClass}
      />
      <div className="flex-1 overflow-hidden">
        {currentViz === 'GRID' && <MiniGrid detail={detail} fieldOverrides={fieldOverrides} columns={widget.mapping.GRID?.columns ?? []} rows={rows} />}
        {currentViz === 'BAR' && <MiniBar detail={detail} x={widget.mapping.BAR?.x ?? ''} y={widget.mapping.BAR?.y ?? []} rows={rows} />}
        {currentViz === 'LINE' && <MiniLine detail={detail} x={widget.mapping.LINE?.x ?? ''} y={widget.mapping.LINE?.y ?? []} rows={rows} />}
        {currentViz === 'CARD' && (
          <MiniCard
            detail={detail}
            measure={widget.mapping.CARD?.measure ?? ''}
            unit={widget.mapping.CARD?.unit}
            kpiDirection={(widget.mapping.CARD?.kpiDirection ?? 'NEUTRAL') as KpiDirection}
            threshold={widget.mapping.CARD?.threshold}
            rows={rows}
          />
        )}
      </div>
    </div>
  );
}
