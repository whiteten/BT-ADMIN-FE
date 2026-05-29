/**
 * autoPackPosition — 대시보드에 신규 위젯을 추가할 때 기존 위젯과 겹치지 않는
 * 첫 빈 슬롯(row-major, 좌→우, 위→아래 스캔)을 찾아 {@link WidgetPosition} 반환.
 *
 * 크기 결정 우선순위:
 *   1) 카탈로그 메타 defaultW/defaultH
 *   2) widgetCategory 카테고리 프리셋
 *   3) minW/minH 폴백
 * 결과 폭은 [minW, GRID_COLS] 로 clamp, 높이는 max(요청, minH).
 *
 * 빈 슬롯이 없으면 기존 위젯들의 최하단 다음 행에 좌측 정렬로 배치.
 */
import type { CustomWidgetCatalogItem, Widget, WidgetCategory, WidgetPosition } from '../types';

export const GRID_COLS = 12;
const SCAN_MAX_ROW = 200;

/** 카테고리별 권장 크기 — defaultW/H 미지정 시 폴백. */
export const CATEGORY_PRESET: Record<WidgetCategory, { w: number; h: number }> = {
  KPI: { w: 3, h: 3 },
  CHART: { w: 6, h: 5 },
  TABLE: { w: 12, h: 6 },
  STATUS: { w: 6, h: 6 },
  GENERIC: { w: 4, h: 4 },
};

export interface SizedItem {
  minW: number;
  minH: number;
  defaultW?: number;
  defaultH?: number;
  widgetCategory?: WidgetCategory;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

/** 폭/높이를 [minW, GRID_COLS] / [minH, ∞] 범위로 보정. */
export function clampSize(item: SizedItem, w: number, h: number): { w: number; h: number } {
  return {
    w: clamp(Math.max(w, item.minW), item.minW, GRID_COLS),
    h: Math.max(h, item.minH),
  };
}

/** 카탈로그 메타 + 카테고리 + min 조합으로 신규 위젯의 권장 크기 결정. */
export function resolveSize(item: SizedItem): { w: number; h: number } {
  const preset = CATEGORY_PRESET[item.widgetCategory ?? 'GENERIC'];
  return clampSize(item, item.defaultW ?? preset.w, item.defaultH ?? preset.h);
}

/** (row, col, w, h) 영역이 기존 위젯 영역과 겹치는지 검사. */
function overlaps(a: WidgetPosition, b: { row: number; col: number; w: number; h: number }): boolean {
  return !(a.col + a.w <= b.col || b.col + b.w <= a.col || a.row + a.h <= b.row || b.row + b.h <= a.row);
}

/**
 * 신규 위젯의 권장 배치 위치 산출.
 * @param existingWidgets 현재 대시보드에 배치된 위젯들 (position 사용)
 * @param item            카탈로그 항목 (defaultW/H, minW/H, widgetCategory)
 */
export function autoPackPosition(existingWidgets: ReadonlyArray<Widget>, item: SizedItem, sizeOverride?: { w: number; h: number }): WidgetPosition {
  const { w, h } = sizeOverride ? clampSize(item, sizeOverride.w, sizeOverride.h) : resolveSize(item);
  const placed = existingWidgets.map((wg) => wg.position);

  for (let row = 0; row <= SCAN_MAX_ROW; row++) {
    for (let col = 0; col + w <= GRID_COLS; col++) {
      const candidate = { row, col, w, h };
      const conflict = placed.some((p) => overlaps(p, candidate));
      if (!conflict) return candidate;
    }
  }

  // fallback — 모든 행에서 자리 못 찾으면 최하단 다음 행 좌측에 배치.
  const lastRow = placed.reduce((max, p) => Math.max(max, p.row + p.h), 0);
  return { row: lastRow, col: 0, w, h };
}

/** CustomWidgetCatalogItem 전용 thin wrapper — call site 가 타입 안전하게 사용. */
export function autoPackForCatalogItem(existingWidgets: ReadonlyArray<Widget>, item: CustomWidgetCatalogItem): WidgetPosition {
  return autoPackPosition(existingWidgets, item);
}
