import { Settings, X } from 'lucide-react';
import { VIZ_ICON, VIZ_LABELS } from '../../constants/monitoringConstants';
import type { VizType, Widget } from '../../types';

interface WidgetCardHeaderProps {
  widget: Widget;
  /** 현재 활성 시각화 (TEMPLATE 전용) */
  currentViz?: VizType;
  /** 시각화 전환 (TEMPLATE 전용) */
  onChangeViz?: (viz: VizType) => void;
  /** 편집 모드일 때만 노출 — 설정/삭제 버튼 */
  editMode?: boolean;
  onSettings?: () => void;
  onDelete?: () => void;
  /** 실시간 연결 상태 */
  connected?: boolean;
  /** 드래그 핸들 클래스 (편집 모드에서 react-grid-layout이 사용) */
  draggableClass?: string;
}

/** 위젯 컴포넌트가 자체 툴바(검색·필터·뷰토글 등) 를 헤더 가운데 영역에 portal 로 주입하기 위한 슬롯 id. */
export function widgetToolbarSlotId(widgetId: number | string): string {
  return `widget-toolbar-slot-${widgetId}`;
}

export default function WidgetCardHeader({
  widget,
  currentViz,
  onChangeViz,
  editMode = false,
  onSettings,
  onDelete,
  connected = true,
  draggableClass = '',
}: WidgetCardHeaderProps) {
  const isTemplate = widget.kind === 'TEMPLATE';

  return (
    <div className={`flex items-center justify-between gap-3 bg-white px-4 h-[45px] min-h-[45px] ${editMode ? `cursor-move ${draggableClass}` : ''}`}>
      {/* 좌측: 위젯 타이틀 (FCA BotDashboard 카드와 동일 스타일) */}
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <span className="text-base font-semibold text-[#495057] truncate">{widget.widgetName}</span>
        {isTemplate && (
          <span className="shrink-0 rounded bg-[var(--color-bt-primary-soft)] px-1.5 py-0.5 mono text-[9.5px] font-bold text-[var(--color-bt-primary)]" title="템플릿 위젯">
            템플릿 · {currentViz ?? widget.defaultViz}
          </span>
        )}
      </div>

      {/* 가운데: 위젯이 portal 로 검색/필터/뷰토글 등을 주입하는 슬롯 */}
      <div
        id={widgetToolbarSlotId(widget.widgetId)}
        className="flex flex-1 items-center justify-end min-w-0"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      />

      {/* 우측: 시각화 토글 + 설정/삭제 + 연결 상태 */}
      <div className="flex items-center gap-0.5 shrink-0" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        {/* 시각화 전환 (TEMPLATE 전용 · 시각화 2종+ 일 때만) */}
        {isTemplate && widget.visualizations.length > 1 && (
          <div className="flex items-center gap-0.5 mr-1">
            {(['GRID', 'BAR', 'LINE', 'CARD'] as VizType[]).map((v) => {
              if (!widget.visualizations.includes(v)) return null;
              const active = (currentViz ?? widget.defaultViz) === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => onChangeViz?.(v)}
                  title={`${v} · ${VIZ_LABELS[v]}${v === widget.defaultViz ? ' (★ 기본)' : ''}`}
                  className={`relative inline-flex h-6 w-6 items-center justify-center rounded mono text-[12px] ${
                    active ? 'bg-[var(--color-bt-primary)] text-white' : 'text-[var(--color-bt-fg-muted)] hover:bg-[var(--color-bt-bg-muted)]'
                  }`}
                >
                  {VIZ_ICON[v]}
                  {v === widget.defaultViz && <span className="absolute -top-0.5 -right-0.5 text-[8px] text-[var(--color-bt-warn)]">★</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* 실시간 연결 점 (뷰 모드에서만 시인성) */}
        {!editMode && (
          <span className="mr-1 inline-flex items-center gap-1 text-[10px] text-[var(--color-bt-fg-muted)]">
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-[var(--color-bt-success)] pulse-dot' : 'bg-[var(--color-bt-danger)] pulse-dot-danger'}`} />
          </span>
        )}

        {/* 설정/삭제 (편집 모드 전용) */}
        {editMode && (
          <>
            <button
              type="button"
              onClick={onSettings}
              title="설정"
              className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--color-bt-fg-muted)] hover:bg-[var(--color-bt-bg-muted)] hover:text-[var(--color-bt-fg)]"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              title="삭제"
              className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--color-bt-fg-muted)] hover:bg-[var(--color-bt-danger-soft)] hover:text-[var(--color-bt-danger)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
