/**
 * 위젯 관련 타입 정의
 */

export interface WidgetItem {
  widgetId: number;
  widgetType: string;
  widgetName: string;
  description?: string;
  category: string;
  icon?: string;
  visualization?: string;
  refreshMode: string;
  refreshInterval?: number;
  defaultW: number;
  defaultH: number;
  minW?: number;
  minH?: number;
  chartConfig?: string;
  customMfeApp?: string;
  customComponent?: string;
  tenantId: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  dataSources: WidgetDataSourceItem[];
  fieldMappings: WidgetFieldMappingItem[];
  calculatedFields: WidgetCalcFieldItem[];
  searchBindings: WidgetSearchBindItem[];
  joinConditions: WidgetJoinItem[];
}

export interface WidgetDataSourceItem {
  id: number;
  datasourceKey: string;
  sortOrder: number;
}

export interface WidgetFieldMappingItem {
  id: number;
  datasourceKey: string;
  fieldName: string;
  alias?: string;
  showInGrid: boolean;
  chartRole?: string;
  sortOrder: number;
  aggregation?: string;
  showRatio?: boolean;
  format?: string;
  cardSlot?: string;
  displayType?: string;
  displayFormat?: string;
  thresholdMinor?: number;
  thresholdMajor?: number;
  thresholdCritical?: number;
}

export interface WidgetCalcFieldItem {
  id: number;
  fieldName: string;
  displayName: string;
  formula: string;
  fieldType: string;
  showInGrid: boolean;
  chartRole?: string;
  showRatio?: boolean;
  format?: string;
  displayType?: string;
  displayFormat?: string;
  thresholdMinor?: number;
  thresholdMajor?: number;
  thresholdCritical?: number;
  sortOrder: number;
}

export interface WidgetSearchBindItem {
  id: number;
  conditionId: number;
  bindDatasourceKey: string;
  bindFieldName: string;
  sortOrder: number;
}

export interface WidgetJoinItem {
  id: number;
  leftDatasourceKey: string;
  leftFieldName: string;
  rightDatasourceKey: string;
  rightFieldName: string;
  joinType: string;
  sortOrder: number;
}

export interface WidgetRequest {
  widgetType: string;
  widgetName: string;
  description?: string;
  category: string;
  icon?: string;
  visualization?: string;
  refreshMode: string;
  refreshInterval?: number;
  defaultW: number;
  defaultH: number;
  minW?: number;
  minH?: number;
  chartConfig?: string;
  customMfeApp?: string;
  customComponent?: string;
  dataSources?: { datasourceKey: string; sortOrder?: number }[];
  fieldMappings?: Omit<WidgetFieldMappingItem, 'id'>[];
  calculatedFields?: Omit<WidgetCalcFieldItem, 'id'>[];
  searchBindings?: { conditionId: number; bindDatasourceKey: string; bindFieldName: string; sortOrder?: number }[];
  joinConditions?: Omit<WidgetJoinItem, 'id'>[];
}

export interface FormulaValidateRequest {
  formula: string;
  availableFields?: string[];
}

export interface FormulaValidateResponse {
  valid: boolean;
  resultType?: string;
  errors: string[];
  referencedFields: string[];
  usedFunctions: string[];
}
