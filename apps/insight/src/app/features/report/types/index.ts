export type DomainCode = 'IE' | 'IC' | 'IR';
export type ReportIconType = 'agent' | 'cti' | 'ivr' | 'channel' | 'system';
export type TimeUnit = '10MIN' | 'HOURLY' | 'DAILY' | 'MONTHLY' | 'YEARLY';
export type ComparisonType = 'PREV_DAY' | 'PREV_WEEK' | 'PREV_MONTH' | 'PREV_YEAR';
export type ColumnFormat = 'Number' | 'Decimal' | 'Rate' | 'String' | 'Date' | 'Time';
export type FieldType = 'DIM' | 'MSR';
export type PanelType = 'GRID' | 'BAR' | 'LINE' | 'PIE' | 'RADAR' | 'KPI';
export type AggFunc = 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT';
export type KpiDirection = 'HIGHER_BETTER' | 'LOWER_BETTER' | 'NEUTRAL';
export type SlotType = 'ROW' | 'COLUMN' | 'X_AXIS' | 'Y_AXIS' | 'SERIES' | 'SLICE' | 'VALUE' | 'AXIS' | 'SORT' | 'LIMIT' | 'FILTER' | 'KPI';

export interface ReportListItem {
  reportId: number;
  title: string;
  description?: string;
  domain: DomainCode;
  datasetId: number;
  /** 보고서 패널들이 사용하는 데이터셋명 목록 (distinct, 이름순). v5.0 패널 단위 데이터셋. */
  datasetNames?: string[];
  isPublished: boolean;
  ownerUserId: number;
  updatedAt: string;
  iconType?: ReportIconType;
}

export interface ReportDetail {
  reportId: number;
  title: string;
  description?: string;
  domain: DomainCode;
  datasetId: number;
  iconType?: ReportIconType;
  isPublished: boolean;
  ownerUserId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReportFullDetail extends ReportDetail {
  fieldDisplays: FieldDisplay[];
  calcFields: CalcField[];
  searchBindings: SearchBinding[];
  panels: PanelDetail[];
}

export interface FieldDisplay {
  fieldName: string;
  isVisible: boolean;
  fieldType: FieldType;
  columnFormat: ColumnFormat;
  displayName: string;
}

export interface CalcField {
  calcFieldId: number;
  fieldCode: string;
  displayName: string;
  rowExpression: string;
  aggExpression?: string;
  columnFormat: ColumnFormat;
  kpiDirection: KpiDirection;
}

export interface SearchBinding {
  bindId: number;
  searchCondId: number;
  title: string;
  bindOrder: number;
  requiredYn: boolean;
  defaultValue?: unknown;
}

export interface PanelFieldMap {
  mapId?: number;
  slotType: SlotType;
  slotOrder: number;
  fieldName: string;
  isCalcField: boolean;
  aggFunc?: AggFunc;
  columnFormat?: ColumnFormat;
  isAxisRight?: boolean;
  xAxisMode?: 'DIMENSION' | 'MEASURE';
  sortDirection?: 'ASC' | 'DESC';
  topN?: number;
  otherGrouping?: boolean;
  searchCondId?: number;
  /** FILTER 슬롯 cascade: 이 컬럼이 검색조건의 어느 단계(node)에 매핑되는지 (G4-b). 단일 조건은 미지정. */
  nodeCode?: string;
}

export interface PanelLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BarChartOptions {
  direction?: 'vertical' | 'horizontal';
  style?: 'simple' | 'grouped' | 'stacked';
  dataLabel?: boolean;
  goalLine?: { enabled: boolean; value?: number };
  legend?: boolean;
}

export interface LineChartOptions {
  dataLabel?: boolean;
  goalLine?: { enabled: boolean; value?: number };
  legend?: boolean;
}

export interface PieChartOptions {
  donut?: boolean;
  labelType?: 'name' | 'value' | 'percent';
  centerTotal?: boolean;
  legend?: boolean;
}

export interface RadarChartOptions {
  dataLabel?: boolean;
  legend?: boolean;
}

export interface GridOptions {
  showSumRow?: boolean;
}

export type ChartOptions = GridOptions | BarChartOptions | LineChartOptions | PieChartOptions | RadarChartOptions;

export interface PanelDetail {
  panelId: number;
  reportId: number;
  panelType: PanelType;
  title: string;
  /** 패널 데이터셋 (패널마다 다른 데이터셋 가능) */
  datasetId: number;
  layout: PanelLayout;
  chartOptions?: ChartOptions;
  fieldMap: PanelFieldMap[];
}

export interface ReportCreateDatas {
  title: string;
  domain: DomainCode;
  datasetId: number;
  description?: string;
  iconType?: ReportIconType;
}

export interface ReportUpdateDatas {
  title: string;
  domain: DomainCode;
  datasetId: number;
  description?: string;
  iconType?: ReportIconType;
}

export interface PanelCreateDatas {
  panelType: PanelType;
  title: string;
  datasetId: number;
  layout: PanelLayout;
  chartOptions?: ChartOptions;
  fieldMap: PanelFieldMap[];
}

export interface PanelLayoutUpdateItem {
  panelId: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CalcFieldCreateDatas {
  fieldCode: string;
  displayName: string;
  rowExpression: string;
  aggExpression?: string;
  columnFormat: ColumnFormat;
  kpiDirection: KpiDirection;
}

export interface SearchBindingCreateDatas {
  searchCondId: number;
  bindOrder: number;
  requiredYn: boolean;
  defaultValue?: unknown;
}
