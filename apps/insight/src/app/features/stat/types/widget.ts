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
  groupHeaderName?: string;
  sortOrder: number;
  // Column role flags (legacy)
  groupYn?: boolean;
  selectYn?: boolean;
  valueYn?: boolean;
  whereYn?: boolean;
  pivotYn?: boolean;
  compareYn?: boolean;
  footerHideYn?: boolean;
  refColYn?: boolean;
  // Data
  agg?: string; // Unselected|Sum|Avg|Max|Min|Cnt
  format?: string; // Unselected|Number|String|Time|Rate|Date|Decimal
  filter?: string; // Unselected|=|>=|<=|BETWEEN|IN|NOT IN
  // Derived/computed — kept for BE compatibility
  showInGrid?: boolean;
  aggregation?: string;
}

export interface WidgetCalcFieldItem {
  id: number;
  fieldName: string;
  displayName: string;
  alias?: string;
  groupHeaderName?: string;
  formula: string;
  fieldType: string;
  sortOrder: number;
  groupYn?: boolean;
  selectYn?: boolean;
  valueYn?: boolean;
  whereYn?: boolean;
  footerHideYn?: boolean;
  refColYn?: boolean;
  agg?: string;
  format?: string;
  filter?: string;
  showInGrid?: boolean;
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
