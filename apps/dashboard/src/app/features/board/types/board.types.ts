/**
 * 대시보드 관련 타입 정의
 */

export interface DashboardItem {
  boardId: number;
  boardName: string;
  description?: string;
  isSystem: boolean;
  isShared: boolean;
  globalFilters?: string;
  tenantId: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  widgets: DashboardWidgetItem[];
}

export interface DashboardWidgetItem {
  id: number;
  widgetId: number;
  layoutX: number;
  layoutY: number;
  layoutW: number;
  layoutH: number;
  viewMode: string;
  filterOverrides?: string;
  sortOrder: number;
  isUserOverridden: boolean;
  widget?: WidgetSummary;
}

export interface WidgetSummary {
  widgetId: number;
  widgetType: string;
  widgetName: string;
  category: string;
  icon?: string;
  visualization?: string;
  refreshMode: string;
  refreshInterval?: number;
}

export interface DashboardRequest {
  boardName: string;
  description?: string;
  isShared?: boolean;
  globalFilters?: string;
  widgets?: DashboardWidgetRequest[];
}

export interface DashboardWidgetRequest {
  widgetId: number;
  layoutX: number;
  layoutY: number;
  layoutW: number;
  layoutH: number;
  viewMode: string;
  filterOverrides?: string;
  sortOrder?: number;
}

export interface UserLayoutItem {
  id: number;
  userId: string;
  boardId: number;
  boardWidgetId: number;
  layoutX: number;
  layoutY: number;
  layoutW: number;
  layoutH: number;
  viewMode: string;
  isHidden: boolean;
  updatedAt: string;
}

export interface UserLayoutRequest {
  boardId: number;
  items: {
    boardWidgetId: number;
    layoutX: number;
    layoutY: number;
    layoutW: number;
    layoutH: number;
    viewMode: string;
    isHidden?: boolean;
  }[];
}
