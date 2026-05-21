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
  fieldName: string;
  displayName: string;
  columnFormat: string;
  nullable: boolean;
}
