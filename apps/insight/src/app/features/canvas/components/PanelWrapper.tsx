import { useQueryClient } from '@tanstack/react-query';
import { Settings } from 'lucide-react';
import { toast } from '@/shared-util';
import PanelBarChart from '../../panel/components/chart/PanelBarChart';
import PanelLineChart from '../../panel/components/chart/PanelLineChart';
import PanelPieChart from '../../panel/components/chart/PanelPieChart';
import PanelRadarChart from '../../panel/components/chart/PanelRadarChart';
import PanelGrid from '../../panel/components/grid/PanelGrid';
import PanelKpiCard from '../../panel/components/kpi/PanelKpiCard';
import { useReportEditorStore } from '../../report/hooks/useReportEditorStore';
import { reportKeys, useDeletePanel } from '../../report/hooks/useReportQueries';
import type { PanelDetail } from '../../report/types';
import { IconTrash } from '@/libs/shared-ui/src/components/custom/Icons';
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
  const queryClient = useQueryClient();
  const { removePanel } = useReportEditorStore();

  const { mutate: deletePanel } = useDeletePanel({
    mutationOptions: {
      onSuccess: () => {
        removePanel(panel.panelId);
        // 보고서 상세 캐시 무효화 — 안 하면 보기 화면이 stale 캐시(삭제된 패널 포함)를
        // 다시 렌더해 삭제 패널 query-execute 가 "패널을 찾을 수 없습니다" 오류를 낸다.
        queryClient.invalidateQueries({ queryKey: reportKeys.detail(reportId).queryKey });
        toast.success('패널이 삭제되었습니다.');
      },
    },
  });

  const handleDelete = () => {
    modal.confirm.delete({
      onOk: () => {
        // 드래프트(미저장 보고서 reportId=0 또는 임시 패널 panelId<0)는 서버에 없으므로
        // API 삭제(보고서 0 조회 실패) 대신 스토어에서만 제거한다.
        if (reportId === 0 || panel.panelId < 0) {
          removePanel(panel.panelId);
          toast.success('패널이 삭제되었습니다.');
          return;
        }
        deletePanel({ reportId, panelId: panel.panelId });
      },
    });
  };

  const isEdit = mode === 'edit';

  return (
    <div className="flex h-full flex-col rounded-lg bg-white bt-shadow overflow-hidden">
      {/* 패널 헤더 — 모니터링 위젯 카드와 동일한 깔끔한 bg-white 헤더 (편집 모드에서 드래그 핸들) */}
      <div className={`flex items-center justify-between gap-3 bg-white px-4 h-[45px] min-h-[45px] ${draggableClass} cursor-move`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base font-semibold text-[#495057] truncate" title={panel.title}>
            {panel.title}
          </span>
          {isEdit && (
            <span className="text-xs text-[var(--color-bt-fg-muted)] shrink-0">
              {panel.layout.w}W × {panel.layout.h}H
            </span>
          )}
        </div>
        {/* 편집(톱니)·삭제(휴지통) 버튼은 편집 모드에서만 — 보기 모드(view) 노출 금지 */}
        {isEdit && (
          <div className="panel-no-drag flex items-center gap-0.5 shrink-0" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={onEdit}
              title="패널 편집"
              className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--color-bt-fg-muted)] transition-colors hover:bg-[var(--color-bt-bg-muted)] hover:text-[var(--color-bt-primary)]"
            >
              <Settings className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              title="삭제"
              className="inline-flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[var(--color-bt-bg-muted)]"
            >
              <IconTrash className="size-5 text-red-500" />
            </button>
          </div>
        )}
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
