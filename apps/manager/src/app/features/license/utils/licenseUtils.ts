import type { ServerGroupUsage } from '../types/license.types';

/**
 * 사용률 퍼센트 계산
 */
export function calcUsagePercent(used: number | null, total: number | null): number {
  if (!total || total <= 0 || used == null) return 0;
  return Math.round((used / total) * 100);
}

/**
 * 사용률에 따른 Tailwind 색상 클래스
 */
export function getUsageColorClass(percent: number): string {
  if (percent >= 90) return 'text-red-500';
  if (percent >= 70) return 'text-amber-500';
  return 'text-emerald-500';
}

/**
 * 사용률에 따른 Progress 바 색상
 */
export function getUsageBarColor(percent: number): string {
  if (percent >= 90) return '#F06548';
  if (percent >= 70) return '#F7B84B';
  return '#0AB39C';
}

/**
 * serverGroups에서 NUMBER 타입 항목의 전체 사용 통계 계산
 */
export function calcTotalUsageStats(serverGroups: ServerGroupUsage[]) {
  let totalQty = 0;
  let usedQty = 0;
  let totalFunc = 0;
  let enabledFunc = 0;

  for (const group of serverGroups) {
    for (const item of group.items) {
      if (item.isFeature) {
        totalFunc++;
        if (item.featureEnabled) enabledFunc++;
      } else {
        totalQty += item.totalQuantity ?? 0;
        usedQty += item.usedQuantity ?? 0;
      }
    }
  }

  return {
    totalQty,
    usedQty,
    remainQty: totalQty - usedQty,
    percent: calcUsagePercent(usedQty, totalQty),
    totalFunc,
    enabledFunc,
  };
}
