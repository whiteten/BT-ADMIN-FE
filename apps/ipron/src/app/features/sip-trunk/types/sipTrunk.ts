/**
 * SIP 트렁크(테넌트) 도메인 타입 (SWAT IPR20S3030, GDN_TYPE=18, 마스터 TB_IE_SIP_TRUNK).
 *
 * BE: BT-ADMIN-SERVICE-IPRON
 *  - /api/ipron/sip-gdns         (좌패널 그룹DN GDN_TYPE=18 CRUD)
 *  - /api/ipron/sip-trunks       (우패널 트렁크 마스터 CRUD + 노드 요약 + 채널 사용량)
 *  - /api/ipron/sip-trunk-members(그룹DN ↔ 트렁크 N:N 멤버 배정)
 */

// ──────────────────────────────────────────────────────────
//  그룹DN (GDN_TYPE=18) — 좌패널
// ──────────────────────────────────────────────────────────

export interface SipGdnResponse {
  gdnId: number;
  gdnNo: string;
  gdnName: string;
  gdnType: number; // 18=SIP 트렁크

  nodeId: number | null;
  backUpNodeId: number | null;
  backUpNodeName: string | null;
  globalDnYn: number | null;

  companyId: number | null;
  tenantId: number | null;
  tenantName: string | null;

  maxWaitcnt: number | null;
  maxWaittime: number | null;
  blockYn: number | null;

  // 초기구성 탭 (SWAT IPR20S3030 GDN_TYPE=18 정합)
  closeType: number | null; // CALL_CLOSE_TYPE: 0=정상종료, 1=멘트후종료, 2=우회DN/GDN라우팅, 3=멘트후우회
  routingKind: number | null; // ACD_ROUTING_KIND: 1=우선순위, 2=순차, 3=랜덤, 4=직접
  blockRoutingDnis: string | null; // 차단 우회 DNIS (max 24)
  errorRoutingDnis: string | null; // 오류 우회 DNIS (max 24)
  busyRoutingDnis: string | null; // 만석 우회 DNIS (max 24)

  // 접근코드 프로파일 (BE SipGdnResponse:43-44 정합)
  accessCodeProfileId: number | null;
  drAccessCodeProfileId: number | null;

  /** 이 그룹DN 에 배정된 SIP 트렁크 멤버 수 (mockup "배정 트렁크" 컬럼) */
  assignedTrunkCount: number;

  createDate?: string | null;
  workUser?: number | null;
  workTime?: string | null;
}

export interface SipGdnCreateRequest {
  nodeId: number;
  tenantId: number;
  gdnNo: string;
  gdnName: string;
  backUpNodeId?: number | null;
  globalDnYn?: number | null;
  maxWaitcnt?: number | null;
  maxWaittime?: number | null;
  blockYn?: number | null;
  // 초기구성 탭
  closeType?: number | null;
  routingKind?: number | null;
  blockRoutingDnis?: string | null;
  errorRoutingDnis?: string | null;
  busyRoutingDnis?: string | null;
  // 접근코드 프로파일 (BE SipGdnCreateRequest:42-43 정합)
  accessCodeProfileId?: number | null;
  drAccessCodeProfileId?: number | null;
}

/** nodeId / tenantId / gdnNo 불변 */
export type SipGdnUpdateRequest = Omit<SipGdnCreateRequest, 'nodeId' | 'tenantId' | 'gdnNo'>;

// ──────────────────────────────────────────────────────────
//  트렁크 마스터 — 우패널
// ──────────────────────────────────────────────────────────

export interface SipTrunkResponse {
  sipTrunkId: number;
  sipTrunkName: string;
  sipTrunkNo: string;
  sipTrunkDesc: string | null;

  sipTrunkKind: number | null; // 1=IPRON-IE, 9=3rd party PBX
  sipTrunkKindName: string | null;

  sipTrunkIpv4: string | null;
  sipTrunkIpv6: string | null;
  ipVersion: number | null; // 4 / 6
  portNo: number | null;

  companyId: number | null;
  tenantId: number | null;
  tenantName: string | null;
  nodeId: number | null;
  nodeName: string | null;
  backUpNodeId: number | null;
  backUpNodeName: string | null;
  globalDnYn: number | null;

  startDn: string | null;
  chnlCnt: number | null;
  totChannelCount: number | null; // 점유 채널 합계 (게이지)

  blockYn: number | null;
  transportType: number | null; // 1=UDP, 2=TCP, 4=TLS
  trkAuthtype: number | null; // 1=고정IP, 2=동적IP
  trkIpUpdate: number | null;
  callTraceYn: number | null; // 호추적 여부 (SWAT CALL_TRACE_YN)
  allocDelayTime: number | null;
  ssRefreshType: number | null;
  registYn: number | null;
  registSeconds: number | null;

  msGroupId: number | null;
  msDrgroupId: number | null;
  natOption: number | null;
  drnatOption: number | null;
  enatOption: number | null;
  dnProfileId: number | null;

  ctiUse: number | null;
  sipOption: string | null;

