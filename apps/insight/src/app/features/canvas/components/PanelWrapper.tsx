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
}

export default function PanelWrapper({ panel, reportId, mode, onEdit }: PanelWrapperProps) {
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
  const minHeight = panel.layout.h * 60;

  return (
    <div className="flex flex-col rounded border border-bt-border bg-white overflow-hidden" style={{ minHeight }}>
      {/* 패널 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-bt-border bg-bt-bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold">{panel.title}</span>
          <span className="text-[10px] rounded bg-bt-primary-soft text-bt-primary px-1.5 py-0.5 font-medium">{panel.panelType}</span>
          {isEdit && (
            <span className="text-[10px] text-bt-fg-muted">
              {panel.layout.w}W × {panel.layout.h}H
            </span>
          )}
        </div>
        {isEdit && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                /* TODO: search binding */
              }}
              className="p-1 rounded hover:bg-bt-bg-muted"
              title="검색조건 바인딩"
            >
              <Search className="w-3.5 h-3.5 text-bt-fg-muted" />
            </button>
            <button onClick={onEdit} className="p-1 rounded hover:bg-bt-bg-muted" title="편집">
              <Settings className="w-3.5 h-3.5 text-bt-fg-muted" />
            </button>
            <button onClick={handleDelete} className="p-1 rounded hover:bg-bt-bg-muted" title="삭제">
              <X className="w-3.5 h-3.5 text-bt-danger" />
            </button>
          </div>
        )}
      </div>

      {/* 패널 콘텐츠 */}
      <div className="flex-1 p-3">
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
