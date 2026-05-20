/**
 * 국선관리 타입 정의
 * SD-ENDPOINT.md 설계서 기반
 *
 * AS-IS: IPR20S1010 (TB_IE_ENDPOINT, TB_IE_ENDPT_MEMBER, TB_IE_ENDPT_REGNUM)
 * TO-BE: BT-ADMIN-SERVICE-IPRON endpoint feature
 */

// ─── Enum 라벨 매핑 ─────────────────────────────────────────────────────────

/** 국선 유형 (END_POINT_TYPE) — DB 기준 */
export const ENDPOINT_TYPE_OPTIONS = [
  { label: 'SIP G/W', value: 1 },
  { label: 'TIE', value: 2 },
  { label: 'SIP Provider', value: 3 },
  { label: 'Node', value: 4 },
] as const;

export const ENDPOINT_TYPE_LABELS: Record<number, string> = {
  1: 'SIP G/W',
  2: 'TIE',
  3: 'SIP Provider',
  4: 'Node',
};

/** SSW 벤더 코드 (IE_SSW_VENDOR_CD) — DB 기준 */
export const SSW_VENDOR_OPTIONS = [
  { label: '미사용', value: '0' },
  { label: 'LG', value: '1' },
  { label: 'SK', value: '2' },
  { label: 'KT', value: '3' },
  { label: 'Twilio', value: '4' },
  { label: 'Arcstar', value: '5' },
  { label: 'ETC', value: '9' },
] as const;

export const SSW_VENDOR_LABELS: Record<string, string> = {
  '0': '미사용',
  '1': 'LG',
  '2': 'SK',
  '3': 'KT',
  '4': 'Twilio',
  '5': 'Arcstar',
  '9': 'ETC',
};

/** IP 버전 */
export const IP_VERSION_OPTIONS = [
  { label: 'IPv4', value: 4 },
  { label: 'IPv6', value: 6 },
] as const;

/** 전송 방식 (TRANSPORT_TYPE) — DB 기준 */
export const TRANSPORT_OPTIONS = [
  { label: 'UDP', value: 1 },
  { label: 'TCP', value: 2 },
  { label: 'TLS', value: 4 },
  { label: 'WS / DTLS', value: 8 },
  { label: 'WSS / DTLS', value: 16 },
] as const;

export const TRANSPORT_LABELS: Record<number, string> = {
  1: 'UDP',
  2: 'TCP',
  4: 'TLS',
  8: 'WS / DTLS',
  16: 'WSS / DTLS',
};

/** 편집 옵션 (IE_EDIT_OPT_TYPE) — DB 기준 */
export const EDIT_OPT_OPTIONS = [
  { label: '삭제 후 추가', value: 1 },
  { label: '앞자리 삭제', value: 2 },
  { label: '뒷자리 삭제', value: 3 },
  { label: '전체 변경', value: 4 },
] as const;

/** 업무시간 외 제어 (IE_ENDPT_WORKTIME_OPT_TYPE) — DB 기준 */
export const WORKTIME_OPT_OPTIONS = [
  { label: '해제', value: 1 },
  { label: '안내멘트 후 종료', value: 2 },
] as const;

/** NAT 동작옵션 (IE_ENAT_OPTION) — DB 기준 */
export const ENAT_OPTION_OPTIONS = [
  { label: '미사용', value: 0 },
  { label: '미사용(1)', value: 1 },
  { label: 'rport(rfc3581)', value: 2 },
  { label: 'route', value: 3 },
  { label: 'rport+route', value: 4 },
] as const;

/** 서버 할당방식 (IE_ENDPT_ALLOC_METHOD) — DB 기준 */
export const ALLOC_METHOD_OPTIONS = [
  { label: '우선순위 방식', value: 0 },
  { label: '균등 방식', value: 1 },
] as const;

/** 등록 방식 (IE_ENDPT_REG_METHOD) — DB 기준 */
export const REG_METHOD_OPTIONS = [
  { label: '우선순위 방식', value: 0 },
  { label: '동시 REG 방식', value: 1 },
] as const;

/** 음성보안 (SRTP) */
export const SRTP_OPTIONS = [
  { label: '미사용', value: 0 },
  { label: 'SRTP', value: 1 },
  { label: 'DTLS', value: 2 },
] as const;

/** 사용/미사용 */
export const USE_YN_OPTIONS = [
  { label: '사용', value: 1 },
  { label: '미사용', value: 0 },
] as const;

// ─── Backend Response 타입 ──────────────────────────────────────────────────

/** 할당방식 */
export const ALLOC_METHOD_LABELS: Record<number, string> = { 0: '우선순위', 1: '균등' };

/** REG 방식 */
export const REG_METHOD_LABELS: Record<number, string> = { 0: '우선순위', 1: '동시 REG' };

/** 블럭 상태 */
export const BLOCK_STATUS_LABELS: Record<number, string> = { 0: '해제', 1: '설정' };

