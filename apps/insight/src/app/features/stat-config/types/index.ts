/**
 * 통계 글로벌 정책(TB_BT_IS_STAT_CONFIG) 타입 정의 — v3.1 (D71/D99).
 *
 * 카테고리:
 *  ① TIMEUNIT_LIMIT — 시간 단위별 최대 조회 기간(일). 단위 최소폭(floor) 이상 필수(무제한 불가).
 *  ② FORMAT         — 숫자 표시 기본값 (DECIMAL_PLACES / THOUSANDS_SEP / LOCALE). 소비처 GlobalFormatPolicy.
 *  ③ QUERY_STRATEGY — 집계 테이블 라우팅 (ROUTING_MODE). 소비처 DatasetQueryEngine.
 */

/** 설정 카테고리. */
export type StatConfigCategory = 'TIMEUNIT_LIMIT' | 'FORMAT' | 'QUERY_STRATEGY';

/** 값 타입. */
export type StatConfigValueType = 'STRING' | 'NUMBER' | 'JSON';

/** 시간 단위 코드. */
export type TimeUnitCode = 'MI' | 'HH' | 'DD' | 'MM' | 'YY';

/** 라우팅 모드. */
export type RoutingMode = 'PREFER_POSTFIX' | 'MI_ONLY';

/** 단건 설정 응답(BE StatConfigResponse 대응). */
export interface StatConfigItem {
  configCategory: string;
  configKey: string;
  configValue: string | null;
  valueType: string;
  description: string | null;
  tenantId: string;
  createdBy?: string | null;
  createdAt?: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

/** 일괄 저장 요청 항목(BE StatConfigBulkRequest.Item 대응). */
export interface StatConfigSaveItem {
  configCategory: StatConfigCategory;
  configKey: string;
  configValue: string | null;
  valueType: StatConfigValueType;
  description?: string | null;
}

/** 일괄 저장 요청 본문. */
export interface StatConfigBulkSaveRequest {
  configs: StatConfigSaveItem[];
}

// ─── ① TIMEUNIT_LIMIT ────────────────────────────────────────────────────────

/** 조회 기간 제한 폼 값(일 수). 단위 최소폭(floor) 이상 필수(무제한 불가). */
export interface TimeUnitLimitForm {
  MI: number;
  HH: number;
  DD: number;
  MM: number;
  YY: number;
}

/** 단위별 메타 — 라벨/설명/최소폭(floor). floor 이상만 허용(무제한 불가). */
export interface TimeUnitMeta {
  code: TimeUnitCode;
  label: string;
  symbol: string;
  description: string;
  floor: number;
}

export const TIME_UNIT_METAS: TimeUnitMeta[] = [
  { code: 'MI', label: '분 단위', symbol: '분', description: '분 단위 보고서 조회 시 최대 검색 기간 · 1일 이상 필수', floor: 1 },
  { code: 'HH', label: '시 단위', symbol: '시', description: '시 단위 보고서 조회 시 최대 검색 기간 · 1일 이상 필수', floor: 1 },
  { code: 'DD', label: '일 단위', symbol: '일', description: '일 단위 보고서 조회 시 최대 검색 기간 · 1일 이상 필수', floor: 1 },
  { code: 'MM', label: '월 단위', symbol: '월', description: '월 단위 보고서 조회 시 최대 검색 기간 · 31일 이상 필수 (월 1개 ≥ 31일)', floor: 31 },
  { code: 'YY', label: '년 단위', symbol: '년', description: '년 단위 보고서 조회 시 최대 검색 기간 · 366일 이상 필수', floor: 366 },
];

/** 시드 기본값(V64 + V92). 분 7 / 시 31 / 일 730 / 월 3650 / 년 1825(5년). */
export const DEFAULT_TIME_UNIT_LIMIT: TimeUnitLimitForm = {
  MI: 7,
  HH: 31,
  DD: 730,
  MM: 3650,
  YY: 1825,
};

// ─── ② FORMAT ────────────────────────────────────────────────────────────────

/** 표시 형식 폼 값. */
export interface FormatForm {
  /** 소수점 자릿수 (DECIMAL_PLACES). */
  decimalPlaces: number;
  /** 천단위 구분 사용 (THOUSANDS_SEP). */
  thousandsSep: boolean;
  /** 로캘 (LOCALE). */
  locale: string;
}

/** FORMAT 시드 기본값(V64). */
export const DEFAULT_FORMAT: FormatForm = {
  decimalPlaces: 2,
  thousandsSep: true,
  locale: 'ko-KR',
};

/** 로캘 선택지. */
export const LOCALE_OPTIONS: { value: string; label: string }[] = [
  { value: 'ko-KR', label: '한국어 (ko-KR)' },
  { value: 'en-US', label: 'English (en-US)' },
  { value: 'ja-JP', label: '日本語 (ja-JP)' },
];

// ─── ③ QUERY_STRATEGY ────────────────────────────────────────────────────────

/** 쿼리 전략 폼 값. */
export interface QueryStrategyForm {
  /** 집계 테이블 라우팅 모드 (ROUTING_MODE). */
  routingMode: RoutingMode;
}

/** QUERY_STRATEGY 시드 기본값(V64). */
export const DEFAULT_QUERY_STRATEGY: QueryStrategyForm = {
  routingMode: 'PREFER_POSTFIX',
};

/** 라우팅 모드 선택지. */
export const ROUTING_MODE_OPTIONS: { value: RoutingMode; label: string; description: string }[] = [
  { value: 'PREFER_POSTFIX', label: 'PREFER_POSTFIX', description: '단위별 사전집계(postfix) 테이블 우선 — 빠름' },
  { value: 'MI_ONLY', label: 'MI_ONLY', description: '분(MI) 원천 테이블만 사용해 런타임 집계 — 정확하지만 느림' },
];
