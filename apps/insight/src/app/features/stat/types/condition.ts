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

export type SearchConditionItem = ConditionItem;
export type SearchConditionRequest = ConditionRequest;
