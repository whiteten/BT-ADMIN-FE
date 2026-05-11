export interface DataSourceItem {
  datasourceKey: string;
  datasourceName: string;
  productCode: string;
  dbViewPrefix: string;
  availableUnits: string[];
  tenantColumn: string;
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
  fieldType: 'NUMBER' | 'STRING' | 'DATETIME';
  fieldRole: 'DIMENSION' | 'MEASURE' | 'TIMESTAMP';
  formatterType?: 'NUMBER' | 'PERCENT' | 'CURRENCY' | 'DURATION' | 'DATETIME' | 'MASK' | 'NONE';
  formatterOptions?: string;
  isVisible: boolean;
  sortOrder: number;
  description?: string;
}

export interface DataSourceRequest {
  datasourceName: string;
  productCode: string;
  dbViewPrefix: string;
  description?: string;
}

export interface PrefixCandidate {
  dbViewPrefix: string;
  availableUnits: string[];
  suggestedKey: string;
  suggestedProductCode: string;
}

export interface SchemaLoadRequest {
  datasourceKey: string;
}

export interface SchemaLoadResponse {
  datasourceKey: string;
  fields: DataSourceFieldItem[];
}
