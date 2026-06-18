import type { WidgetCategory, WidgetPosition } from '../types';

/** 자동 배치 시 카테고리별 기본 크기 정의. */
export const CATEGORY_PRESET: Record<WidgetCategory, { w: number; h: number }> = {
  KPI: { w: 3, h: 3 },
  CHART: { w: 8, h: 6 },
  TABLE: { w: 12, h: 6 },
  STATUS: { w: 6, h: 6 },
  GENERIC: { w: 4, h: 4 },
  MISC: { w: 4, h: 4 },
};

export interface SizedItem {
  minW: number;
  minH: number;
  widgetCategory?: WidgetCategory;
}

function clampSize(meta: SizedItem, w: number, h: number): { w: number; h: number } {
  return {
    w: Math.max(meta.minW, w),
    h: Math.max(meta.minH, h),
  };
}

/** 카탈로그 카테고리 프리셋 + min 으로 신규 위젯의 권장 크기 결정(보조 picker 전용 — 대시보드는 영역 크기에 바인딩). */
export function resolveSize(item: SizedItem): { w: number; h: number } {
  const cat = item.widgetCategory || 'MISC';
  const preset = CATEGORY_PRESET[cat];
  return clampSize(item, preset.w, preset.h);
}

/**
 * 겹치지 않는 빈 공간을 찾아 위젯의 초기 좌표를 결정한다.
 * @param existing 현재 배치된 위젯 목록
 * @param meta 추가할 위젯의 메타정보 (minW, minH 등)
 * @param preferredSize 사용자가 드래그 등으로 요청한 크기 (있을 때만 사용)
 */
export function autoPackPosition(existing: Array<{ position: WidgetPosition }>, meta: SizedItem, preferredSize?: { w: number; h: number }): WidgetPosition {
  const { w, h } = preferredSize || resolveSize(meta);

  // 12-col 그리드에서 0,0 부터 순차적으로 빈 공간 탐색 (심플 팩킹)
  for (let row = 0; row < 100; row++) {
    for (let col = 0; col <= 12 - w; col++) {
      const hasCollision = existing.some((ex) => {
        const p = ex.position;
        return col < p.col + p.w && col + w > p.col && row < p.row + p.h && row + h > p.row;
      });

      if (!hasCollision) {
        return { row, col, w, h };
      }
    }
  }

  return { row: 0, col: 0, w, h };
}
