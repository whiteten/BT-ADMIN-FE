export interface DataSourceListItem {
  datasourceKey: string;
  domain: string;
  displayName: string;
  description?: string;
  grainType: '10MIN' | 'HOURLY' | 'DAILY' | 'MONTHLY' | 'YEARLY';
}

export interface DataSourceDetail extends DataSourceListItem {
  fields: FieldMetaItem[];
}

export interface FieldMetaItem {
  id: number;
  datasourceKey: string;
  fieldName: string;
  displayName: string;
  fieldType: string; // "STRING" | "NUMBER"
  fieldRole: string; // "DIMENSION" | "MEASURE" | "TIMESTAMP"
  formatterType: string | null;
  formatterOptions: string | null;
  isVisible: boolean;
  sortOrder: number;
  description: string | null;
}

// ─── Dataset v5.0 ─────────────────────────────────────────────────────────────

export interface DatasetListItem {
  datasourceKey: string;
  datasourceName: string;
  productCode: string;
  sourceType: string;
  dbViewPrefix: string;
  availableUnits: string[];
  tenantColumn: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
}

export interface DatasetDetail extends DatasetListItem {
  tenantId: string;
  createdBy?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  fields: FieldMetaItem[];
}

export interface DatasetCreateRequest {
  datasourceName: string;
  productCode?: string;
  dbViewPrefix: string;
  availableUnits?: string;
  tenantColumn?: string;
  description?: string;
}

export interface DatasetUpdateRequest {
  datasourceName: string;
  dbViewPrefix?: string;
  availableUnits?: string;
  tenantColumn?: string;
  description?: string;
}

export interface PrefixCandidate {
  dbViewPrefix: string;
  availableUnits: string[];
  suggestedKey: string;
  suggestedProductCode: string;
}

export type ColumnFormatValue = 'Number' | 'Decimal' | 'Rate' | 'String' | 'Date' | 'Time';

export interface LocalFieldDisplay {
  fieldName: string;
  displayName: string;
  fieldType: 'DIM' | 'MSR';
  columnFormat: ColumnFormatValue;
  isVisible: boolean;
  sortOrder: number;
  aggFunc?: 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT' | null;
  isCalcField?: boolean; // calc field synced from LocalCalcFieldDraft
}

export interface LocalCalcFieldDraft {
  _localId: string;
  fieldCode: string;
  displayName: string;
  rowExpression: string;
  aggExpression?: string;
  columnFormat: ColumnFormatValue;
  kpiDirection: 'HIGHER_BETTER' | 'LOWER_BETTER' | 'NEUTRAL';
}
