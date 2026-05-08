/**
 * 검색조건 관련 타입 정의 (v3.1)
 */

export type ConditionInputType =
  | 'DATE'
  | 'DATE_RANGE'
  | 'DATETIME'
  | 'SEGMENT'
  | 'TEXT'
  | 'NUMBER'
  | 'RANGE'
  | 'TOGGLE'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'TREE_SELECT'
  | 'TREE_MULTI_SELECT';

export type ConditionOperator = 'EQ' | 'NE' | 'GT' | 'LT' | 'GTE' | 'LTE' | 'IN' | 'BETWEEN' | 'LIKE';

export type OptionsType = 'STATIC' | 'QUERY';

export interface ConditionItem {
  conditionId: number;
  conditionName: string;
  inputType: ConditionInputType;
  operator: ConditionOperator;
  defaultValue?: string;
  optionsType?: OptionsType;
  optionsStatic?: string;
  optionsQuery?: string;
  optionsKeyColumn?: string;
  optionsLabelColumn?: string;
  optionsParentColumn?: string;
  parentConditionId?: number;
  groupKey?: string;
  groupLabel?: string;
  isRequired: boolean;
  sortOrder: number;
  tenantId: string;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export type ConditionRequest = Omit<ConditionItem, 'conditionId' | 'tenantId' | 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt'>;

export interface OptionItem {
  value: string | number;
  label: string;
  parent?: string | number;
}

/* 호환성: 기존 컴포넌트가 SearchCondition* 명칭을 사용하던 경우 alias로 유지 */
export type SearchConditionItem = ConditionItem;
export type SearchConditionRequest = ConditionRequest;

/* 사용자 필터 (호환성 유지) */
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
