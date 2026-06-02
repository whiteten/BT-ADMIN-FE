import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
// react-grid-layout v2.x — legacy 서브패스(WidthProvider HOC). 모니터링 DashboardCanvas 와 동일 패턴.
// @ts-expect-error tsconfig.moduleResolution=node 에서 sub-path types 미인식 (런타임 정상)
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import DatasetPickerModal from './DatasetPickerModal';
import EmptyReportCanvas from './EmptyReportCanvas';
import LayoutPickerModal from './LayoutPickerModal';
import PanelTypePickerModal from './PanelTypePickerModal';
import PanelWrapper from './PanelWrapper';
import PlaceholderPanelCard from './PlaceholderPanelCard';
import PanelEditorSheet from '../../panel/components/PanelEditorSheet';
import { useReportEditorStore } from '../../report/hooks/useReportEditorStore';
import { useUpdatePanelLayouts } from '../../report/hooks/useReportQueries';
import type { PanelLayout, PanelType } from '../../report/types';

const ResponsiveGridLayout = WidthProvider(Responsive);
const DRAG_HANDLE_CLASS = 'panel-drag-handle';
const GRID_MARGIN = 12;
const ROW_HEIGHT = 40;
const COLS = 12;

interface CanvasLayoutProps {
  reportId: number;
  mode: 'edit' | 'view';
  isDraft?: boolean;
  datasetId?: number;
}

/** 부모 헤더에서 "영역 추가"를 명령형으로 트리거하기 위한 ref 핸들 (모니터링 DashboardHeader 와 동일 배치). */
export interface CanvasLayoutRef {
  openAddArea: () => void;
}

interface Placeholder {
  id: number;
  layout: PanelLayout;
}

interface GridItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

/** 12-col 그리드에서 (w,h) 가 겹치지 않는 첫 위치를 찾아 반환 (좌→우, 위→아래) */
function packPosition(items: { x: number; y: number; w: number; h: number }[], w: number, h: number): PanelLayout {
  const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  for (let y = 0; y < 1000; y++) {
    for (let x = 0; x + w <= COLS; x++) {
      const rect = { x, y, w, h };
      if (!items.some((it) => overlap(it, rect))) return rect;
    }
  }
  return { x: 0, y: 0, w, h };
}

/**
 * 보고서 캔버스 — 모니터링 대시보드와 동일한 흐름:
 * 구성 시작하기 → 영역분할 모달 → 빈 영역(placeholder) → 추가하기 →
 * 패널 종류 모달 → 데이터셋 모달 → 패널 편집 드로어.
 */
