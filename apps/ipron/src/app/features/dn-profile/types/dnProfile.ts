/**
 * 내선 프로파일 관리 타입 정의
 * SD-DN-PROFILE.md 설계서 기반
 * Backend: DnProfileController (BT-ADMIN-SERVICE-IPRON)
 */

// ─── Enum (문자열 리터럴) ─────────────────────────────────────────────────────

/** 프로파일 유형 — 0=내선(EXT,AGT), 1=TRUNK */
export type DnProfileType = '0' | '1';

/** NAT 옵션 — 0=미지정, 1=미사용, 2=rport, 3=route, 4=rport+route */
export type NatOption = '0' | '1' | '2' | '3' | '4';

// ─── Backend Response DTOs ───────────────────────────────────────────────────

/**
 * 백엔드 프로파일 응답
 * GET /api/ipron/dn-profiles
 */
export interface DnProfileResponse {
  dnProfileId: number;
  dnProfileName: string;
  dnProfileType: DnProfileType;
  tenantId: number;
  tenantName: string | null;
  nodeId: number;
  nodeName: string | null;
  // DR 설정
  drNodeId: number | null;
  drNodeName: string | null;
  globalDnYn: boolean | null;
  drDnProfileId: number | null;
  drDnProfileName: string | null;
  // 특수코드
  emergencyCodeProfileId: number;
  emergencyCodeProfileName: string | null;
  devfuncCodeProfileId: number;
  devfuncCodeProfileName: string | null;
  accessCodeProfileId: number;
  accessCodeProfileName: string | null;
  // SIP/라우트/CTI
  sipProfileId: number | null;
  sipProfileName: string | null;
  localRouteId: number | null;
  localRouteName: string | null;
  ctiUse: boolean | null;
  // RTP/NAT
  rtpOption: number | null;
  drRtpOption: number | null;
  msGroupId: number | null;
  msGroupName: string | null;
  msDrGroupId: number | null;
  msDrGroupName: string | null;
  natOption: NatOption | null;
  // 미디어/녹취
  mediaDeliveryId: number | null;
  mediaDeliveryName: string | null;
  drMediaDeliveryId: number | null;
  recNotifyMentId: number | null;
  recNotifyMentName: string | null;
  recStartCallType: string | null;
  // AGC
  agcYn: boolean | null;
  agcDefLevel: number | null;
  agcGainComp: number | null;
  // audit
  workUser: number | null;
  workTime: string | null;
}

/**
 * 노드 간략 정보 (cross-service: manager-node-list)
 */
export interface NodeSimpleResponse {
  nodeId: number;
  nodeName: string;
}

/**
 * 테넌트 간략 정보
 * cross-service: manager-tenant-list
 */
export interface TenantSimpleResponse {
  tenantId: number;
  tenantName: string;
}

/**
 * 노드-테넌트 매핑 (활성 테넌트)
 */
export interface NodeTenantItem {
  nodeId: number;
  nodeName: string;
  tenantId: number;
  tenantName: string;
}

/**
 * 프로파일 옵션 항목 (드롭다운용)
 */
export interface ProfileOptionItem {
  id: number;
  name: string;
}

/**
 * 폼 드롭다운 옵션 일괄 응답
 * GET /api/ipron/dn-profiles/options
 */
export interface DnProfileOptionsResponse {
  emergencyProfiles: ProfileOptionItem[];
  devfuncProfiles: ProfileOptionItem[];
  accessProfiles: ProfileOptionItem[];
  sipProfiles: ProfileOptionItem[];
  localRoutes: ProfileOptionItem[];
  msGroups: ProfileOptionItem[];
  mediaDeliveries: ProfileOptionItem[];
  recNotifyMents: ProfileOptionItem[];
  // 동일 노드/테넌트 내 DR 후보 프로파일
  drProfiles: ProfileOptionItem[];
  // 같은 클러스터 그룹에 속한 다른 노드
  drNodes: ProfileOptionItem[];
  // DR 노드 기준 미디어 전달 그룹 (AS-IS onChangedDrNode)
  drMediaDeliveries: ProfileOptionItem[];
  // DR 노드 기준 MS 그룹 (AS-IS onChangedDrNode)
  drMsGroups: ProfileOptionItem[];
}

// ─── Frontend 도메인 타입 ────────────────────────────────────────────────────

/**
 * 프론트엔드용 내선 프로파일 (그리드/카드 표시용)
 */
export type DnProfile = DnProfileResponse;

// ─── 요청 타입 ───────────────────────────────────────────────────────────────

export interface DnProfileCreateRequest {
  // 필수
  nodeId: number;
  tenantId: number;
  dnProfileType: DnProfileType;
  dnProfileName: string;
  emergencyCodeProfileId: number;
  devfuncCodeProfileId: number;
  accessCodeProfileId: number;
  // DR 설정
  drNodeId: number | null;
  globalDnYn: number; // 0/1 — BE Integer 필드, FE Switch 는 toFlag() 로 변환
  drDnProfileId: number | null;
  // SIP/라우트/CTI
  sipProfileId: number | null;
  localRouteId: number | null;
  ctiUse: number; // 0/1
  // RTP/NAT
  rtpOption: number;
  drRtpOption: number;
  msGroupId: number | null;
  msDrGroupId: number | null;
  natOption: NatOption;
  // 미디어/녹취
  mediaDeliveryId: number | null;
  drMediaDeliveryId: number | null;
  recNotifyMentId: number | null;
  recStartCallType: string | null;
  // AGC
  agcYn: number; // 0/1
  agcDefLevel: number;
  agcGainComp: number;
}

export type DnProfileUpdateRequest = Omit<DnProfileCreateRequest, 'nodeId' | 'tenantId'>;

// ─── 폼 초기값 ───────────────────────────────────────────────────────────────

export const DN_PROFILE_INITIAL_VALUES: Partial<DnProfileCreateRequest> = {
  dnProfileType: '0',
  globalDnYn: 0,
  ctiUse: 1, // AS-IS 기본값: 사용
  rtpOption: 0,
  drRtpOption: 0,
  natOption: '4', // AS-IS 기본값: rport+route
  agcYn: 0,
  agcDefLevel: 0,
  agcGainComp: 0,
};
