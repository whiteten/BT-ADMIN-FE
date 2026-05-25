/**
 * 인사이트 모니터링 v0.1 — 타입 정의
 * 설계서: docs/insight/monitoring/00-OVERVIEW.md, 01-MONITORING.md, 02-MONITORING-UI.md
 */

// ─── 도메인 / 공용 ─────────────────────────────────────────────────────────

export type DomainCode = 'IE' | 'IC' | 'IR';

export type DashboardStatus = 'DRAFT' | 'PUBLISHED';

export type VizType = 'GRID' | 'BAR' | 'LINE' | 'CARD';

export type KpiDirection = 'HIGHER_BETTER' | 'LOWER_BETTER' | 'NEUTRAL';

export type FieldDataType = 'STRING' | 'NUMBER' | 'DATE' | 'DATETIME' | 'TIME' | 'BOOLEAN';

export type ColumnFormat = 'Number' | 'Decimal' | 'Rate' | 'String' | 'Date' | 'Time';

/** 데이터셋 베이스 타입 — XML(Redis) 또는 SQL(DB 직접 쿼리). 어댑터(baseRef)는 BE에서 자동 결정 (M5). */
export type DatasetBaseType = 'XML' | 'SQL';

// ─── 대시보드 (§2) ─────────────────────────────────────────────────────────

export interface DashboardListItem {
  dashboardId: number;
  dashboardCode: string;
  dashboardName: string;
  domainCode: DomainCode;
  description?: string;
  status: DashboardStatus;
  menuRegistered: boolean;
  templateWidgetCount: number;
  customWidgetCount: number;
  layoutWidth: number; // grid cols (12 고정)
  layoutHeight: number; // 사용된 row 수
  createdAt: string;
  updatedAt: string;
}

export interface DashboardCreateDatas {
  dashboardName: string;
  domainCode: DomainCode;
  description?: string;
}

export interface DashboardUpdateDatas {
  dashboardName?: string;
  description?: string;
  status?: DashboardStatus;
}

export interface DashboardDetail extends DashboardListItem {
  widgets: Widget[];
}

// ─── 위젯 (§3~§7) ──────────────────────────────────────────────────────────

export type WidgetKind = 'TEMPLATE' | 'CUSTOM';

export interface WidgetPosition {
  row: number;
  col: number;
  w: number; // col span (max 12)
  h: number; // row span
}

export interface TemplateWidgetMapping {
  GRID?: { columns: string[] };
  BAR?: { x: string; y: string[] }; // y max 2 (이중축)
  LINE?: { x: string; y: string[] }; // x DATE 필수
  CARD?: {
    measure: string;
    unit?: string;
    kpiDirection?: KpiDirection;
    threshold?: { warn?: number; danger?: number };
  };
}

export interface BaseWidget {
  widgetId: number;
  dashboardId: number;
  widgetName: string;
  kind: WidgetKind;
  position: WidgetPosition;
}

export interface TemplateWidget extends BaseWidget {
  kind: 'TEMPLATE';
  datasetId: number;
  datasetName?: string;
  visualizations: VizType[];
  defaultViz: VizType;
  mapping: TemplateWidgetMapping;
  refreshInterval: number; // sec
}

export interface CustomWidget extends BaseWidget {
  kind: 'CUSTOM';
  widgetTypeId: string;
  widgetTypeName?: string;
  options: Record<string, unknown>;
}

export type Widget = TemplateWidget | CustomWidget;

// ─── 위젯 생성 요청 ──────────────────────────────────────────────────────────

export interface TemplateWidgetCreateDatas {
  kind: 'TEMPLATE';
  widgetName: string;
  datasetId: number;
  visualizations: VizType[];
  defaultViz: VizType;
  mapping: TemplateWidgetMapping;
  refreshInterval: number;
  position: WidgetPosition;
}

export interface CustomWidgetCreateDatas {
  kind: 'CUSTOM';
  widgetName: string;
  widgetTypeId: string;
  options: Record<string, unknown>;
  position: WidgetPosition;
}

export type WidgetCreateDatas = TemplateWidgetCreateDatas | CustomWidgetCreateDatas;

// ─── 커스텀 위젯 카탈로그 (§4-B) ──────────────────────────────────────────────

export interface CustomWidgetCatalogItem {
  widgetTypeId: string;
  widgetName: string;
  domainCode: DomainCode;
  description?: string;
  defaultOptions?: Record<string, unknown>;
  minW: number;
  minH: number;
}

