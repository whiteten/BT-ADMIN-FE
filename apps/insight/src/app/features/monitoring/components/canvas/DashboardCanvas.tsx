import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Modal } from 'antd';
import { Plus } from 'lucide-react';
// react-grid-layout v2.x — main entry 에서 WidthProvider HOC 가 제거되어 legacy 서브패스 사용.
// (main 은 useContainerWidth hook 패턴으로 전환됨)
// @ts-expect-error tsconfig.moduleResolution=node 에서 sub-path types 미인식 (런타임은 정상)
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { toast } from '@/shared-util';
import CustomWidgetCard from './CustomWidgetCard';
import TemplateWidgetCard from './TemplateWidgetCard';
import type { CustomWidget, TemplateWidget, Widget } from '../../types';

const ResponsiveGridLayout = WidthProvider(Responsive);
const DRAG_HANDLE_CLASS = 'widget-drag-handle';

interface GridLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

interface WidgetDataEntry {
  rows: Record<string, unknown>[] | Record<string, unknown> | unknown;
  serverTs: number;
}

interface DashboardCanvasProps {
  dashboardId: number;
  widgets: Widget[];
  /** 편집 모드 — drag·resize 활성, 헤더 ⚙·× 노출 */
  editMode: boolean;
  /** WebSocket DATA 프레임 누적 결과 (widgetId 문자열 → 마지막 데이터). */
  widgetData?: Record<string, WidgetDataEntry>;
  onWidgetsChange?: (next: Widget[]) => void;
  onLayoutChange?: (items: Array<{ widgetId: number; row: number; col: number; w: number; h: number }>) => void;
}

export default function DashboardCanvas({ dashboardId, widgets, editMode, widgetData, onWidgetsChange, onLayoutChange }: DashboardCanvasProps) {
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<Widget | null>(null);

  // react-grid-layout 형식으로 변환
  const layouts = useMemo(() => {
    const items: GridLayoutItem[] = widgets.map((w) => ({
      i: String(w.widgetId),
      x: w.position.col,
      y: w.position.row,
      w: w.position.w,
      h: w.position.h,
      minW: w.kind === 'CUSTOM' ? 3 : 2,
      minH: w.kind === 'CUSTOM' ? 3 : 2,
    }));
    return { lg: items, md: items, sm: items };
  }, [widgets]);

  const handleLayoutChange = (layout: GridLayoutItem[]) => {
    if (!editMode) return;
    const updated: Widget[] = widgets.map((w) => {
      const l = layout.find((x) => x.i === String(w.widgetId));
      if (!l) return w;
      return { ...w, position: { col: l.x, row: l.y, w: l.w, h: l.h } };
    });
    onWidgetsChange?.(updated);
    onLayoutChange?.(updated.map((w) => ({ widgetId: w.widgetId, ...w.position })));
  };

  const handleSettings = (w: Widget) => {
    if (w.kind === 'TEMPLATE') {
      navigate(`/insight/monitoring/dashboards/${dashboardId}/edit/widget/${w.widgetId}/template`);
    } else {
      toast.info(`커스텀 위젯 옵션 사이드시트 (다음 단계 구현) — ${w.widgetTypeId}`);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const next = widgets.filter((w) => w.widgetId !== deleteTarget.widgetId);
    onWidgetsChange?.(next);
    toast.success(`"${deleteTarget.widgetName}"이(가) 삭제되었습니다.`);
    setDeleteTarget(null);
  };

  return (
    <div className={`flex-1 overflow-auto ${editMode ? 'grid-pattern' : 'bg-[var(--color-bt-bg-canvas)]'} px-5 py-5`}>
      {/* 편집 모드 — 진입점 버튼 */}
      {editMode && (
        <div className="mb-3 flex items-center gap-2">
          <Button type="primary" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => navigate(`/insight/monitoring/dashboards/${dashboardId}/edit/widget/create/template`)}>
            + 템플릿 위젯
          </Button>
          <Button icon={<Plus className="w-3.5 h-3.5" />} onClick={() => navigate(`/insight/monitoring/dashboards/${dashboardId}/edit/widget/create/custom`)}>
            + 커스텀 위젯
          </Button>
          <span className="ml-auto text-[10.5px] text-[var(--color-bt-fg-muted)]">드래그 핸들(헤더) · 우하단 모서리로 리사이즈 · 12-col grid</span>
        </div>
      )}

      {/* Responsive Grid Layout — 12-col */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 12, sm: 12 }}
        rowHeight={40}
        margin={[12, 12]}
        isDraggable={editMode}
        isResizable={editMode}
        draggableHandle={`.${DRAG_HANDLE_CLASS}`}
        onLayoutChange={handleLayoutChange}
        useCSSTransforms
      >
        {widgets.map((widget) => (
          <div key={String(widget.widgetId)}>
            {widget.kind === 'TEMPLATE' ? (
              <TemplateWidgetCard
                widget={widget as TemplateWidget}
                editMode={editMode}
                onSettings={() => handleSettings(widget)}
                onDelete={() => setDeleteTarget(widget)}
                draggableClass={DRAG_HANDLE_CLASS}
              />
            ) : (
              <CustomWidgetCard
                widget={widget as CustomWidget}
                editMode={editMode}
                data={widgetData?.[String(widget.widgetId)]?.rows}
                onSettings={() => handleSettings(widget)}
                onDelete={() => setDeleteTarget(widget)}
                draggableClass={DRAG_HANDLE_CLASS}
              />
            )}
          </div>
        ))}
      </ResponsiveGridLayout>

      {/* 삭제 확인 모달 */}
      <Modal
        open={!!deleteTarget}
        title="위젯 삭제"
        onOk={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        okText="삭제"
        cancelText="취소"
        okButtonProps={{ danger: true }}
      >
        <p className="text-[12.5px]">
          <strong>{deleteTarget?.widgetName}</strong> 위젯을 삭제하시겠습니까?
        </p>
        <p className="mt-2 text-[11px] text-[var(--color-bt-fg-muted)]">대시보드 저장 전까지 되돌릴 수 있습니다.</p>
      </Modal>
    </div>
  );
}
