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

/** StatusColor → 펄스 애니메이션 utility class (실시간 활동성 표현). */
export const PULSE_CLASS: Record<StatusColor, string> = {
  idle: 'bt-pulse-idle',
  talk: 'bt-pulse-talk',
  ring: 'bt-pulse-ring',
  hold: 'bt-pulse-wrap',
  wrap: 'bt-pulse-wrap',
  aux: '',
  offline: '',
  alert: 'bt-pulse-alert',
};

/**
 * 임계 기본값 (분). 키는 statusKey() 출력과 동일.
 * 사용자 위젯 옵션에서 `options.thresholds` 로 오버라이드 가능.
 *
 * - notice 초과 → 주의 (노란 강조)
 * - alarm  초과 → 임계 (빨간 강조 + 펄스 보더)
 *
 * 벨울림(51)·다이얼링(52)은 초 단위 압박이라 0.1분(=6초) 기준.
 * 보류(53)는 고객 대기 상태이므로 매우 타이트.
 */
export const DEFAULT_THRESHOLDS: Record<string, Threshold> = {
  '5010': { notice: 5, alarm: 10 }, // 통화 IB
  '5020': { notice: 5, alarm: 10 }, // 통화 OB
  '53': { notice: 0.5, alarm: 2 }, // 보류 — 고객 기다림
  '51': { notice: 0.1, alarm: 0.3 }, // 벨울림 — 6초/18초
  '52': { notice: 0.3, alarm: 0.8 }, // 다이얼링
  '60': { notice: 3, alarm: 5 }, // 후처리
  '30': { notice: 20, alarm: 40 }, // 이석
};

/** 현재 상태의 알람 등급 계산. */
export function alarmLevel(
  agentStatus: number | string | undefined,
  reasonCode: number | string | undefined,
  durationSec: number,
  overrides?: Record<string, Threshold>,
): AlarmLevel {
  const k = statusKey(agentStatus, reasonCode);
  const th = overrides?.[k] ?? DEFAULT_THRESHOLDS[k];
  if (!th) return 0;
  const m = durationSec / 60;
  if (m > th.alarm) return 2;
  if (m > th.notice) return 1;
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
