/**
 * 인사이트 모니터링 v0.1 — 타입 정의
 * 설계서: docs/insight/monitoring/00-OVERVIEW.md, 01-MONITORING.md, 02-MONITORING-UI.md
 */

// ─── 도메인 / 공용 ─────────────────────────────────────────────────────────

export type DomainCode = 'IE' | 'IC' | 'IR';

/** 대시보드 카드 아이콘 — 보고서(ReportIconType)와 동일 세트. */
export type DashboardIconType = 'agent' | 'cti' | 'ivr' | 'channel' | 'system';

export type DashboardStatus = 'DRAFT' | 'PUBLISHED';

export type VizType = 'GRID' | 'BAR' | 'LINE' | 'CARD';

export type KpiDirection = 'HIGHER_BETTER' | 'LOWER_BETTER' | 'NEUTRAL';

export type FieldDataType = 'STRING' | 'NUMBER' | 'DATE' | 'DATETIME' | 'TIME' | 'BOOLEAN';

export type ColumnFormat = 'Number' | 'Decimal' | 'Rate' | 'String' | 'Date' | 'Time';

/**
 * 데이터셋 베이스 타입(소스 종류). 어댑터(baseRef)는 BE에서 자동 결정.
 * - REDIS: Redis Hash 직접 읽기 (키 패턴 + 트리 탐색으로 컬럼 발견)
 * - QUERY: 테이블/뷰 SELECT (DB 직접 쿼리)
 * - EXTERNAL: 외부 API 연동 (미구현 — 고도화 예정)
 */
export const DATASET_BASE_TYPE = {
  REDIS: 'REDIS',
  QUERY: 'QUERY',
  EXTERNAL: 'EXTERNAL',
} as const;

export type DatasetBaseType = (typeof DATASET_BASE_TYPE)[keyof typeof DATASET_BASE_TYPE];

/**
 * REDIS 값 모드 — Hash 해석 방식.
 * - JSON_PER_FIELD: value가 JSON. 행=field, 컬럼=value JSON 키
 * - HASH_AS_ROW: field=지표명·value=스칼라. 행=키, 컬럼=field 이름들
 */
export type DatasetValueMode = 'JSON_PER_FIELD' | 'HASH_AS_ROW';

/** REDIS 컬럼 출처. JSON(value JSON 키) / HASH_FIELD(field명) / KEY_SEGMENT(키 세그먼트) / FIELD_SUBKEY(field 위치분해). */
export type DatasetFieldSource = 'JSON' | 'HASH_FIELD' | 'KEY_SEGMENT' | 'FIELD_SUBKEY';

// ─── 대시보드 (§2) ─────────────────────────────────────────────────────────

export interface DashboardListItem {
  dashboardId: number;
  dashboardName: string;
  domainCode: DomainCode;
  description?: string;
  /** 목록 카드 아이콘 (보고서와 동일 세트). */
  iconType?: DashboardIconType;
  status: DashboardStatus;
  menuRegistered: boolean;
  templateWidgetCount: number;
  customWidgetCount: number;
  widgetNames?: string[]; // 대시보드 구성을 한눈에 보기 위한 위젯 명칭 리스트
  layoutWidth: number; // grid cols (12 고정)
  layoutHeight: number; // 사용된 row 수
  createdAt: string;
  updatedAt: string;
}

export interface DashboardCreateDatas {
  dashboardName: string;
  domainCode: DomainCode;
  description?: string;
  iconType?: DashboardIconType;
}

export interface DashboardUpdateDatas {
  dashboardName?: string;
  description?: string;
  status?: DashboardStatus;
  iconType?: DashboardIconType;
}

export interface DashboardDetail extends DashboardListItem {
  widgets: Widget[];
}

// ─── 위젯 (§3~§7) ──────────────────────────────────────────────────────────

export type WidgetKind = 'TEMPLATE' | 'CUSTOM' | 'PLACEHOLDER';

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

export interface PlaceholderWidget extends BaseWidget {
  kind: 'PLACEHOLDER';
}

export type Widget = TemplateWidget | CustomWidget | PlaceholderWidget;

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

// ─── 위젯 라이브러리 (§4-B) ──────────────────────────────────────────────

/** 위젯 카테고리 분류. */
export type WidgetCategory = 'KPI' | 'CHART' | 'TABLE' | 'STATUS' | 'GENERIC' | 'MISC';

