/**
 * 대시보드(보드) 관련 타입 정의 (v3.1)
 *
 * 통계 보드 한정. 모니터링 보드는 Wave B에서 추가.
 */

export interface BoardItem {
  boardId: number;
  boardName: string;
  description?: string;
  isSystem: boolean;
  isShared: boolean;
  ownerUserId?: string;
  sourceBoardId?: number;
  publishedAt?: string;
  publishedBy?: string;
  globalFilters?: string;
  tenantId: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  widgets: BoardWidgetItem[];
}

export interface BoardWidgetItem {
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

export interface BoardRequest {
  boardName: string;
  description?: string;
  isShared?: boolean;
  globalFilters?: string;
  widgets?: BoardWidgetRequest[];
}

export interface BoardWidgetRequest {
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

/* 통계 보드 alias (v3.1) */
export type StatBoardItem = BoardItem;
export type StatBoardRequest = BoardRequest;
export type StatBoardWidgetItem = BoardWidgetItem;
export type StatBoardWidgetRequest = BoardWidgetRequest;

/* 호환성: 기존 명칭을 참조하는 컴포넌트를 위한 alias */
export type DashboardItem = BoardItem;
export type DashboardWidgetItem = BoardWidgetItem;
export type DashboardRequest = BoardRequest;
export type DashboardWidgetRequest = BoardWidgetRequest;
