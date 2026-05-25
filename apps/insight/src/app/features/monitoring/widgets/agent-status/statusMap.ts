import type { StatusColor, StatusGroup } from './types';

/**
 * AGENT_STATUS 코드 → 표시 라벨 + 시맨틱 그룹 + 색상.
 * 시안 `05-agent-monitor-widget.html` §5 상태 범례와 1:1 일치.
 */
export interface StatusMeta {
  label: string;
  group: StatusGroup;
  color: StatusColor;
}

/** 단일 정규화 키 (status × reasonCode 조합). */
export function statusKey(agentStatus: number | string | undefined, reasonCode: number | string | undefined): string {
  const s = toNum(agentStatus);
  const r = toNum(reasonCode);
  if (s === 50 && (r === 10 || r === 20)) return `${s}${r}`; // 5010 통화IB / 5020 통화OB
  if (s === 41 || s === 42) return String(s); // 대기 IB / OB
  if (s === null) return '0';
  return String(s);
}

const META: Record<string, StatusMeta> = {
  '10': { label: '로그아웃', group: 'offline', color: 'muted' },
  '20': { label: '로그인', group: 'available', color: 'success' },
  '30': { label: '이석', group: 'wrapup', color: 'muted' },
  '40': { label: '대기', group: 'available', color: 'success' },
  '41': { label: '대기 IB', group: 'available', color: 'success' },
  '42': { label: '대기 OB', group: 'available', color: 'success' },
  '50': { label: '통화', group: 'talking', color: 'primary' },
  '5010': { label: '통화IB', group: 'talking', color: 'primary' },
  '5020': { label: '통화OB', group: 'talking', color: 'primary' },
  '51': { label: '벨울림', group: 'ringing', color: 'warn' },
  '52': { label: '다이얼링', group: 'ringing', color: 'warn' },
  '53': { label: '보류', group: 'wrapup', color: 'wrap' },
  '60': { label: '후처리', group: 'wrapup', color: 'wrap' },
};

export function statusMeta(agentStatus: number | string | undefined, reasonCode: number | string | undefined): StatusMeta {
  return META[statusKey(agentStatus, reasonCode)] ?? { label: '알 수 없음', group: 'offline', color: 'muted' };
}

/** 단일 시맨틱 그룹의 색상. 시안 5-chip 헤더에 사용. */
export const GROUP_COLOR: Record<StatusGroup, StatusColor> = {
  available: 'success',
  talking: 'primary',
  ringing: 'warn',
  wrapup: 'wrap',
  offline: 'muted',
};

export const GROUP_LABEL: Record<StatusGroup, string> = {
  available: '가용',
  talking: '통화',
  ringing: '호출',
  wrapup: '후처리·이석',
  offline: '오프라인',
};

/** 시안 §4 임계값 기본 (분 단위, status×reason 키별). 사용자 위젯 옵션에서 오버라이드. */
export const DEFAULT_THRESHOLDS: Record<string, { notice: number; alarm: number }> = {
  '5010': { notice: 5, alarm: 10 }, // 통화IB
  '5020': { notice: 5, alarm: 10 }, // 통화OB
  '53': { notice: 1, alarm: 3 }, // 보류
  '60': { notice: 3, alarm: 5 }, // 후처리
  '30': { notice: 20, alarm: 40 }, // 이석/식사 기본
};

function toNum(v: number | string | undefined): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}