export interface CustomWidgetCatalogItem {
  widgetTypeId: string;
  widgetName: string;
  domainCode: DomainCode;
  description?: string;
  defaultOptions?: Record<string, unknown>;
  /** 기본 settings(JSON) — 사용자 미저장 시 위젯 설정 기본값으로 바인딩됨. */
  defaultSettings?: Record<string, unknown>;
  minW: number;
  minH: number;
  /** 카테고리 분류. */
  widgetCategory: WidgetCategory;
  /** 위젯 종류 (CUSTOM=커스텀, TEMPLATE=템플릿) */
  kind: 'CUSTOM' | 'TEMPLATE';
  /** 관리 화면 읽기전용 — Spring Bean 이름. */
  beBeanName?: string;
  /** 관리 화면 읽기전용 — FE 컴포넌트 식별자. */
  feComponent?: string;
  /** 관리 화면 읽기전용 — 등록 시각(ISO). */
  createdAt?: string;
}

/** 위젯 카탈로그 수정 요청 — 변경 허용 컬럼만(BE 화이트리스트와 일치). */
export interface CustomWidgetCatalogUpdateDatas {
  widgetName: string;
  description?: string;
  domainCode: DomainCode;
  widgetCategory: WidgetCategory;
  minW: number;
  minH: number;
  /** 위젯 타입별 구조화 폼이 만든 settings 객체. */
  defaultSettings: Record<string, unknown>;
}

// ─── 재사용 템플릿 위젯 정의 (라이브러리) ─────────────────────────────────────
// 대시보드 인스턴스(Widget)와 달리 dashboardId·position 이 없는 "원본 정의".

export interface TemplateWidgetDefinitionListItem {
  templateWidgetId: number;
  widgetName: string;
  description?: string;
  domainCode: DomainCode;
  datasetId: number;
  datasetName?: string;
  visualizations: VizType[];
  defaultViz: VizType;
  refreshInterval?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateWidgetDefinitionDetail extends TemplateWidgetDefinitionListItem {
  mapping: TemplateWidgetMapping;
  /** Step2 위젯 단 필드 override (표시명·노출·서식). */
  fieldOverrides: Record<string, unknown>;
  cardKpiDirection?: KpiDirection;
  layoutW?: number;
  layoutH?: number;
}

export interface TemplateWidgetDefinitionCreateDatas {
  widgetName: string;
  description?: string;
  domainCode: DomainCode;
  datasetId: number;
  visualizations: VizType[];
  defaultViz: VizType;
  mapping: TemplateWidgetMapping;
  fieldOverrides?: Record<string, unknown>;
  refreshInterval?: number;
  cardKpiDirection?: KpiDirection;
  layoutW?: number;
  layoutH?: number;
}

// ─── 데이터셋 (REDIS / QUERY / EXTERNAL) (§1, §1-A) ──────────────────────────

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
  source?: DatasetFieldSource; // REDIS 컬럼 출처
  sourceRef?: string; // SOURCE 보조값 (KEY_SEGMENT=세그먼트 인덱스 등)
}

export interface CalcField {
  calcFieldId?: number;
  fieldCode: string;
  displayName: string;
  rowExpression: string;
  columnFormat: ColumnFormat;
  classification: 'DIM' | 'MSR';
  dataType: FieldDataType;
  /** 위젯에서 노출 여부. 기본 true. BE Entity는 IS_VISIBLE 컬럼과 매핑. (optional — 구버전 BE 응답 호환) */
  isVisible?: boolean;
}

export interface DatasetDetail {
  datasetId: number;
  datasetCode: string;
  datasetName: string;
  domainCode: DomainCode;
  baseType: DatasetBaseType;
  baseRef: string; // adapter id — BE 자동 결정 (REDIS=redis-hash, QUERY=jdbc-query)
  description?: string;
  schemaSnapshot: string; // 소스 공통 운반체 — REDIS=키 패턴 / QUERY=SELECT 문 / EXTERNAL=config(JSON, 미구현)
  valueMode?: DatasetValueMode; // REDIS 전용 — JSON_PER_FIELD / HASH_AS_ROW
  fields: DatasetField[];
  calcFields: CalcField[];
  lookups: DatasetLookup[];
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
  valueMode?: DatasetValueMode; // REDIS 전용 — JSON_PER_FIELD / HASH_AS_ROW
  fields: DatasetField[];
  calcFields: CalcField[];
  /** 코드 룩업 정의 (N개). 데이터셋과 한 트랜잭션에 저장. */
  lookups: DatasetLookup[];
}

// ─── 모니터링 설정 (config — 범용 category/key/value) ───────────────────────

