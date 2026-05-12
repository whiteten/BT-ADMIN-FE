export type WidgetVisualization = 'LINE' | 'BAR' | 'PIE' | 'DONUT' | 'GRID';

export interface WidgetItem {
  widgetId: number;
  widgetType: string;
  widgetName: string;
  description?: string;
  category: string;
  icon?: string;
  visualization?: WidgetVisualization;
  refreshMode: string;
  refreshInterval?: number;
  defaultW: number;
  defaultH: number;
  minW?: number;
  minH?: number;
  chartConfig?: string;
  tenantId: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  dataSources: WidgetDataSourceItem[];
  fieldMappings: WidgetFieldMappingItem[];
  calculatedFields: WidgetCalcFieldItem[];
  searchBindings: WidgetSearchBindItem[];
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
  formatterType?: 'NUMBER' | 'PERCENT' | 'CURRENCY' | 'DURATION' | 'DATETIME' | 'MASK' | 'NONE';
  formatterOptions?: string;
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
  sortOrder: number;
  formatterType?: 'NUMBER' | 'PERCENT' | 'CURRENCY' | 'DURATION' | 'DATETIME' | 'MASK' | 'NONE';
  formatterOptions?: string;
}

export interface WidgetSearchBindItem {
  id: number;
  conditionId: number;
  bindDatasourceKey: string;
  bindFieldName: string;
  sortOrder: number;
}

export interface WidgetRequest {
  widgetType: string;
  widgetName: string;
  description?: string;
  category: string;
  icon?: string;
  visualization?: WidgetVisualization;
  refreshMode: string;
  refreshInterval?: number;
  defaultW: number;
  defaultH: number;
  chartConfig?: string;
  dataSources?: { datasourceKey: string; sortOrder?: number }[];
  fieldMappings?: Omit<WidgetFieldMappingItem, 'id'>[];
  calculatedFields?: Omit<WidgetCalcFieldItem, 'id'>[];
  searchBindings?: { conditionId: number; bindDatasourceKey: string; bindFieldName: string; sortOrder?: number }[];
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
