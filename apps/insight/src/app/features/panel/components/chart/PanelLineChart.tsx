import type { PanelDetail } from '../../../report/types';

interface PanelLineChartProps {
  panel: PanelDetail;
  reportId: number;
}

export default function PanelLineChart({ panel }: PanelLineChartProps) {
  return (
    <div className="w-full h-full min-h-[200px] flex items-center justify-center">
      <div className="text-[11px] text-bt-fg-muted text-center">
        <div className="text-[18px] mb-2">╱</div>
        <div>LINE 차트 — {panel.title}</div>
        <div className="text-[10px] mt-1">Phase 3에서 데이터 연결 구현</div>
      </div>
    </div>
  );
}