/** 모니터링 설정 카테고리 — REDIS_PREFIX(데이터 소스 키 패턴 화이트리스트) 등. */
export const MON_CONFIG_CATEGORY = {
  REDIS_PREFIX: 'REDIS_PREFIX',
} as const;
export type MonConfigCategory = (typeof MON_CONFIG_CATEGORY)[keyof typeof MON_CONFIG_CATEGORY];

/** 설정 응답 1건. */
export interface MonConfigItem {
  configCategory: string;
  configKey: string;
  configValue?: string;
  valueType: string;
  description?: string;
  isEnabled: boolean;
  sortOrder: number;
  updatedBy?: string;
  updatedAt?: string;
}

/** 카테고리 일괄 저장(교체) 항목 — category는 URL path. */
export interface MonConfigSaveItem {
  configKey: string;
  configValue?: string;
  valueType?: string;
  description?: string;
  isEnabled: boolean;
  sortOrder: number;
}

// ─── 코드 룩업 (§1-B) ───────────────────────────────────────────────────────

export type LookupJoinType = 'LEFT' | 'INNER';
export type LookupMissPolicy = 'PASSTHROUGH' | 'EMPTY' | 'UNKNOWN';

/**
 * 룩업 런타임 WHERE 조건 — 마스터 테이블 조회 시 추가 필터.
 * <br/>예: `{ column: 'STATUS', operator: '=', values: ['A'] }`
 * <br/>NULL 계열 연산자는 values 무시. IN/NOT IN은 values 전체 사용.
 */
export type LookupWhereOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'NOT IN' | 'IS NULL' | 'IS NOT NULL';

export interface LookupWhereCondition {
  column: string;
  operator: LookupWhereOperator;
  values?: string[];
}

export interface LookupCatalogItem {
  lookupCatalogId: number;
  displayName: string;
  tableName: string;
  category?: string;
  description?: string;
  recommendedKey: string;
  recommendedValues: string[];
  whereConditions?: LookupWhereCondition[];
  registeredBy?: string; // ADMIN 즉석 등록자
  usageCount: number;
}

export interface SchemaColumn {
  name: string;
  type: FieldDataType;
  nullable: boolean;
  isPrimaryKey?: boolean;
  /** USER_COL_COMMENTS의 한글 코멘트 — 없으면 null */
  comment?: string | null;
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
  whereConditions?: LookupWhereCondition[];
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
//
// BE INSIGHT MonitoringWebSocketHandler 와 envelope 통일.
// 메시지 키 규약 — `widgetType` 단일 키 (FCA 모니터링 패턴). TEMPLATE/CUSTOM 분기는
// v0.1 범위에서 CUSTOM 만 지원하므로 `kind`·`datasetId`·`widgetTypeId` 등 분기 키 제거.
// TEMPLATE 위젯 활성화 시 BE 에서 `widgetType = "template-{datasetId}-{viz}"` 같은
// 정규화된 키로 매핑하여 호환.

export type WsConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

/** 클라이언트 → 서버: 위젯 구독 등록. */
export interface WsSubscribeMessage {
  type: 'SUBSCRIBE';
  widgetId: string;
  widgetType: string;
  options?: Record<string, unknown>;
}

/** 클라이언트 → 서버: 위젯 구독 해제. */
export interface WsUnsubscribeMessage {
  type: 'UNSUBSCRIBE';
  widgetId: string;
}

/** 서버 → 클라이언트: 연결 수립 시 wsId 발급. */
export interface WsConnectedMessage {
  type: 'CONNECTED';
  wsId: string;
}

/** 서버 → 클라이언트: 구독 수락 응답. */
export interface WsSubscribedMessage {
  type: 'SUBSCRIBED';
  wsId: string;
  widgetId: string;
  widgetType: string;
}

/** 서버 → 클라이언트: 구독 해제 응답. */
export interface WsUnsubscribedMessage {
  type: 'UNSUBSCRIBED';
  wsId: string;
  widgetId: string;
}

/** 서버 → 클라이언트: 위젯 데이터 프레임 (구독 직후 + 주기 푸시). */
export interface WsDataMessage {
  type: 'DATA';
  wsId: string;
  widgetId: string;
  widgetType: string;
  data: unknown;
}

/** 서버 → 클라이언트: 에러. */
export interface WsErrorMessage {
  type: 'ERROR';
  wsId?: string;
  widgetId?: string;
  message: string;
}

export type WsServerMessage = WsConnectedMessage | WsSubscribedMessage | WsUnsubscribedMessage | WsDataMessage | WsErrorMessage;
