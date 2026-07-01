import { type PointerEvent as ReactPointerEvent, createContext } from 'react';

/**
 * 테이블 컬럼 너비(%) 마우스 드래그 리사이즈 콜백 — TaskCreate 캔버스에서만 Provider로 실제 setter를
 * 주입하고(`updateWidgetTableColumn`), TableWidget/RedisTableWidget이 캔버스 깊이 어디에 있든 prop drilling 없이
 * useContext로 바로 꺼내 쓴다. TaskView/RollingDisplay(읽기 전용 실행화면)는 Provider가 없어 기본값(no-op)을 받는다.
 *
 * 컬럼 사이 간격(padding)이 아니라 **컬럼 자신의 너비**를 직접 조절한다 — 너비를 지정하지 않은 다른 컬럼들은
 * (table-layout:fixed 특성상) 남은 폭을 자기들끼리 균등분할로 나눠 갖으므로, 한 컬럼을 넓히면 나머지는
 * 자연스럽게 더 좁아지며 서로 다닥다닥 붙는다(예: A를 넓게 늘리면 "A-----B-C" 형태가 됨).
 */
export const TableColumnResizeContext = createContext<(widgetId: string, colKey: string, widthPercent: string) => void>(() => undefined);

export const COLUMN_WIDTH_MIN_PERCENT = 5;
export const COLUMN_WIDTH_MAX_PERCENT = 90;

/**
 * 헤더 경계 드래그 핸들의 onPointerDown 공통 구현 — TableWidget(TaskCreate)/RedisTableWidget 양쪽에서 재사용.
 *
 * 드래그한 컬럼(colKey)과 그 바로 다음 컬럼(next sibling th)만 너비를 주고받는다(둘의 합은 항상 고정) —
 * 그 외 컬럼은 절대 영향받지 않게, 드래그 시작 시점에 행에 있는 모든 컬럼의 "현재 렌더된 너비(%)"를
 * 그대로 명시값으로 고정해버린다(`width` 미지정 컬럼은 table-layout:fixed에서 남은 폭을 서로 균등분할로
 * 나눠 갖는데, 그 상태로 두면 한 컬럼만 건드려도 나머지 전부가 따라 움직이는 문제가 있었음).
 * 각 `<th>`에 `data-col-key`를 심어둬야 이 함수가 컬럼 키를 알 수 있다.
 */
export function handleColumnResizePointerDown(e: ReactPointerEvent, colKey: string, widgetId: string, setColumnWidth: (widgetId: string, colKey: string, width: string) => void) {
  e.stopPropagation();
  e.preventDefault();
  const th = (e.currentTarget as HTMLElement).closest('th');
  const table = (e.currentTarget as HTMLElement).closest('table');
  const row = th?.parentElement;
  if (!th || !table || !row) return;
  const nextTh = th.nextElementSibling as HTMLElement | null;
  const nextColKey = nextTh?.dataset.colKey;
  if (!nextTh || !nextColKey) return;

  const tableWidth = table.getBoundingClientRect().width;
  if (tableWidth <= 0) return;

  // 이 행의 모든 컬럼을 지금 렌더된 너비(%)로 고정 — 드래그 대상 두 컬럼 외에는 절대 안 바뀌게
  Array.from(row.children).forEach((cell) => {
    const key = (cell as HTMLElement).dataset.colKey;
    if (!key) return;
    const percent = (cell.getBoundingClientRect().width / tableWidth) * 100;
    setColumnWidth(widgetId, key, `${percent.toFixed(2)}%`);
  });

  const startDraggedPercent = (th.getBoundingClientRect().width / tableWidth) * 100;
  const startNextPercent = (nextTh.getBoundingClientRect().width / tableWidth) * 100;
  const pairTotal = startDraggedPercent + startNextPercent;
  const startX = e.clientX;

  const handleMove = (ev: PointerEvent) => {
    const deltaPercent = ((ev.clientX - startX) / tableWidth) * 100;
    const dragged = Math.max(COLUMN_WIDTH_MIN_PERCENT, Math.min(pairTotal - COLUMN_WIDTH_MIN_PERCENT, startDraggedPercent + deltaPercent));
    const next = pairTotal - dragged;
    setColumnWidth(widgetId, colKey, `${dragged.toFixed(2)}%`);
    setColumnWidth(widgetId, nextColKey, `${next.toFixed(2)}%`);
  };
  const handleUp = () => {
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerup', handleUp);
  };
  window.addEventListener('pointermove', handleMove);
  window.addEventListener('pointerup', handleUp);
}
