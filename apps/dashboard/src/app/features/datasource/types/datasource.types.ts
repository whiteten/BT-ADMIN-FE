/**
 * 데이터소스 관련 타입 정의
 */

export interface DataSourceItem {
  datasourceKey: string;
  datasourceName: string;
  productCode: string;
  sourceType: string;
  dbTablePrefix?: string;
  dbTimeUnits?: string;
  redisKeyPattern?: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
  tenantId: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  fields: DataSourceFieldItem[];
}

export interface DataSourceFieldItem {
  id: number;
  datasourceKey: string;
  fieldName: string;
  displayName: string;
  fieldType: string;
  fieldRole: string;
  sortOrder: number;
  description?: string;
}

export interface DataSourceRequest {
  datasourceKey: string;
  datasourceName: string;
  productCode: string;
  sourceType: string;
  dbTablePrefix?: string;
  dbTimeUnits?: string;
  redisKeyPattern?: string;
  description?: string;
  fields?: DataSourceFieldRequest[];
}

export interface DataSourceFieldRequest {
  fieldName: string;
  displayName: string;
  fieldType: string;
  fieldRole: string;
  sortOrder?: number;
  description?: string;
}

export interface SchemaLoadRequest {
  tableName: string;
}

export interface SchemaLoadResponse {
  tableName: string;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  columnName: string;
  dataType: string;
  dataLength?: number;
  comment?: string;
  nullable: boolean;
  suggestedFieldType: string;
  suggestedFieldRole: string;
}