const CanvasLayout = forwardRef<CanvasLayoutRef, CanvasLayoutProps>(function CanvasLayout({ reportId, mode, isDraft, datasetId = 0 }, ref) {
  const { panels } = useReportEditorStore();
  const isEdit = mode === 'edit';

  // 빈 영역(client-only) — 채워지면 실제 패널로 치환
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);

  // 모달/드로어 단계
  const [layoutPickerOpen, setLayoutPickerOpen] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [datasetPickerOpen, setDatasetPickerOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  // 빌드 컨텍스트 (새 패널 추가 시)
  const [targetPlaceholderId, setTargetPlaceholderId] = useState<number | null>(null);
  const [pendingType, setPendingType] = useState<PanelType | null>(null);
  const [pendingDatasetId, setPendingDatasetId] = useState<number>(0);
  const [pendingLayout, setPendingLayout] = useState<PanelLayout | null>(null);

  // 기존 패널 편집
  const [editingPanelId, setEditingPanelId] = useState<number | null>(null);

  const { mutate: updateLayouts } = useUpdatePanelLayouts();

  const isEmpty = panels.length === 0 && placeholders.length === 0;

  // 헤더(부모)의 "영역 추가" 버튼이 호출 — 모니터링과 동일하게 영역추가 트리거를 헤더로 올림
  useImperativeHandle(ref, () => ({ openAddArea: () => setLayoutPickerOpen(true) }), []);

  // ─── 그리드 아이템 = 실제 패널 + 빈 영역 ──────────────────────────────────
  const layout = useMemo<GridItem[]>(() => {
    const panelItems: GridItem[] = panels.map((p) => ({
      i: `panel-${p.panelId}`,
      x: p.layout.x,
      y: p.layout.y,
      w: p.layout.w,
      h: p.layout.h,
      minW: 2,
      minH: 2,
    }));
    const phItems: GridItem[] = placeholders.map((ph) => ({
      i: `ph-${ph.id}`,
      x: ph.layout.x,
      y: ph.layout.y,
      w: ph.layout.w,
      h: ph.layout.h,
      minW: 2,
      minH: 2,
    }));
    return [...panelItems, ...phItems];
  }, [panels, placeholders]);

  // 현재 점유 영역 (auto-pack 기준)
  const occupied = useMemo(() => [...panels.map((p) => p.layout), ...placeholders.map((ph) => ph.layout)], [panels, placeholders]);

  // ─── 영역 추가 (영역분할 모달 결과) ──────────────────────────────────────
  const handleAddArea = (w: number, h: number) => {
    const pos = packPosition(occupied, w, h);
    setPlaceholders((prev) => [...prev, { id: -Date.now(), layout: pos }]);
  };

  // ─── 빈 영역에 패널 추가 시작 → 종류 선택 ────────────────────────────────
  const handleStartAddPanel = (placeholderId: number, layoutForPanel: PanelLayout) => {
    setTargetPlaceholderId(placeholderId);
    setPendingLayout(layoutForPanel);
    setTypePickerOpen(true);
  };

  const handleTypeSelected = (type: PanelType) => {
    setPendingType(type);
    setTypePickerOpen(false);
    setDatasetPickerOpen(true);
  };

  const handleDatasetSelected = (selectedDatasetId: number) => {
    setPendingDatasetId(selectedDatasetId);
    setDatasetPickerOpen(false);
    setEditorOpen(true);
  };

  // 패널 생성 완료 → 빈 영역 제거
  const handlePanelSaved = () => {
    if (targetPlaceholderId !== null) {
      setPlaceholders((prev) => prev.filter((ph) => ph.id !== targetPlaceholderId));
    }
    resetBuildContext();
  };

  const resetBuildContext = () => {
    setEditorOpen(false);
    setTypePickerOpen(false);
    setDatasetPickerOpen(false);
    setTargetPlaceholderId(null);
    setPendingType(null);
    setPendingDatasetId(0);
    setPendingLayout(null);
    setEditingPanelId(null);
  };

  const handleDeletePlaceholder = (placeholderId: number) => {
    setPlaceholders((prev) => prev.filter((ph) => ph.id !== placeholderId));
  };

  // ─── 기존 패널 편집 ──────────────────────────────────────────────────────
  const handleEditPanel = (panelId: number) => {
    setEditingPanelId(panelId);
    setEditorOpen(true);
  };

  // ─── 드래그/리사이즈 종료 → 위치 반영 + 영속 ─────────────────────────────
  const handleDragResizeStop = (next: GridItem[]) => {
    if (!isEdit) return;
    // 빈 영역 위치 갱신
    setPlaceholders((prev) =>
      prev.map((ph) => {
        const l = next.find((n) => n.i === `ph-${ph.id}`);
        return l ? { ...ph, layout: { x: l.x, y: l.y, w: l.w, h: l.h } } : ph;
      }),
    );
    // 실제 패널 위치 갱신 (스토어 + 서버)
    const { panels: storePanels, updatePanel } = useReportEditorStore.getState();
    const layoutUpdates: { panelId: number; x: number; y: number; w: number; h: number }[] = [];
    storePanels.forEach((p) => {
      const l = next.find((n) => n.i === `panel-${p.panelId}`);
      if (l && (l.x !== p.layout.x || l.y !== p.layout.y || l.w !== p.layout.w || l.h !== p.layout.h)) {
        updatePanel(p.panelId, { layout: { x: l.x, y: l.y, w: l.w, h: l.h } });
        layoutUpdates.push({ panelId: p.panelId, x: l.x, y: l.y, w: l.w, h: l.h });
      }
    });
    if (!isDraft && reportId > 0 && layoutUpdates.length > 0) {
      updateLayouts({ reportId, layouts: layoutUpdates });
    }
  };

  return (
    <div
      className="relative w-full min-h-full p-2"
      style={
        isEdit
          ? {
              backgroundImage: 'linear-gradient(to right, #d8dce3 1px, transparent 1px), linear-gradient(to bottom, #d8dce3 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              backgroundColor: '#e8eaed',
            }
          : { backgroundColor: '#e8eaed' }
      }
    >
      {/* 빈 캔버스 — 구성 시작하기 히어로 */}
      {isEdit && isEmpty ? (
        <EmptyReportCanvas onStart={() => setLayoutPickerOpen(true)} />
      ) : (
        <>
          {/* 영역 추가 버튼은 부모 헤더로 이동 (모니터링 DashboardHeader 와 동일). 캔버스는 패널만 차지. */}
          <ResponsiveGridLayout
            className="layout"
            layouts={{ lg: layout, md: layout, sm: layout }}
            breakpoints={{ lg: 1200, md: 996, sm: 768 }}
            cols={{ lg: COLS, md: COLS, sm: COLS }}
            rowHeight={ROW_HEIGHT}
            margin={[GRID_MARGIN, GRID_MARGIN]}
            isDraggable={isEdit}
            isResizable={isEdit}
            draggableHandle={`.${DRAG_HANDLE_CLASS}`}
            draggableCancel=".panel-no-drag"
            onDragStop={handleDragResizeStop}
            onResizeStop={handleDragResizeStop}
            useCSSTransforms
          >
            {panels.map((panel) => (
              <div key={`panel-${panel.panelId}`}>
                <PanelWrapper panel={panel} reportId={reportId} mode={mode} onEdit={() => handleEditPanel(panel.panelId)} draggableClass={DRAG_HANDLE_CLASS} />
              </div>
            ))}
            {placeholders.map((ph) => (
              <div key={`ph-${ph.id}`}>
                <PlaceholderPanelCard onAdd={() => handleStartAddPanel(ph.id, ph.layout)} onDelete={() => handleDeletePlaceholder(ph.id)} draggableClass={DRAG_HANDLE_CLASS} />
              </div>
            ))}
          </ResponsiveGridLayout>
        </>
      )}

      {/* 1) 영역분할 모달 */}
      <LayoutPickerModal open={layoutPickerOpen} onClose={() => setLayoutPickerOpen(false)} onSelect={handleAddArea} />

      {/* 2) 패널 종류 모달 */}
      <PanelTypePickerModal open={typePickerOpen} onClose={resetBuildContext} onSelect={handleTypeSelected} />

      {/* 3) 데이터셋 모달 */}
      <DatasetPickerModal open={datasetPickerOpen} onClose={resetBuildContext} defaultDatasetId={datasetId || undefined} onSelect={handleDatasetSelected} />

      {/* 4) 패널 편집 드로어 — 신규(타입+데이터셋 고정) 또는 기존 편집 */}
      {editorOpen && (
        <PanelEditorSheet
          reportId={reportId}
          panelType={editingPanelId !== null ? undefined : (pendingType ?? undefined)}
          panelId={editingPanelId ?? undefined}
          datasetId={editingPanelId !== null ? datasetId : pendingDatasetId}
          initialLayout={editingPanelId !== null ? undefined : (pendingLayout ?? undefined)}
          isDraft={isDraft}
          onClose={resetBuildContext}
          onSaved={editingPanelId !== null ? undefined : handlePanelSaved}
        />
      )}
    </div>
  );
});

export default CanvasLayout;
