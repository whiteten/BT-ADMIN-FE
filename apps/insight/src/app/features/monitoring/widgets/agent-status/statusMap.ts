import type { AlarmLevel, StatusColor, StatusGroup, Threshold } from './types';

/**
 * AGENT_STATUS 코드 → 표시 라벨 + 시맨틱 그룹 + 색상.
 *
 * 레거시 `DAT:CODE:AGENTSTATE` 코드 마스터와 일치.
 * 통화 50 은 REASON_CODE 와 결합해 5010(IB) / 5020(OB) 으로 세분화한다.
 */

export interface StatusMeta {
  label: string;
  group: StatusGroup;
  color: StatusColor;
}

/** status × reasonCode 를 단일 키로 정규화. */
export function statusKey(agentStatus: number | string | undefined, reasonCode: number | string | undefined): string {
  const s = toNum(agentStatus);
  const r = toNum(reasonCode);
  if (s === 50 && (r === 10 || r === 20)) return `${s}${r}`; // 5010 통화IB / 5020 통화OB
  if (s === 41 || s === 42) return String(s); // 대기 IB / OB 분리
  if (s == null) return '0';
  return String(s);
}

const META: Record<string, StatusMeta> = {
  '0': { label: '알 수 없음', group: 'offline', color: 'offline' },
  '10': { label: '로그아웃', group: 'offline', color: 'offline' },
  '20': { label: '로그인', group: 'available', color: 'idle' },
  '30': { label: '이석', group: 'wrapup', color: 'aux' },
  '40': { label: '대기', group: 'available', color: 'idle' },
  '41': { label: '대기 IB', group: 'available', color: 'idle' },
  '42': { label: '대기 OB', group: 'available', color: 'idle' },
  '50': { label: '통화', group: 'talking', color: 'talk' },
  '5010': { label: '통화 IB', group: 'talking', color: 'talk' },
  '5020': { label: '통화 OB', group: 'talking', color: 'talk' },
  '51': { label: '벨울림', group: 'ringing', color: 'ring' },
  '52': { label: '다이얼링', group: 'ringing', color: 'ring' },
  '53': { label: '보류', group: 'wrapup', color: 'hold' },
  '60': { label: '후처리', group: 'wrapup', color: 'wrap' },
};

export function statusMeta(agentStatus: number | string | undefined, reasonCode: number | string | undefined): StatusMeta {
  return META[statusKey(agentStatus, reasonCode)] ?? META['0'];
}

/**
 * 표시용 상태 라벨. 이석(30) + 실제 사유코드면 테넌트별 이석 사유명을 붙여 `이석 · {사유명}` 으로 표시.
 * 사유명은 `reasonNames[`{tenantId}_{reasonCode}`]` (이석 사유 lookup) 에서 조회, 없으면 기본 라벨.
 */
export function agentStatusLabel(
  agentStatus: number | string | undefined,
  reasonCode: number | string | undefined,
  tenantId: number | string | undefined,
  reasonNames?: Record<string, string>,
): string {
  const meta = statusMeta(agentStatus, reasonCode);
  if (statusKey(agentStatus, reasonCode) === '30' && reasonCode != null && Number(reasonCode) !== -1) {
    const nm = reasonNames?.[`${tenantId}_${reasonCode}`];
    if (nm) return `${meta.label} · ${nm}`;
  }
  return meta.label;
}

/**
 * 레거시 `agentStatus.jsp` 11 상태 — 칩 필터·그룹 헤더 요약에서 공통으로 사용.
 * 표시 순서: 로그아웃 → 이석 → 대기(IB/OB) → 통화(IB/OB) → 벨울림 → 다이얼링 → 보류 → 후처리
 */
export const LEGACY_STATE_KEYS: { key: string; label: string }[] = [
  { key: '10', label: '로그아웃' },
  { key: '30', label: '이석' },
  { key: '41', label: '대기 IB' },
  { key: '42', label: '대기 OB' },
  { key: '5010', label: '통화 IB' },
  { key: '5020', label: '통화 OB' },
  { key: '51', label: '벨울림' },
  { key: '52', label: '다이얼링' },
  { key: '53', label: '보류' },
  { key: '60', label: '후처리' },
];

/** 시맨틱 그룹의 표시 라벨. */
export const GROUP_LABEL: Record<StatusGroup, string> = {
  available: '가용',
  talking: '통화',
  ringing: '호출',
  wrapup: '후처리·이석',
  offline: '오프라인',
};