  createDate?: string | null;
  workUser?: number | null;
  workTime?: string | null;
}

export interface SipTrunkCreateRequest {
  nodeId: number;
  tenantId: number;
  companyId?: number | null;

  sipTrunkName: string;
  sipTrunkNo: string;
  sipTrunkDesc?: string | null;

  sipTrunkKind: number;
  ipVersion: number;
  sipTrunkIpv4?: string | null;
  sipTrunkIpv6?: string | null;
  portNo: number;
  transportType: number;

  startDn?: string | null;
  chnlCnt?: number | null;

  blockYn?: number | null;
  trkAuthtype?: number | null;
  trkIpUpdate?: number | null;
  callTraceYn?: number | null; // 호추적 여부 (SWAT CALL_TRACE_YN)
  allocDelayTime?: number | null;
  ssRefreshType?: number | null;
  registYn?: number | null;
  registSeconds?: number | null;

  backUpNodeId?: number | null;
  globalDnYn?: number | null;
  msGroupId?: number | null;
  msDrgroupId?: number | null;
  natOption?: number | null;
  drnatOption?: number | null;
  enatOption?: number | null;
  dnProfileId?: number | null;

  ctiUse?: number | null;
  sipOption?: string | null;
}

/** nodeId / tenantId 불변 */
export type SipTrunkUpdateRequest = Omit<SipTrunkCreateRequest, 'nodeId' | 'tenantId' | 'companyId'>;

/** 노드별 트렁크 현황 요약 (카드 슬라이더용) */
export interface SipTrunkNodeSummary {
  nodeId: number | null;
  nodeName: string | null;
  trunkCount: number;
  totalChnl: number;
  usedChnl: number;
  blockedCount: number;
}

/** 트렁크 점유 채널 단건 (게이지) */
export interface ChannelUsage {
  sipTrunkId: number;
  chnlCnt: number | null;
  usedChnl: number | null;
}

// ──────────────────────────────────────────────────────────
//  멤버 배정 (그룹DN ↔ 트렁크 N:N)
// ──────────────────────────────────────────────────────────

export interface SipTrunkMemberResponse {
  sipTrunkId: number;
  targetName: string | null;
  targetNo: string | null;

  nodeId: number | null;
  nodeName: string | null;
  backUpNodeId: number | null;
  backUpNodeName: string | null;

  tenantId: number | null;
  tenantName: string | null;

  gdnId: number | null;
  gdnMember: string | null;

  memberPriority: number | null;
  chnlCnt: number | null;
  totChannelCount: number | null;
  channelLimitCount: number | null;

  assignYn: boolean;
  workUser?: number | null;
  workTime?: string | null;
}

export interface SipTrunkMemberSaveRow {
  sipTrunkId: number;
  assignYn: boolean;
  memberPriority: number;
  channelLimitCount: number;
}

export interface SipTrunkMemberSaveRequest {
  gdnId: number;
  rows: SipTrunkMemberSaveRow[];
  agreeChannelOverflow: boolean;
}

export interface SipTrunkMemberSaveResult {
  added: number;
  updated: number;
  removed: number;
}

/** 그룹DN 셀렉터 옵션 */
export interface SipGdnOption {
  gdnId: number;
  gdnNo: string;
  gdnName: string;
  nodeId: number | null;
}

// ──────────────────────────────────────────────────────────
//  Enum / Lookup
// ──────────────────────────────────────────────────────────

/** tenantScope=tenant → 테넌트 귀속 트렁크(TENANT_ID<>0)만 */
export type TenantScope = 'tenant' | 'common';

export const SIP_TRUNK_KIND_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'IPRON-IE' },
  { value: 9, label: '3rd party PBX' },
];

export const TRANSPORT_TYPE_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'UDP' },
  { value: 2, label: 'TCP' },
  { value: 4, label: 'TLS' },
];

export const IP_VERSION_OPTIONS: { value: number; label: string }[] = [
  { value: 4, label: 'IPv4' },
  { value: 6, label: 'IPv6' },
];

export const IP_AUTH_TYPE_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '고정IP' },
  { value: 2, label: '동적IP' },
];

/** CALL_CLOSE_TYPE (SWAT IPR20S3030 GDN_TYPE=18 초기구성 탭) */
export const CLOSE_TYPE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: '정상 종료' },
  { value: 1, label: '멘트 후 종료' },
  { value: 2, label: '우회 DN/GDN 라우팅' },
  { value: 3, label: '멘트 후 우회 DN/GDN 라우팅' },
];

/** ACD_ROUTING_KIND (SWAT 정합 — 읽기 전용 표시용) */
export const ROUTING_KIND_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '우선순위' },
  { value: 2, label: '순차' },
  { value: 3, label: '랜덤' },
  { value: 4, label: '직접' },
];

export function getSipTrunkKindName(v: number | null | undefined): string {
  if (v == null) return '-';
  return SIP_TRUNK_KIND_OPTIONS.find((o) => o.value === v)?.label ?? String(v);
}
