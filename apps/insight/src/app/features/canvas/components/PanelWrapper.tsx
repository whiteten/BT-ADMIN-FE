import { Button, Tag } from 'antd';
import { Search, Settings, X } from 'lucide-react';
import { toast } from '@/shared-util';
import PanelBarChart from '../../panel/components/chart/PanelBarChart';
import PanelLineChart from '../../panel/components/chart/PanelLineChart';
import PanelPieChart from '../../panel/components/chart/PanelPieChart';
import PanelRadarChart from '../../panel/components/chart/PanelRadarChart';
import PanelGrid from '../../panel/components/grid/PanelGrid';
import PanelKpiCard from '../../panel/components/kpi/PanelKpiCard';
import { useReportEditorStore } from '../../report/hooks/useReportEditorStore';
import { useDeletePanel } from '../../report/hooks/useReportQueries';
import type { PanelDetail } from '../../report/types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface PanelWrapperProps {
  panel: PanelDetail;
  reportId: number;
  mode: 'edit' | 'view';
  onEdit(): void;
  /** react-grid-layout 드래그 핸들 클래스 (편집 모드) */
  draggableClass?: string;
}

export default function PanelWrapper({ panel, reportId, mode, onEdit, draggableClass = '' }: PanelWrapperProps) {
  const modal = useModal();
  const { removePanel } = useReportEditorStore();

  const { mutate: deletePanel } = useDeletePanel({
    mutationOptions: {
      onSuccess: () => {
        removePanel(panel.panelId);
        toast.success('패널이 삭제되었습니다.');
      },
    },
  });

  const handleDelete = () => {
    modal.confirm.delete({
      onOk: () => deletePanel({ reportId, panelId: panel.panelId }),
    });
  };

  const isEdit = mode === 'edit';

  return (
    <div className="flex h-full flex-col rounded-lg border border-[var(--color-bt-border)] bg-white shadow-sm overflow-hidden">
      {/* 패널 헤더 (편집 모드에서 드래그 핸들) */}
      <div
        className={`flex items-center justify-between gap-3 px-4 h-[45px] min-h-[45px] border-b border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/60 ${isEdit ? `${draggableClass} cursor-move` : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base font-semibold text-[var(--color-bt-fg)] truncate">{panel.title}</span>
          <Tag color="processing" className="!mb-0">
            {panel.panelType}
          </Tag>
          {isEdit && (
            <span className="text-xs text-[var(--color-bt-fg-muted)]">
              {panel.layout.w}W × {panel.layout.h}H
            </span>
          )}
        </div>
        <div className="panel-no-drag flex items-center gap-0.5" onMouseDown={(e) => e.stopPropagation()}>
          <Button type="text" size="small" icon={<Search className="w-3.5 h-3.5" />} title="검색조건 바인딩" />
          <Button type="text" size="small" icon={<Settings className="w-3.5 h-3.5" />} onClick={onEdit} title="패널 편집" />
          <Button type="text" size="small" danger icon={<X className="w-3.5 h-3.5" />} onClick={handleDelete} title="삭제" />
        </div>
      </div>

      {/* 패널 콘텐츠 — min-h-0 으로 flex 자식(차트 height:100%)이 영역 높이를 읽도록 */}
      <div className="flex-1 min-h-0 p-3">
        {panel.panelType === 'GRID' && <PanelGrid panel={panel} reportId={reportId} />}
        {panel.panelType === 'BAR' && <PanelBarChart panel={panel} reportId={reportId} />}
        {panel.panelType === 'LINE' && <PanelLineChart panel={panel} reportId={reportId} />}
        {panel.panelType === 'PIE' && <PanelPieChart panel={panel} reportId={reportId} />}
        {panel.panelType === 'RADAR' && <PanelRadarChart panel={panel} reportId={reportId} />}
        {panel.panelType === 'KPI' && <PanelKpiCard panel={panel} reportId={reportId} />}
      </div>
    </div>
  );
}
