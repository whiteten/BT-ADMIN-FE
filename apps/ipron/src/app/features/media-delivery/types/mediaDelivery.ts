/**
 * 미디어전달관리 타입 정의
 * AS-IS: IPR20S1093 (TB_IE_MD_GROUP, TB_IE_MEDIA_DELIVERY)
 * TO-BE: BT-ADMIN-SERVICE-IPRON mediadelivery feature
 */

// ─── Enum 라벨 매핑 ─────────────────────────────────────────────────────────

/** 벤더 (MEDIA_DELIVERY_VENDOR) — DB 공통코드 기준: 1=브리지텍/2=루키스/3=동방정보통신 */
export const MD_VENDOR_OPTIONS = [
  { label: '브리지텍', value: 1 },
  { label: '루키스', value: 2 },
  { label: '동방정보통신', value: 3 },
] as const;

export const MD_VENDOR_LABELS: Record<number, string> = {
  1: '브리지텍',
  2: '루키스',
  3: '동방정보통신',
};

/** Transport 타입 — DB 공통코드 기준: 1=UDP/2=TCP/4=TLS (TRANSPORT_TYPE&systemKind=IE 앞3개) */
export const TRANSPORT_TYPE_OPTIONS = [
  { label: 'UDP', value: 1 },
  { label: 'TCP', value: 2 },
  { label: 'TLS', value: 4 },
] as const;

export const TRANSPORT_TYPE_LABELS: Record<number, string> = {
  1: 'UDP',
  2: 'TCP',
  4: 'TLS',
};

/** RTP 전송타입 */
export const RTP_TRANS_TYPE_OPTIONS = [
  { label: 'RTP', value: 0 },
  { label: 'SRTP', value: 1 },
] as const;

export const RTP_TRANS_TYPE_LABELS: Record<number, string> = {
  0: 'RTP',
  1: 'SRTP',
};

/** HA 형상 */
export const HA_TYPE_OPTIONS = [
  { label: 'None', value: 0 },
  { label: 'Active-Standby', value: 1 },
  { label: 'Active-Active', value: 2 },
] as const;

export const HA_TYPE_LABELS: Record<number, string> = {
  0: 'None',
  1: 'Active-Standby',
  2: 'Active-Active',
};

/** SRTP (음성보안) */
export const SRTP_YN_OPTIONS = [
  { label: '미사용', value: 0 },
  { label: '사용', value: 1 },
] as const;

export const SRTP_YN_LABELS: Record<number, string> = {
  0: '미사용',
  1: '사용',
};

/** IP 버전 */
export const IP_VERSION_OPTIONS = [
  { label: 'IPv4', value: 4 },
  { label: 'IPv6', value: 6 },
] as const;

export const IP_VERSION_LABELS: Record<number, string> = {
  4: 'IPv4',
  6: 'IPv6',
};

/** 상태체크 타입 */
export const CHECK_TYPE_OPTIONS = [
  { label: 'None', value: 0 },
  { label: 'OPTIONS', value: 1 },
  { label: 'REGISTER', value: 2 },
] as const;

export const CHECK_TYPE_LABELS: Record<number, string> = {
  0: 'None',
  1: 'OPTIONS',
  2: 'REGISTER',
};

/** Block 여부 */
export const BLOCK_YN_OPTIONS = [
  { label: 'OFF', value: 0 },
  { label: 'ON', value: 1 },
] as const;

export const BLOCK_YN_LABELS: Record<number, string> = {
  0: 'OFF',
  1: 'ON',
};

/** 장비 상태 (Redis) */
export const MD_STATE_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: '장애', color: '#ef4444' },
  1: { label: '정상', color: '#16a34a' },
  2: { label: '준비', color: '#eab308' },
};

// ─── Backend Response 타입 ──────────────────────────────────────────────────

/**
 * 미디어전달그룹 응답
 */
export interface MdGrp {
  grpId: number;
  nodeId: number;
  nodeName: string;
  grpName: string;
  itemCount: number;
}

/**
 * 미디어전달 아이템 응답
 */
export interface MdItem {
  mediaDeliveryId: number;
  mediaDeliveryGrpId: number;
  nodeId: number;
  mediaDeliveryName: string;
  grpName: string;
  nodeName: string;
  mediaDeliveryVendor: number | null;
  transportType: number;
  rtpTransType: number | null;
  haType: number | null;
  srtpYn: number;
  ipVersion: number;
  ipAddr1: string;
  portNo1: number;
  ipAddr2: string | null;
  portNo2: number | null;
  // Redis states (from backend)
  redisState1?: number | null;
  redisState2?: number | null;
  stateUpdateTime1?: string | null;
  stateUpdateTime2?: string | null;
  checkType1?: number | null;
  checkType2?: number | null;
  chkInterval1?: number | null;
  chkInterval2?: number | null;
  failCnt1?: number | null;
  failCnt2?: number | null;
  blockYn1?: number | null;
  blockYn2?: number | null;
  extOptions1?: string | null;
  extOptions2?: string | null;
}

// ─── Request 타입 ───────────────────────────────────────────────────────────

export interface MdGrpCreateRequest {
  nodeId: number;
  grpName: string;
}

export type MdGrpUpdateRequest = MdGrpCreateRequest;

export interface MdItemCreateRequest {
  mediaDeliveryGrpId: number;
  nodeId: number;
  mediaDeliveryName: string;
  mediaDeliveryVendor: number | null;
  transportType: number;
  rtpTransType: number | null;
  haType: number | null;
  srtpYn: number;
  ipVersion: number;
  ipAddr1: string;
  portNo1: number;
  ipAddr2: string | null;
  portNo2: number | null;
  // 부가정보
  checkType1: number | null;
  chkInterval1: number | null;
  failCnt1: number | null;
  blockYn1: number | null;
  extOptions1: string | null;
  checkType2: number | null;
  chkInterval2: number | null;
  failCnt2: number | null;
  blockYn2: number | null;
  extOptions2: string | null;
}

export type MdItemUpdateRequest = MdItemCreateRequest;

// ─── 노드별 그룹 ────────────────────────────────────────────────────────────

export interface NodeMdGrpGroup {
  nodeId: number;
  nodeName: string;
  mdGrps: MdGrp[];
}

// ─── 초기값 ─────────────────────────────────────────────────────────────────

export const MD_GRP_INITIAL_VALUES: Partial<MdGrpCreateRequest> = {
  grpName: '',
};

export const MD_ITEM_INITIAL_VALUES: Partial<MdItemCreateRequest> = {
  mediaDeliveryName: '',
  mediaDeliveryVendor: 1,
  transportType: 1,
  rtpTransType: 0,
  haType: 0,
  srtpYn: 0,
  ipVersion: 4,
  ipAddr1: '',
  portNo1: 5060,
  ipAddr2: '',
  portNo2: 5060,
  checkType1: 0,
  chkInterval1: 60,
  failCnt1: 3,
  blockYn1: 0,
  extOptions1: '',
  checkType2: 0,
  chkInterval2: 60,
  failCnt2: 3,
  blockYn2: 0,
  extOptions2: '',
};
