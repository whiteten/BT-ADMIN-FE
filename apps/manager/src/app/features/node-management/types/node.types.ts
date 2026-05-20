/**
 * 노드/클러스터 관리 타입 정의
 * SD-NODE-MANAGEMENT.md 설계서 기반
 */

// ─── 상수 ─────────────────────────────────────────────────────────────────────

/** NAT 옵션 코드 (AS-IS 공통코드 IE_EP_NAT_OPTION) */
export type NatOptionCode = 0 | 1 | 2 | 3;

/** NAT 옵션 라벨 */
export const NAT_OPTION_LABELS: Record<number, string> = {
  0: '미사용',
  1: '전송모드',
  2: '수신모드',
  3: '모두',
};

/** NAT 옵션 색상 */
export const NAT_OPTION_COLORS: Record<number, string> = {
  0: '#868e96',
  1: '#2563eb',
  2: '#e67700',
  3: '#16a34a',
};

/** MCS 분배방식 코드 (AS-IS 공통코드 IC_BAK_NODE_DIST) */
export type McsRouteMethodCode = 0 | 1;

/** MCS 분배방식 라벨 */
export const MCS_ROUTE_METHOD_LABELS: Record<number, string> = {
  0: '비율분배',
  1: '점유율분배',
};

/** 라이선스 종류 코드 */
export const LICENSE_KIND_LABELS: Record<number, string> = {
  10: '국선(트렁크)',
  11: '내선',
  12: 'IE트렁크',
  15: 'DID',
  16: 'DOD',
  20: 'CTI',
  40: 'IVR',
  50: '녹취',
};

/** 업무시간 옵션 라벨 */
export const WORKTIME_OPT_LABELS: Record<number, string> = {
  1: '옵션1 - 기본',
  2: '옵션2 - 전환 DNIS',
  3: '옵션3 - 시간외 멘트',
  4: '옵션4 - 전환+멘트',
};

// ─── Backend Response DTOs ───────────────────────────────────────────────────

/**
 * 백엔드 노드 목록/상세 응답
 * GET /api/manager/nodes
 */
export interface NodeBackendResponse {
  nodeId: number;
  centerId: number;
  nodeName: string;
  nodeAlias: string;
  regionNum: string | null;
  mainJob: string | null;
  natOption: number | null;
  mcsBkNodeId: number | null;
  mcsBkGsaIpv4Address: string | null;
  mcsBkGsbIpv4Address: string | null;
  mcsBkRouteRatio: number | null;
  mcsIcdownUseYn: number | null;
  mcsIedownUseYn: number | null;
  mcsBkRouteMethod: number | null;
  externalIpAddr: string | null;
  enatOption: number | null;
  msGroupId: number | null;
  msGroupName: string | null;
  clusterGrpId: number | null;
  clusterGrpName: string | null;
  tenantNames: string[] | null;
}

/**
 * 백엔드 클러스터 그룹 응답
 * GET /api/manager/cluster-groups
 */
export interface ClusterGroupBackendResponse {
  clusterGrpId: number;
  clusterGrpName: string;
  memberCount: number;
}

/**
 * 백엔드 클러스터 설정 응답
 * GET /api/manager/nodes/{nodeId}/cluster-config
 */
export interface ClusterConfigBackendResponse {
  nodeId: number;
  clusterGrpId: number;
  ieSvcIp: string | null;
  ieAsideIp: string | null;
  ieBsideIp: string | null;
  ieForceDr: number | null;
  iePassiveDr: number | null;
  icAsideIp: string | null;
  icBsideIp: string | null;
  icForceDr: number | null;
  icPassiveDr: number | null;
  gsPrimaryAsideIp: string | null;
  gsPrimaryBsideIp: string | null;
  gsSecondAsideIp: string | null;
  gsSecondBsideIp: string | null;
  diPrimaryAsideIp: string | null;
  diPrimaryBsideIp: string | null;
  diSecondAsideIp: string | null;
  diSecondBsideIp: string | null;
}

/**
 * 백엔드 테넌트 할당 목록 응답 (TenantAllocResponse)
 * GET /api/manager/nodes/{nodeId}/tenant-allocs
 * licenses는 Map<String, Integer> → {"10": 99999, "11": 1200, ...} 형태
 */
export interface TenantAllocBackendResponse {
  nodeId: number;
  tenantId: number;
  tenantName: string | null;
  autoObYn: number | null;
  validExtDigits: number | null;
  acwDuration: number | null;
  licenses: Record<string, number> | null;
}

