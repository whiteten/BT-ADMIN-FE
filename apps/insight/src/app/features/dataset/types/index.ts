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

export type ColumnFormatValue = 'Number' | 'Decimal' | 'Rate' | 'String' | 'Date' | 'Time';

export interface LocalFieldDisplay {
  fieldName: string;
  displayName: string;
  fieldType: 'DIM' | 'MSR';
  columnFormat: ColumnFormatValue;
  isVisible: boolean;
  sortOrder: number;
  aggFunc?: 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT' | null;
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
