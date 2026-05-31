import type { LayoutItem } from 'react-grid-layout';
import type { Option } from 'react-multi-select-component';
import type { CampaignDashboardLayoutItem, CampaignDashboardWidgetType } from '../types';
import { findTopLeftPosition, generateWidgetId } from './dashboardUtils';

/**
 * 캠페인 대시보드 — 필터 선택 상태에 맞춰 레이아웃을 동기화한다.
 */
export function syncCampaignLayoutWithFilter(
  currentLayout: CampaignDashboardLayoutItem[],
  filterItems: Option[],
  defaultLayout: CampaignDashboardLayoutItem[],
  totalCols: number,
): CampaignDashboardLayoutItem[] {
  const selectedTypes = new Set(filterItems.map((item) => item.value as CampaignDashboardWidgetType));
  const filtered = currentLayout.filter((item) => selectedTypes.has(item.widgetType));
  const existingTypes = new Set(filtered.map((item) => item.widgetType));
  const toAdd: CampaignDashboardLayoutItem[] = [];

  for (const type of selectedTypes) {
    if (existingTypes.has(type)) continue;
    const defaultItem = defaultLayout.find((d) => d.widgetType === type);
    if (!defaultItem) continue;
    const pos = findTopLeftPosition([...filtered, ...toAdd] as LayoutItem[], defaultItem.w, defaultItem.h, totalCols);
    toAdd.push({ ...defaultItem, i: generateWidgetId(), ...pos });
  }

  return [...filtered, ...toAdd];
}