/** EP 상태 (Redis 기반, 1차 구현에서는 monitorYn 기반 표시) */
export const EP_STATUS_LABELS: Record<number, string> = { 0: '장애', 1: '정상', 2: '미사용' };

/**
 * 국선 목록/상세 응답 — 백엔드 EndpointResponse 기준
 */
export interface Endpoint {
  endptId: number;
  endptName: string;
  endptType: number;
  endptMaxchnl: number;
  endptDodchnl: number;
  nodeId: number;
  nodeName?: string;
  ipVersion: number;
  transportType: number;
  sipOption: string | null;
  monitorYn: number;
  watchInterval: number;
  failCnt: number;
  delCount: number;
  addDigit: string | null;
  ssRefreshType: number;
  msgTraceYn: number;
  blockYn: number;
  chnlIdx: number;
  destNodeId: number | null;
  rtpRelayYn: number;
  pHeadOpt: string | null;
  editOpt: string | null;
  ieWorktimeId: number | null;
  worktimeOpt: number;
  transNum: string | null;
  guideMentId: number | null;
  regIpv4Address: string | null;
  regIpv6Address: string | null;
  regIpVersion: number;
  regPortNo: number;
  regId: string | null;
  regPwd: string | null;
  regInterval: number;
  regUseYn: number;
  regNum: string | null;
  natOption: number;
  natIpAddress: string | null;
  locationNodeId: number | null;
  locationNodeName: string | null;
  routingNodeId: number | null;
  routingNodeName: string | null;
  snmpOid: string | null;
  srtpYn: number;
  msGroupId: number | null;
  userAgentChk: number;
  userAgentRegex: string | null;
  drnodeId: number | null;
  drNodeName: string | null;
  sswVendor: string | null;
  regIpAddress1: string | null;
  regIpAddress2: string | null;
  regPortNo2: number;
  msDrgroupId: number | null;
  drnatOption: number;
  ipAddress1: string | null;
  ipAddress2: string | null;
  portNo1: number;
  portNo2: number;
  enatOption: number;
  allocMethod: number;
  domainName: string | null;
  regMethod: number;
  wanNetworkYn: number;
  sipProfileId: number | null;
  sipProfileName: string | null;
  countryCodeUseYn: number;
  countryId: number | null;
  epStatus: number | null; // Redis 실시간 상태 (0:장애, 1:정상, 2:미사용)
}

/**
 * 국선 멤버
 */
export interface EndpointMember {
  endptMemId: number;
  endptId: number;
  endptMemName: string;
  ipAddress: string;
  portNo: number;
  priority: number;
  blockYn: number;
  monitorYn: number;
  regUseYn: number;
  monState?: number;
  regState?: number;
  transportType: string;
}

/**
 * 국선 인증번호
 */
export interface EndpointRegnum {
  endptRegnumId: number;
  endptId: number;
  regNum: string;
  regMd5Id: string;
  regMd5Pwd?: string;
  regInterval: number;
  tenantId: number | null;
  tenantName?: string;
  regActivateYn: number;
  expireDate: string | null;
  regState?: number;
}

// ─── Request 타입 ───────────────────────────────────────────────────────────

export interface EndpointCreateRequest {
  endptName: string;
  endptType: number;
  nodeId: number;
  endptMaxchnl: number;
  endptDodchnl: number;
  sipProfileId?: number | null;
  sswVendor: string;
  ipVersion: number;
  transportType: number;
  portNo1: number;
  portNo2?: number;
  ipAddress1: string;
  ipAddress2?: string | null;
  sipOption?: string | null;
  monitorYn: number;
  regUseYn: number;
  regNum?: string | null;
  regId?: string | null;
  regPwd?: string | null;
  regInterval?: number;
  routingNodeId?: number | null;
  snmpOid?: string | null;
  ssRefreshType: number;
  watchInterval: number;
  failCnt: number;
  locationNodeId?: number | null;
  drnodeId?: number | null;
  blockYn?: number;
  allocMethod?: number;
  domainName?: string | null;
  regMethod?: number;
  addDigit?: string | null;
  delCount?: number;
  msgTraceYn?: number;
  chnlIdx?: number;
  destNodeId?: number | null;
  rtpRelayYn?: number;
  pHeadOpt?: string | null;
  editOpt?: string | null;
  ieWorktimeId?: number | null;
  worktimeOpt?: number;
  guideMentId?: number | null;
  userAgentChk?: number;
  userAgentRegex?: string | null;
  natOption?: number;
  natIpAddress?: string | null;
  drnatOption?: number;
  msGroupId?: number | null;
  msDrgroupId?: number | null;
  enatOption?: number;
  srtpYn?: number;
  wanNetworkYn?: number;
  countryCodeUseYn?: number;
  countryId?: number | null;
}