/** 그룹의 대표 컬러 키. */
export const GROUP_COLOR: Record<StatusGroup, StatusColor> = {
  available: 'idle',
  talking: 'talk',
  ringing: 'ring',
  wrapup: 'wrap',
  offline: 'offline',
};

/** StatusColor → CSS 변수 매핑. 하드코딩 0건 — 모든 색은 토큰에서. */
export const COLOR_VAR: Record<StatusColor, string> = {
  idle: 'var(--color-bt-st-idle)',
  talk: 'var(--color-bt-st-talk)',
  ring: 'var(--color-bt-st-ring)',
  hold: 'var(--color-bt-st-hold)',
  wrap: 'var(--color-bt-st-wrap)',
  aux: 'var(--color-bt-st-aux)',
  offline: 'var(--color-bt-st-offline)',
  alert: 'var(--color-bt-st-alert)',
};

/** StatusColor → soft 배경색 (이니셜 원, 카드 헤더 등에 사용). */
export const COLOR_SOFT_VAR: Record<StatusColor, string> = {
  idle: 'var(--color-bt-success-soft)',
  talk: 'var(--color-bt-primary-soft)',
  ring: 'var(--color-bt-warn-soft)',
  hold: 'var(--color-bt-st-wrap-soft)',
  wrap: 'var(--color-bt-st-wrap-soft)',
  aux: 'var(--color-bt-bg-muted)',
  offline: 'var(--color-bt-bg-muted)',
  alert: 'var(--color-bt-danger-soft)',
};

/**
 * 임계 기본값 (초). 키는 statusKey() 출력과 동일.
 * 사용자 위젯 옵션에서 `options.thresholds` 로 오버라이드 가능.
 *
 * - warn   초과 → 주의 (노란 강조)
 * - danger 초과 → 위험 (빨간 강조 + 펄스 보더)
 *
 * 벨울림(51)·다이얼링(52)은 초 단위 압박. 보류(53)는 고객 대기 상태이므로 매우 타이트.
 */
export const DEFAULT_THRESHOLDS: Record<string, Threshold> = {
  '5010': { warn: 300, danger: 600 }, // 통화 IB — 5분/10분
  '5020': { warn: 300, danger: 600 }, // 통화 OB — 5분/10분
  '53': { warn: 30, danger: 120 }, // 보류 — 고객 기다림
  '51': { warn: 6, danger: 18 }, // 벨울림 — 6초/18초
  '52': { warn: 18, danger: 48 }, // 다이얼링
  '60': { warn: 180, danger: 300 }, // 후처리 — 3분/5분
  '30': { warn: 1200, danger: 2400 }, // 이석 — 20분/40분
};

/** 테넌트별 이석 사유 임계 키 — `options.thresholds` 에서 `reason:{tenantId}:{reasonCode}` 로 저장/조회. */
export function reasonThresholdKey(tenantId: number | string, reasonCode: number | string): string {
  return `reason:${tenantId}:${reasonCode}`;
}

/**
 * 현재 상태의 알람 등급 계산.
 * 이석(30)은 테넌트별 사유 임계(`reason:{tenantId}:{reasonCode}`)를 우선 적용하고,
 * 없으면 공통 '30' 임계 → 기본값 순으로 폴백한다.
 */
export function alarmLevel(
  agentStatus: number | string | undefined,
  reasonCode: number | string | undefined,
  tenantId: number | string | undefined,
  durationSec: number,
  overrides?: Record<string, Threshold>,
): AlarmLevel {
  const k = statusKey(agentStatus, reasonCode);
  let th: Threshold | undefined;
  // 이석(30) + 실제 사유코드일 때만 테넌트별 사유 임계. REASON_CODE = -1(사유 없음)은 공통 '30'.
  if (k === '30' && tenantId != null && reasonCode != null && Number(reasonCode) !== -1) {
    th = overrides?.[reasonThresholdKey(tenantId, reasonCode)];
  }
  if (!th) th = overrides?.[k] ?? DEFAULT_THRESHOLDS[k];
  if (!th) return 0;
  if (durationSec > th.danger) return 2;
  if (durationSec > th.warn) return 1;
  return 0;
}

/**
 * 지정상담사 카테고리 컬러 (0/10/20/30/40/50).
 * 좌측 상단 6×6 컬러 태그로 사용. 미지정(0)은 투명.
 */
export const CATEGORY_COLOR: Record<string, string> = {
  '0': 'transparent',
  '10': '#ff5a5f',
  '20': '#ffb547',
  '30': '#b8f37b',
  '40': '#6ee0ff',
  '50': '#c8b3ff',
};

function toNum(v: number | string | undefined | null): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}
