import type { LayoutItem } from 'react-grid-layout';
import { createShortId } from '@/shared-util';

export function generateWidgetId(): string {
  return createShortId();
}

export const getGradientColor = (params: { dataIndex: number }, rgb: [number, number, number] = [59, 130, 246]) => {
  const opacity = Math.max(1 - params.dataIndex * 0.07, 0.3);
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`;
};

export function findTopLeftPosition(existingItems: LayoutItem[], itemW: number, itemH: number, totalCols: number): { x: number; y: number } {
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