export type EndpointUpdateRequest = EndpointCreateRequest;

export interface EndpointMemberCreateRequest {
  endptMemName: string;
  ipAddress: string;
  portNo: number;
  priority: number;
  blockYn: number;
  transportType: string;
}

export type EndpointMemberUpdateRequest = EndpointMemberCreateRequest;

export interface EndpointRegnumCreateRequest {
  regNum: string;
  regMd5Id: string;
  regMd5Pwd: string;
  regInterval: number;
  tenantId?: number | null;
  regActivateYn: number;
  expireDate?: string | null;
}

export type EndpointRegnumUpdateRequest = EndpointRegnumCreateRequest;

// ─── 노드별 그룹 ────────────────────────────────────────────────────────────

export interface NodeEndpointGroup {
  nodeId: number;
  nodeName: string;
  endpoints: Endpoint[];
}

// ─── 폼 Step 정의 ───────────────────────────────────────────────────────────

export const ENDPOINT_FORM_STEPS = [{ title: '기본정보' }, { title: '부가정보' }, { title: '중개NAT' }] as const;

// ─── 초기값 ─────────────────────────────────────────────────────────────────

export const ENDPOINT_INITIAL_VALUES: Partial<EndpointCreateRequest> & Record<string, unknown> = {
  // Tab 1: 기본정보
  endptName: '',
  endptType: 1,
  endptMaxchnl: 30,
  endptDodchnl: 0,
  sswVendor: '0',
  transportType: 1,
  srtpYn: 0,
  regUseYn: 0,
  regNum: '',
  regId: '',
  regPwd: '',
  regInterval: 60,
  allocMethod: 0,
  regMethod: 0,
  domainName: '',
  wanNetworkYn: 0,
  sipProfileId: null,
  // Tab 2: 부가정보
  monitorYn: 1,
  watchInterval: 60,
  failCnt: 8,
  msgTraceYn: 0,
  blockYn: 0,
  userAgentChk: 0,
  userAgentRegex: '',
  delCount: 0,
  addDigit: '',
  editOpt: '0',
  ieWorktimeId: null,
  worktimeOpt: 0,
  guideMentId: null,
  countryCodeUseYn: 0,
  countryId: null,
  // Tab 3: 중개NAT
  natOption: 0,
  drnatOption: 0,
  msGroupId: null,
  msDrgroupId: null,
  enatOption: 0,
  natIpAddress: '',
  // 기타 (유지)
  snmpOid: '',
  ipVersion: 4,
  portNo1: 5060,
  portNo2: 5060,
  ipAddress1: '',
  sipOption: '0',
  ssRefreshType: 0,
};

// ─── 카드 표시 유틸 ─────────────────────────────────────────────────────────

export interface EndpointTag {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export function getEndpointTagList(ep: Endpoint): EndpointTag[] {
  const tags: EndpointTag[] = [];
  // 모니터링 ON=초록, OFF=빨강
  tags.push(
    ep.monitorYn === 1
      ? { label: '모니터링ON', color: '#52c41a', bgColor: '#f6ffed', borderColor: '#b7eb8f' }
      : { label: '모니터링OFF', color: '#ff4d4f', bgColor: '#fff2f0', borderColor: '#ffccc7' },
  );
  // 블럭 설정=빨강, 해제=초록
  tags.push(
    ep.blockYn === 1
      ? { label: '블럭설정', color: '#ff4d4f', bgColor: '#fff2f0', borderColor: '#ffccc7' }
      : { label: '블럭해제', color: '#52c41a', bgColor: '#f6ffed', borderColor: '#b7eb8f' },
  );
  if (ep.regUseYn === 1) tags.push({ label: 'REG', color: '#1677ff', bgColor: '#e6f4ff', borderColor: '#91caff' });
  if (ep.srtpYn === 1) tags.push({ label: 'SRTP', color: '#722ed1', bgColor: '#f9f0ff', borderColor: '#d3adf7' });
  return tags;
}

/** 카드 상태 배지 — AS-IS 기준 Redis epStatus만 표시 (blockYn은 하단 태그에서 별도 표시) */
export function getEndpointStatusInfo(ep: Endpoint): { label: string; color: string; bgColor: string } {
  if (ep.epStatus === 0) return { label: '장애', color: '#ff4d4f', bgColor: '#fff2f0' };
  if (ep.epStatus === 2) return { label: '미사용', color: '#8c8c8c', bgColor: '#fafafa' };
  if (ep.epStatus === 1) return { label: '정상', color: '#52c41a', bgColor: '#f6ffed' };
  // epStatus가 null(Redis 미응답)
  return { label: '-', color: '#8c8c8c', bgColor: '#fafafa' };
}

/** 모니터링 여부 라벨 */
export function getMonitorLabel(monitorYn: number): string {
  return monitorYn === 1 ? '모니터링ON' : '모니터링OFF';
}