/** 프론트엔드 변환된 라이선스 항목 */
export interface TenantAllocLicenseItem {
  licenseKind: number;
  licenseAmt: number;
}

/**
 * 백엔드 테넌트 할당 상세 응답 (TenantAllocDetailResponse)
 * GET /api/manager/nodes/{nodeId}/tenant-allocs/{tenantId}
 * 라이선스는 lic10~lic50 개별 필드
 */
export interface TenantAllocDetailBackendResponse {
  nodeId: number;
  tenantId: number;
  tenantName: string | null;
  autoObYn: number | null;
  validExtDigits: number | null;
  extPrefix: string | null;
  acwDuration: number | null;
  redirectTelno: string | null;
  ieWorktimeId: number | null;
  worktimeOpt: number | null;
  transNum: string | null;
  mentOutofwork: string | null;
  // 라이선스 배분
  lic10: number | null;
  lic11: number | null;
  lic12: number | null;
  lic15: number | null;
  lic16: number | null;
  lic20: number | null;
  lic40: number | null;
  lic50: number | null;
  // 초기설정
  initMentfile: string | null;
  ringbackTone: string | null;
  musicOnHold: string | null;
  ctiRoutePolicy: string | null;
  // 보안설정
  inviteMd5Auth: number | null;
  unregInviteNoresp: number | null;
  deviceUaCheck: number | null;
  regFailChkCnt: number | null;
  regFailBlockMin: number | null;
  callChkParam1: number | null;
  callChkParam2: number | null;
  callChkParam3: number | null;
  callChkParam4: number | null;
  // 감시설정
  unregCheck: number | null;
  unregSec: number | null;
  unregNum: number | null;
  forceUnregCheck: number | null;
  forceUnregSec: number | null;
  forceUnregNum: number | null;
  longWaitCheck: number | null;
  longWaitSec: number | null;
  ctiUnmoniCheck: number | null;
  ctiUnmoniSec: number | null;
  ctiUnmoniNum: number | null;
  ctiLogoutCheck: number | null;
  ctiLogoutSec: number | null;
  ctiLogoutNum: number | null;
}

/** 프론트엔드용 테넌트 할당 상세 (위저드 편집용) */
export type TenantAllocDetail = TenantAllocDetailBackendResponse;

// ─── Frontend 변환 타입 ──────────────────────────────────────────────────────

/**
 * 프론트엔드용 노드 목록 아이템
 */
export interface NodeListItem {
  nodeId: number;
  centerId: number;
  nodeName: string;
  nodeAlias: string;
  regionNum: string | null;
  mainJob: string | null;
  natOption: number | null;
  msGroupId: number | null;
  msGroupName: string | null;
  clusterGrpId: number | null;
  clusterGrpName: string | null;
  tenantNames: string[] | null;
}

/**
 * 프론트엔드용 노드 상세
 */
export interface NodeDetail {
  nodeId: number;
  centerId: number;
  nodeName: string;
  nodeAlias: string;
  regionNum: string | null;
  mainJob: string | null;
  natOption: number | null;
  mcsBkNodeId: number | null;
  mcsBkGsaIpv4Address: string | null;
  mcsBkGsbIpv4Address: string | null;
  mcsBkRouteRatio: number | null;
  mcsIcdownUseYn: number | null;
  mcsIedownUseYn: number | null;
  mcsBkRouteMethod: number | null;
  externalIpAddr: string | null;
  enatOption: number | null;
  msGroupId: number | null;
  msGroupName: string | null;
  clusterGrpId: number | null;
  clusterGrpName: string | null;
  tenantNames: string[] | null;
}

/**
 * 프론트엔드용 클러스터 그룹
 */
export interface ClusterGroup {
  clusterGrpId: number;
  clusterGrpName: string;
  memberCount: number;
}

/**
 * 프론트엔드용 클러스터 설정
 */
export interface ClusterConfig {
  nodeId: number;
  clusterGrpId: number;
  ieSvcIp: string | null;
  ieAsideIp: string | null;
  ieBsideIp: string | null;
  ieForceDr: number | null;
  iePassiveDr: number | null;
  icAsideIp: string | null;
  icBsideIp: string | null;
  icForceDr: number | null;
  icPassiveDr: number | null;
  gsPrimaryAsideIp: string | null;
  gsPrimaryBsideIp: string | null;
  gsSecondAsideIp: string | null;
  gsSecondBsideIp: string | null;
  diPrimaryAsideIp: string | null;
  diPrimaryBsideIp: string | null;
  diSecondAsideIp: string | null;
  diSecondBsideIp: string | null;
}

