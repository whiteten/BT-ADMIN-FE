/**
 * 검색조건 관련 타입 정의
 */

export interface SearchConditionItem {
  conditionId: number;
  conditionName: string;
  inputType: string;
  operator: string;
  defaultValue?: string;
  optionsSource?: string;
  groupKey?: string;
  groupLabel?: string;
  isRequired: boolean;
  sortOrder: number;
  tenantId: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface SearchConditionRequest {
  conditionName: string;
  inputType: string;
  operator: string;
  defaultValue?: string;
  optionsSource?: string;
  groupKey?: string;
  groupLabel?: string;
  isRequired?: boolean;
  sortOrder?: number;
}

export interface UserFilterItem {
  id: number;
  userId: string;
  boardId: number;
  widgetId: number;
  conditionId: number;
  filterValue?: string;
  updatedAt: string;
}

export interface UserFilterRequest {
  boardId: number;
  widgetId: number;
  conditionId: number;
  filterValue?: string;
}
