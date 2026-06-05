/**
 * 공용 트렁크 (노드 공용, 테넌트 무관) 도메인 타입.
 *
 * AS-IS: SWAT IPR20S3030 (tenant=공통/0 케이스).
 * BE: BT-ADMIN-SERVICE-IPRON `/api/ipron/sip-trunks` + `/api/ipron/sip-gdns`
 *     + `/api/ipron/sip-trunk-members` — 모두 `tenantScope=common` 고정 호출.
 *
 * SIP 트렁크(테넌트)와 같은 TB_IE_TRUNK 이나 테넌트 귀속 없음(TENANT_ID=0).
 * 차원은 노드만(테넌트 차원 없음).
 */

// ──────────────────────────────────────────────────────────
//  노드 카드/탭 요약 (SipTrunkNodeSummary)
// ──────────────────────────────────────────────────────────

export interface CommonTrunkNodeSummary {
  nodeId: number | null;
  nodeName: string | null;
  trunkCount: number;
  totalChnl: number;
  usedChnl: number;
  blockedCount: number;
}

// ──────────────────────────────────────────────────────────
//  공용 그룹DN (GDN_TYPE=18) — SipGdnResponse
// ──────────────────────────────────────────────────────────

export interface CommonGdnResponse {
  gdnId: number;
  gdnNo: string;
  gdnName: string;
  gdnType: number;

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

  assignedTrunkCount: number;

  createDate?: string | null;
  workUser?: number | null;
  workTime?: string | null;
}

export interface CommonGdnCreateRequest {
  nodeId: number;
  /** 공용 트렁크는 항상 0 */
  tenantId: number;

  gdnNo: string;
  gdnName: string;

  backUpNodeId?: number | null;
  globalDnYn?: number | null;

  maxWaitcnt?: number | null;
  maxWaittime?: number | null;
  blockYn?: number | null;
}

export type CommonGdnUpdateRequest = Omit<CommonGdnCreateRequest, 'nodeId' | 'tenantId' | 'gdnNo'>;

// ──────────────────────────────────────────────────────────
//  SIP 트렁크 마스터 — SipTrunkResponse
// ──────────────────────────────────────────────────────────

export interface CommonTrunkResponse {
  sipTrunkId: number;
  sipTrunkName: string;
  sipTrunkNo: string;
  sipTrunkDesc: string | null;

  sipTrunkKind: number | null;
  sipTrunkKindName: string | null;

  sipTrunkIpv4: string | null;
  sipTrunkIpv6: string | null;
  ipVersion: number | null;
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
  totChannelCount: number | null;

  blockYn: number | null;
  transportType: number | null;
  trkAuthtype: number | null;
  trkIpUpdate: number | null;
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

export interface CommonTrunkCreateRequest {
  nodeId: number;
  /** 공용 트렁크는 항상 0 */
  tenantId: number;
  companyId?: number | null;

  sipTrunkName: string;
  sipTrunkNo: string;
  sipTrunkDesc?: string | null;

  sipTrunkKind: number; // 1=IPRON-IE, 9=3rd-Party PBX
  ipVersion: number; // 4 또는 6
  sipTrunkIpv4?: string | null;
  sipTrunkIpv6?: string | null;
  portNo: number;
  transportType: number; // 1=UDP, 2=TCP, 3=TLS

  startDn?: string | null;
  chnlCnt?: number | null;

  blockYn?: number | null;
  trkAuthtype?: number | null;
  trkIpUpdate?: number | null;
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

export type CommonTrunkUpdateRequest = Omit<CommonTrunkCreateRequest, 'nodeId' | 'tenantId' | 'companyId'>;

// ──────────────────────────────────────────────────────────
//  그룹DN ↔ 트렁크 멤버 배정 — SipTrunkMemberResponse / SaveRequest
// ──────────────────────────────────────────────────────────

export interface CommonTrunkMemberResponse {
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

export interface CommonTrunkMemberRow {
  sipTrunkId: number;
  assignYn: boolean;
  memberPriority?: number | null;
  channelLimitCount?: number | null;
}

export interface CommonTrunkMemberSaveRequest {
  gdnId: number;
  rows: CommonTrunkMemberRow[];
  agreeChannelOverflow?: boolean;
}

export interface CommonTrunkMemberSaveResult {
  added?: number;
  updated?: number;
  removed?: number;
  message?: string;
}

// ──────────────────────────────────────────────────────────
//  Enum / Lookup
// ──────────────────────────────────────────────────────────

/** SIP 트렁크 종류 (SWAT) */
export const TRUNK_KIND_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'IPRON-IE' },
  { value: 9, label: '3rd party PBX' },
];

/** Transport 타입 */
export const TRANSPORT_TYPE_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'UDP' },
  { value: 2, label: 'TCP' },
  { value: 3, label: 'TLS' },
];

export const YN_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '설정' },
  { value: 0, label: '해제' },
];

export function getTrunkKindName(v: number | null | undefined): string {
  if (v == null) return '-';
  return TRUNK_KIND_OPTIONS.find((o) => o.value === v)?.label ?? String(v);
}

export type AssignFilter = 'all' | 'assigned' | 'unassigned';