/**
 * 프론트엔드용 테넌트 할당 아이템 (목록용)
 */
export interface TenantAllocItem {
  nodeId: number;
  tenantId: number;
  tenantName: string | null;
  autoObYn: number | null;
  validExtDigits: number | null;
  acwDuration: number | null;
  licenses: TenantAllocLicenseItem[];
}

// ─── 요청 타입 ───────────────────────────────────────────────────────────────

/**
 * 노드 등록 요청
 */
export interface NodeCreateData {
  nodeId: number;
  nodeName: string;
  nodeAlias: string;
  regionNum?: string | null;
  mainJob?: string | null;
  clusterGrpId: number;
}

/**
 * 노드 수정 요청 (기본정보 + NAT + MCS)
 */
export interface NodeUpdateData {
  nodeName?: string;
  nodeAlias?: string;
  regionNum?: string | null;
  mainJob?: string | null;
  clusterGrpId?: number | null;
  natOption?: number | null;
  externalIpAddr?: string | null;
  enatOption?: number | null;
  msGroupId?: number | null;
  mcsBkNodeId?: number | null;
  mcsBkGsaIpv4Address?: string | null;
  mcsBkGsbIpv4Address?: string | null;
  mcsBkRouteRatio?: number | null;
  mcsIcdownUseYn?: number | null;
  mcsIedownUseYn?: number | null;
  mcsBkRouteMethod?: number | null;
}

/**
 * 클러스터 그룹 등록 요청
 */
export interface ClusterGroupCreateData {
  clusterGrpName: string;
}

/**
 * 클러스터 그룹 수정 요청
 */
export interface ClusterGroupUpdateData {
  clusterGrpName: string;
}

/**
 * 노드 클러스터 이동 요청
 */
export interface NodeClusterMoveData {
  clusterGrpId: number | null;
}

/**
 * 클러스터 설정 수정 요청
 */
export interface ClusterConfigUpdateData {
  iePassiveDr?: number | null;
  ieForceDr?: number | null;
  icPassiveDr?: number | null;
  icForceDr?: number | null;
  gsPrimaryAsideIp?: string | null;
  gsPrimaryBsideIp?: string | null;
  gsSecondAsideIp?: string | null;
  gsSecondBsideIp?: string | null;
  diPrimaryAsideIp?: string | null;
  diPrimaryBsideIp?: string | null;
  diSecondAsideIp?: string | null;
  diSecondBsideIp?: string | null;
}

/**
 * 테넌트 할당 등록 요청 (백엔드 TenantAllocCreateRequest와 동일, flat 구조)
 */
export interface TenantAllocCreateData {
  tenantId: number;
  autoObYn?: number;
  validExtDigits: number;
  extPrefix?: string | null;
  acwDuration: number;
  redirectTelno?: string | null;
  ieWorktimeId?: number | null;
  worktimeOpt?: number | null;
  transNum?: string | null;
  mentOutofwork?: string | null;
  // 라이선스 (flat)
  lic10?: number;
  lic11?: number;
  lic12?: number;
  lic15?: number;
  lic16?: number;
  lic20?: number;
  lic40?: number;
  lic50?: number;
  // 초기설정
  initMentfile?: string | null;
  ringbackTone?: string | null;
  musicOnHold?: string | null;
  ctiRoutePolicy?: string | null;
  // 보안설정
  inviteMd5Auth?: number;
  unregInviteNoresp?: number;
  deviceUaCheck?: number;
  regFailChkCnt?: number;
  regFailBlockMin?: number;
  callChkParam1?: number;
  callChkParam2?: number;
  callChkParam3?: number;
  callChkParam4?: number;
  // 감시설정
  unregCheck?: number;
  unregSec?: number;
  unregNum?: number;
  forceUnregCheck?: number;
  forceUnregSec?: number;
  forceUnregNum?: number;
  longWaitCheck?: number;
  longWaitSec?: number;
  ctiUnmoniCheck?: number;
  ctiUnmoniSec?: number;
  ctiUnmoniNum?: number;
  ctiLogoutCheck?: number;
  ctiLogoutSec?: number;
  ctiLogoutNum?: number;
}

/**
 * 테넌트 할당 수정 요청
 */
export type TenantAllocUpdateData = Omit<TenantAllocCreateData, 'tenantId'>;
