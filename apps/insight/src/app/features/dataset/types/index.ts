export interface DataSourceListItem {
  datasetId: number;
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
  datasetId: number;
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
  datasetId: number;
  datasourceName: string;
  productCode: string;
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
  fields?: DataSourceFieldRequest[];
}

export interface DatasetUpdateRequest {
  datasourceName: string;
  dbViewPrefix?: string;
  availableUnits?: string;
  tenantColumn?: string;
  description?: string;
  fields?: DataSourceFieldRequest[];
}

export interface PrefixCandidate {
  dbViewPrefix: string;
  availableUnits: string[];
  suggestedKey: string;
  suggestedProductCode: string;
}

export type ColumnFormatValue = 'Number' | 'Decimal' | 'Rate' | 'String' | 'Date' | 'Time';

export type ValidationStatus = 'unchecked' | 'checking' | 'valid' | 'invalid' | 'stale';

export interface ValidateFieldsRequest {
  dbViewPrefix?: string; // 신규 생성 모드
  datasetId?: number; // 편집 모드 (서버에서 prefix 조회)
  fields: string[];
  calcExpressions: { alias: string; expression: string }[];
}

export interface ValidateFieldsResult {
  valid: boolean;
  executionMs: number;
  errors: string[];
}

export interface DataSourceFieldRequest {
  fieldName: string;
  displayName: string;
  fieldType: string;
  fieldRole: string;
  formatterType?: string | null;
  formatterOptions?: string | null;
  isVisible: boolean;
  sortOrder: number;
  description?: string | null;
}

export interface LocalFieldDisplay {
  fieldName: string;
  displayName: string;
  fieldType: 'DIM' | 'MSR';
  columnFormat: ColumnFormatValue;
  isVisible: boolean;
  sortOrder: number;
  aggFunc?: 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT' | null;
  isCalcField?: boolean;
  rawFieldType?: string;
  rawFieldRole?: string;
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
