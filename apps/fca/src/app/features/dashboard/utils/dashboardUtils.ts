import type { LayoutItem } from 'react-grid-layout';
import type { Option } from 'react-multi-select-component';
import { createShortId } from '@/shared-util';
import type { DashboardLayoutItem, DashboardWidgetType } from '../types';

/** 위젯 인스턴스를 식별하는 고유 ID를 생성한다. */
export function generateWidgetId(): string {
  return createShortId();
}

/** 순위(dataIndex)가 낮아질수록 투명도가 증가하는 그라데이션 색상을 반환한다. */
export const getGradientColor = (params: { dataIndex: number }, rgb: [number, number, number] = [59, 130, 246]) => {
  const opacity = Math.max(1 - params.dataIndex * 0.07, 0.3);
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`;
};

/**
 * 그리드에서 기존 아이템과 충돌하지 않는 가장 왼쪽-위(top-left) 빈 자리를 찾는다.
 * 좌상단(0,0)부터 행→열 순서로 스캔하여 처음 발견된 빈 자리를 반환하며,
 * 빈 자리가 없으면 기존 아이템들 아래(maxY)에 배치한다.
 */
export function findTopLeftPosition(existingItems: LayoutItem[], itemW: number, itemH: number, totalCols: number): { x: number; y: number } {
  // AABB(축 정렬 경계 상자) 충돌 감지: 두 사각형의 x/y 범위가 겹치면 충돌
  const collides = (x: number, y: number, w: number, h: number, item: LayoutItem) => x < item.x + item.w && x + w > item.x && y < item.y + item.h && y + h > item.y;
  const maxY = existingItems.reduce((max, item) => Math.max(max, item.y + item.h), 0);
  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x <= totalCols - itemW; x++) {
      const hasCollision = existingItems.some((item) => collides(x, y, itemW, itemH, item));
      if (!hasCollision) return { x, y };
    }
  }
  return { x: 0, y: maxY };
}

/**
 * 필터 선택 상태에 맞춰 레이아웃을 동기화한다.
 * 1단계: 선택 해제된 항목을 레이아웃에서 제거
 * 2단계: 새로 선택된 항목을 기본 크기로 빈 자리에 추가
 */
export function syncLayoutWithFilter(currentLayout: DashboardLayoutItem[], filterItems: Option[], defaultLayout: DashboardLayoutItem[], totalCols: number): DashboardLayoutItem[] {
  const selectedTypes = new Set(filterItems.map((item) => item.value as DashboardWidgetType));
  // 1단계: widgetType 기준으로 선택된 항목만 남긴다
  const filtered = currentLayout.filter((item) => selectedTypes.has(item.widgetType));
  // 2단계: 기존 레이아웃에 없는 widgetType을 기본 크기로 빈 자리에 배치한다
  const existingTypes = new Set(filtered.map((item) => item.widgetType));
  const toAdd: DashboardLayoutItem[] = [];
  for (const type of selectedTypes) {
    if (existingTypes.has(type)) continue;
    const defaultItem = defaultLayout.find((d) => d.widgetType === type);
    if (!defaultItem) continue;
    const pos = findTopLeftPosition([...filtered, ...toAdd], defaultItem.w, defaultItem.h, totalCols);
    toAdd.push({ ...defaultItem, i: generateWidgetId(), ...pos });
  }
  return [...filtered, ...toAdd];
}
