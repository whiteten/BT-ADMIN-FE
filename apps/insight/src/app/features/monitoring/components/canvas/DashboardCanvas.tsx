import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from 'antd';
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
const GRID_MARGIN = 12;
const ROW_HEIGHT_DEFAULT = 40;

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
  /** 커스텀 위젯이 설정 변경 등으로 모니터링 일시정지를 요청할 때 호출. */
  onRequestPause?: () => void;
  /** 화면 맞춤(월보드) 모드 — rowHeight 를 컨테이너 높이에 맞춰 동적 계산, 스크롤 없이 한 화면을 채움. */
  fitToScreen?: boolean;
}

export default function DashboardCanvas({
  dashboardId,
  widgets,
  editMode,
  widgetData,
  onWidgetsChange,
  onLayoutChange,
  onRequestPause,
  fitToScreen = false,
}: DashboardCanvasProps) {
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<Widget | null>(null);

  // 화면 맞춤 모드 — 컨테이너(내용 영역) 높이를 측정해 rowHeight 를 역산한다.
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setContainerHeight(e.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 위젯들이 차지하는 총 행수 (최하단 row + h).
  const totalRows = useMemo(() => Math.max(1, ...widgets.map((w) => w.position.row + w.position.h)), [widgets]);

  // 화면 맞춤이면 H = rows·rh + (rows-1)·margin + 2·padding(=margin) 을 만족하도록 rh 역산.
  const rowHeight = useMemo(() => {
    if (!fitToScreen || containerHeight <= 0) return ROW_HEIGHT_DEFAULT;
    const rh = (containerHeight - (totalRows + 1) * GRID_MARGIN) / totalRows;
    return Math.max(20, Math.floor(rh));
  }, [fitToScreen, containerHeight, totalRows]);

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
    <div ref={containerRef} className={`flex-1 ${fitToScreen ? 'overflow-hidden p-3' : 'overflow-auto px-5 py-5'} ${editMode ? 'grid-pattern' : 'bg-[var(--color-bt-bg-canvas)]'}`}>
      {/* Responsive Grid Layout — 12-col */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 12, sm: 12 }}
        rowHeight={rowHeight}
        margin={[GRID_MARGIN, GRID_MARGIN]}
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
                onRequestPause={onRequestPause}
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
