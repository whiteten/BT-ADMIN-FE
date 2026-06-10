/**
 * DN 관리 Enum 라벨 매핑
 * SD-DN-MANAGEMENT.md 기준
 * - dnType:       11=EDN(내선), 12=AGT(상담), 13=TDN(트렁크)
 * - dnStatus:     0=미등록, 1=등록
 * - ipVersion:    4=IPv4, 6=IPv6
 * - transportType: udp/tcp/tls/ws/wss
 * - extAuthtype:  1=고정IP, 2=동적IP
 * - adnDftState:  1=대기, 2=휴식, 3=후처리(ACW), 4=이석, 9=기타
 */
import type { AdnDefaultState, DnStatus, DnType, ExtAuthType, IpVersion, TransportType } from '../types';

// ─── DN 유형 ────────────────────────────────────────────────────────────────

export const DN_TYPE_LABELS: Record<DnType, string> = {
  '11': 'EDN (내선)',
  '12': 'AGT (상담)',
  '13': 'TDN (트렁크)',
};

export const DN_TYPE_SHORT_LABELS: Record<DnType, string> = {
  '11': 'EDN',
  '12': 'AGT',
  '13': 'TDN',
};

export const DN_TYPE_OPTIONS = [
  { label: 'EDN (내선)', value: '11' as DnType },
  { label: 'AGT (상담)', value: '12' as DnType },
  { label: 'TDN (트렁크)', value: '13' as DnType },
];

// 1차 범위에서 노출되는 유형만 (AS-IS: 11 고정)
export const DN_TYPE_OPTIONS_PRIMARY = [{ label: 'EDN (내선)', value: '11' as DnType }];

// ─── DN 상태 ────────────────────────────────────────────────────────────────

export const DN_STATUS_LABELS: Record<DnStatus, string> = {
  '0': '미등록',
  '1': '등록',
};

export const DN_STATUS_OPTIONS = [
  { label: '미등록', value: '0' as DnStatus },
  { label: '등록', value: '1' as DnStatus },
];

// ─── IP 버전 ────────────────────────────────────────────────────────────────

export const IP_VERSION_LABELS: Record<IpVersion, string> = {
  '4': 'IPv4',
  '6': 'IPv6',
};

export const IP_VERSION_OPTIONS = [
  { label: 'IPv4', value: '4' as IpVersion },
  { label: 'IPv6', value: '6' as IpVersion },
];

// ─── 전송 유형 ──────────────────────────────────────────────────────────────

export const TRANSPORT_TYPE_LABELS: Record<TransportType, string> = {
  '1': 'UDP',
  '2': 'TCP',
  '4': 'TLS',
  '8': 'WS/DTLS',
  '16': 'WSS/DTLS',
};

export const TRANSPORT_TYPE_OPTIONS = [
  { label: 'UDP', value: '1' as TransportType },
  { label: 'TCP', value: '2' as TransportType },
  { label: 'TLS', value: '4' as TransportType },
  { label: 'WS/DTLS', value: '8' as TransportType },
  { label: 'WSS/DTLS', value: '16' as TransportType },
];

// ─── 인증 유형 (ExtAuthType) ────────────────────────────────────────────────

export const EXT_AUTH_TYPE_LABELS: Record<ExtAuthType, string> = {
  '1': '고정 IP',
  '2': '동적 IP',
};

export const EXT_AUTH_TYPE_OPTIONS = [
  { label: '고정 IP', value: '1' as ExtAuthType },
  { label: '동적 IP', value: '2' as ExtAuthType },
];

// ─── 상담원 기본 상태 ───────────────────────────────────────────────────────

export const ADN_DEFAULT_STATE_LABELS: Record<AdnDefaultState, string> = {
  '1': '대기',
  '2': '휴식',
  '3': '후처리',
  '4': '이석',
  '9': '기타',
};

export const ADN_DEFAULT_STATE_OPTIONS = [
  { label: '대기', value: '1' as AdnDefaultState },
  { label: '휴식', value: '2' as AdnDefaultState },
  { label: '후처리', value: '3' as AdnDefaultState },
  { label: '이석', value: '4' as AdnDefaultState },
];

// ─── Boolean(0/1) 라벨 헬퍼 ─────────────────────────────────────────────────

/** 0/1 -> O/X */
export const BOOL_OX_LABEL = (v: number | null | undefined): string => (v === 1 ? 'O' : v === 0 ? 'X' : '-');

/** 0/1 -> 설정/해제 */
export const BOOL_ON_OFF_LABEL = (v: number | null | undefined): string => (v === 1 ? '설정' : v === 0 ? '해제' : '-');

/** 0/1 -> 사용/사용안함 */
export const BOOL_USE_LABEL = (v: number | null | undefined): string => (v === 1 ? '사용' : v === 0 ? '사용안함' : '-');