// ─── 데이터셋 (XML 기반) (§1, §1-A) ─────────────────────────────────────────

export interface DatasetListItem {
  datasetId: number;
  datasetCode: string;
  datasetName: string;
  domainCode: DomainCode;
  baseType: DatasetBaseType;
  fieldCount: number;
  lookupCount: number;
  virtualFieldCount: number;
  usageWidgetCount: number;
  updatedAt: string;
}

export interface DatasetField {
  fieldId?: number;
  columnName: string;
  classification: 'DIM' | 'MSR';
  displayName: string;
  dataType: FieldDataType;
  columnFormat: ColumnFormat;
  isVisible: boolean;
  orderNo: number;
  isVirtual?: boolean; // 룩업 가상 필드 여부
  parentField?: string; // 가상 필드의 부모 코드 필드
}

export interface CalcField {
  calcFieldId?: number;
  fieldCode: string;
  displayName: string;
  rowExpression: string;
  columnFormat: ColumnFormat;
  classification: 'DIM' | 'MSR';
  dataType: FieldDataType;
}

export interface DatasetDetail {
  datasetId: number;
  datasetCode: string;
  datasetName: string;
  domainCode: DomainCode;
  baseType: DatasetBaseType;
  baseRef: string; // adapter id — BE 자동 결정 (XML=redis-hash, SQL=jdbc-query)
  description?: string;
  schemaSnapshot: string; // baseType=XML이면 XML 원본, SQL이면 SELECT 문
  fields: DatasetField[];
  calcFields: CalcField[];
  createdAt: string;
  updatedAt: string;
}

export interface DatasetCreateDatas {
  datasetCode: string;
  datasetName: string;
  domainCode: DomainCode;
  description?: string;
  baseType: DatasetBaseType;
  schemaSnapshot: string;
  fields: DatasetField[];
  calcFields: CalcField[];
}

// ─── 코드 룩업 (§1-B) ───────────────────────────────────────────────────────

export type LookupJoinType = 'LEFT' | 'INNER';
export type LookupMissPolicy = 'PASSTHROUGH' | 'EMPTY' | 'UNKNOWN';

export interface LookupCatalogItem {
  lookupCatalogId: number;
  displayName: string;
  tableName: string;
  category?: string;
  description?: string;
  recommendedKey: string;
  recommendedValues: string[];
  registeredBy?: string; // ADMIN 즉석 등록자
  usageCount: number;
}

export interface SchemaColumn {
  name: string;
  type: FieldDataType;
  nullable: boolean;
  isPrimaryKey?: boolean;
}

export interface SchemaPreview {
  tableName: string;
  selectGranted: boolean;
  rowCount?: number;
  columns: SchemaColumn[];
}

export interface LookupCatalogCreateDatas {
  displayName: string;
  tableName: string;
  category?: string;
  description?: string;
  recommendedKey: string;
  recommendedValues: string[];
}

export interface DatasetLookupField {
  lookupFieldId?: number;
  masterColumn: string;
  outputFieldName: string;
  dataType: FieldDataType;
  displayName?: string;
  orderNo: number;
}

export interface DatasetLookup {
  lookupId?: number;
  datasetId: number;
  lookupCatalogId: number;
  catalogDisplayName?: string;
  catalogTableName?: string;
  sourceField: string;
  keyColumn: string;
  joinType: LookupJoinType;
  cacheTtlSec: number;
  missPolicy?: LookupMissPolicy;
  fields: DatasetLookupField[];
}

// ─── 글로벌 옵션 (§8) ───────────────────────────────────────────────────────

export interface GlobalOptions {
  searchConditions: Record<string, unknown>; // 검색조건 카탈로그 값 (예: { dept: ['D001','D002'] })
  refreshThrottle: 1 | 3 | 5 | 10 | 'PAUSED';
}

// ─── WebSocket 메시지 (§8, §9) ──────────────────────────────────────────────

export type WsConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface WsSubscribeMessage {
  type: 'SUBSCRIBE';
  widgetId: string;
  kind: WidgetKind;
  datasetId?: number;
  widgetTypeId?: string;
  options: Record<string, unknown>;
}

export interface WsDataMessage {
  type: 'DATA';
  widgetId: string;
  serverTs: number;
  data: unknown;
}

export interface WsConnectedMessage {
  type: 'CONNECTED';
  sessionId: string;
  tenantId: number;
}

export interface WsUnsubscribeMessage {
  type: 'UNSUBSCRIBE';
  widgetId: string;
}
