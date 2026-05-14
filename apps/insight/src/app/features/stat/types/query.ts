export interface StatisticsPreviewRequest {
  datasourceKey: string;
  globalFilters: {
    period: { from: string; to: string };
    timeUnit: string;
  };
  fieldNames: string[];
  searchValues: Record<string, unknown>;
}

export interface StatisticsQueryColumn {
  fieldName: string;
  displayName: string;
  fieldType: string;
}

export interface StatisticsQueryResponse {
  columns: StatisticsQueryColumn[];
  rows: Array<Record<string, unknown>>;
  totalCount: number;
}
