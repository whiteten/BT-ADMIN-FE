/**
 * SLEE 채널상태 시각 메타 — AS-IS `channelStatusManagement`(monitoringV4.js) + `monitoring.css`
 * 색을 디자인 토큰에 맞춰 계승. 셀 격자·레전드 칩·막대 차트가 같은 색을 공유.
 *
 * `CHNL_STATUS` 코드 → 상태. (61/62/77/88 은 블럭 변형 — 같은 색 처리)
 */
export interface ChannelStatusMeta {
  key: string;
  label: string;
  /** raw hex — 셀/칩/차트 공통. */
  hex: string;
  /** 장애성 상태(경고·에러) — 셀 펄스 강조. */
  alert?: boolean;
}

export const CHANNEL_STATUS: Record<number, ChannelStatusMeta> = {
  0: { key: 'init', label: '초기', hex: '#1f8fae' },
  1: { key: 'standby', label: '대기', hex: '#9a8a22' },
  2: { key: 'enter', label: '인입', hex: '#d97706' },
  3: { key: 'busy', label: '점유', hex: '#0a8a4a' },
  4: { key: 'outbound', label: 'O/B', hex: '#c2410c' },
  5: { key: 'terminate', label: '종료', hex: '#585858' },
  6: { key: 'block', label: '블럭', hex: '#be185d' },
  7: { key: 'clear', label: '해제', hex: '#9aa0a8' },
  8: { key: 'warning', label: '경고', hex: '#ea580c', alert: true },
  9: { key: 'error', label: '에러', hex: '#c92a2a', alert: true },
  61: { key: 'left-block', label: '블럭L', hex: '#be185d' },
  62: { key: 'right-block', label: '블럭R', hex: '#be185d' },
  77: { key: 'remote-block', label: 'Remote', hex: '#be185d' },
  88: { key: 'local-block', label: 'Local', hex: '#be185d' },
};

/** 레전드 칩 · 막대 차트 표시 순서 (대표 10종). */
export const CHANNEL_STATUS_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export const MEDIA_TYPE_LABELS: Record<number, string> = { 0: 'Voice', 1: 'Web', 2: 'Chat' };
export const ENTRY_PATH_LABELS: Record<number, string> = { 0: 'Unknown', 10: 'Call gate', 20: 'T전화', 30: 'SMS' };
export const INOUT_KIND_LABELS: Record<number, string> = { 10: 'OUT', 20: 'IN', 30: 'BO' };

const UNKNOWN_META: ChannelStatusMeta = { key: 'unknown', label: '-', hex: '#9aa0a8' };

export function channelStatusMeta(code: number | null | undefined): ChannelStatusMeta {
  if (code == null) return UNKNOWN_META;
  return CHANNEL_STATUS[code] ?? { key: 'etc', label: String(code), hex: '#9aa0a8' };
}

/**
 * SLEE 채널 점유 판정 — AS-IS `TB_RM_IR_CHNLSTATUS_SYSTEM` 집계 + BE HealthBoardWidget 동일.
 *  - TDM(IR_TYPE=1): CHNL_STATUS == 1
 *  - SIP(그 외):     CHNL_STATUS in (2,3,4,5)
 */
export function isChannelBusy(irType: number | null | undefined, status: number | null | undefined): boolean {
  if (status == null) return false;
  if (irType === 1) return status === 1;
  return status >= 2 && status <= 5;
}
