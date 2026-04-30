/**
 * DN 관리 타입 정의 (IPR20S2020)
 * SD-DN-MANAGEMENT.md 기반
 * Backend: DnController (BT-ADMIN-SERVICE-IPRON)
 */

// ─── Enum (문자열 리터럴) ─────────────────────────────────────────────────────

/** DN 유형 — 11=EDN(내선), 12=AGT(상담), 13=TDN(트렁크) */
export type DnType = '11' | '12' | '13';

/** DN 상태 — 0=미등록, 1=정상 */
export type DnStatus = '0' | '1';

/** IP 버전 — 4=IPv4, 6=IPv6 */
export type IpVersion = '4' | '6';

/** 전송 유형 — 1=UDP, 2=TCP, 4=TLS, 8=WS/DTLS, 16=WSS/DTLS (AS-IS 비트마스크) */
export type TransportType = '1' | '2' | '4' | '8' | '16';

/** 인증 유형 — 1=고정IP, 2=동적IP */
export type ExtAuthType = '1' | '2';

/** 상담원 기본 상태 — 1=대기, 2=휴식, 3=후처리, 4=이석 등 (운영에 따라 확장) */
export type AdnDefaultState = '1' | '2' | '3' | '4' | '9';

// ─── Backend Response DTOs ───────────────────────────────────────────────────

/**
 * DN 응답 — 전체 필드 + 조인 이름
 * GET /api/ipron/dns, /api/ipron/dns/{id}
 */
export interface DnResponse {
  // PK / FK
  dnId: number;
  companyId: number;
  tenantId: number;
  tenantName: string | null;
  nodeId: number;
  nodeName: string | null;
  dnProfileId: number;
  dnProfileName: string | null;
  cosId: number | null;
  cosName: string | null;
  devMasterId: number | null;
  backUpNodeId: number | null;
  backUpNodeName: string | null;
  pickupGrpId: number | null;
  dodLimitId: number | null;
  dodLimitName: string | null;
  origGrpdnId: number | null;
  origGrpdnName: string | null;
  dnSetGroupId: number | null;
  mediaDeliveryId: number | null;
  mediaDeliveryName: string | null;
  msGroupId: number | null;
  msDrgroupId: number | null;
  rbMentId: number | null;
  mohMentId: number | null;
  coRbMentId: number | null;
  coMohMentId: number | null;

  // DN 기본
  dnNo: string;
  dnType: DnType;
  dnTypeName: string | null;
  dnStatus: DnStatus;
  dnStatusName: string | null;
  dnRegiSec: number | null;
  loginAdn: string | null;
  globalDnYn: number | null;
  extBlockYn: number | null;
  snrYn: number | null;
  traceYn: number | null;
  dnTblYn: number | null;
  dnOblYn: number | null;

  // IP / 네트워크
  ipVersion: IpVersion | null;
  ipv4Address: string | null;
  ipv6Address: string | null;
  portNo: number | null;
  transportType: TransportType | null;
  extAuthtype: ExtAuthType | null;
  extIpUpdate: number | null;
  natYn: number | null;
  drnatYn: number | null;
  enatOption: number | null;

  // 인증
  md5Auth: number | null;
  md5Authid: string | null;
  md5Authpwd: string | null;
  srtpYn: number | null;
  srtpUseYn: number | null;

  // 단말
  deviceType: number | null;
  deviceTypeName: string | null;
  macAddress: string | null;
  chnlIdx: number | null;
  provisionSeq: number | null;

  // 사용자 / 부가
  ieUserid: number | null;
  ieUserName: string | null;
  adnDftState: AdnDefaultState | null;
  autoanswerYn: number | null;
  autoanswerBellCnt: number | null;
  dodAni: string | null;
  chrgAni: string | null;
  internalAni: string | null;
  autoMdYn: number | null;
  ctiUse: number | null;

  // IPT 서비스 — 발신 부가서비스 (cosId/cosName은 이미 위에 선언됨)
  dodNumAllow: number | null;
  dodNumPattern: string | null;
  monitorSvc: number | null;
  coachingSvc: number | null;
  callResvSvc: number | null;
  autoReturnSvc: number | null;
  intercomOrigSvc: number | null;
  shortDialSvc: number | null;
  dodNumSvc: number | null;

  // IPT 서비스 — 착신 부가서비스
  callScreenSvc: number | null;
  callScreenNum: string | null;
  ignoreBugsCoaching: number | null;
  unknownDeny: number | null;
  dodNameSvc: number | null;
  busyWaitSvc: number | null;
  absenceSvc: number | null;
  mvaSvc: number | null;
  cidDenySvc: number | null;
  callAvoidSvc: number | null;
  intercomTermSvc: number | null;
  didReleaseTone: number | null;
  trnsOkTone: number | null;
  multiCallForking: number | null;
  cidExternSvc: number | null;
  silentTermSvc: number | null;

  // 착신거부
  nonDidDeny: number | null;
  caseDenySvc: number | null;

  // 착신전환
  allTransSvc: number | null;
  allTransNum: string | null;
  noansTransSvc: number | null;
  noansTransNum: string | null;
  busyTransSvc: number | null;
  busyTransNum: string | null;
  caseTransSvc: number | null;
  ctiTransMonSvc: number | null;

  // 기타전환
  moveAnsSvc: number | null;
  moveAnsNum: string | null;
  urTransSvc: number | null;
  urTransNum: string | null;

  // audit
  workUser: number | null;
  workTime: string | null;
}

/**
 * 노드-테넌트 매핑 (할당된 테넌트)
 * GET /api/ipron/dns/node-tenants
 */
export interface NodeTenantItem {
  nodeId: number;
  nodeName: string;
  tenantId: number;
  tenantName: string;
  /** 계약 수량 (maxDnCnt) */
  maxDnCnt: number | null;
  /** 현재 DN 수 */
  curDnCnt: number | null;
}

/**
 * 계약 수량 응답 (curDnCnt / maxDnCnt)
 * GET /api/ipron/dns/count
 */
export interface DnCountResponse {
  tenantId: number;
  curDnCnt: number;
  maxDnCnt: number;
}

/**
 * 옵션 항목 (드롭다운용)
 */
export interface DnOptionItem {
  id: number;
  name: string;
}

/** DN 프로파일 옵션 — 선택 시 툴팁/상세 정보용으로 DR/MS 정보 포함 */
export interface DnProfileOption extends DnOptionItem {
  drNodeId: number | null;
  globalDnYn: number | null;
  rtpOption: number | null;
  drRtpOption: number | null;
  msGroupId: number | null;
  mediaDeliveryId: number | null;
  drMediaDeliveryId: number | null;
}

/**
 * DN 폼 드롭다운 옵션 일괄 응답
 * GET /api/ipron/dns/options
 */
export interface DnOptionsResponse {
  dnProfiles: DnProfileOption[];
  cos: DnOptionItem[];
  /** 테넌트 기본 COS ID (AS-IS tenantId == cosId 규칙) */
  defaultCosId: number | null;
  deviceTypes: DnOptionItem[];
  pickupGrps: DnOptionItem[];
  dodLimits: DnOptionItem[];
  rbMents: DnOptionItem[];
  mohMents: DnOptionItem[];
  coRbMents: DnOptionItem[];
  coMohMents: DnOptionItem[];
  origGrpdns: DnOptionItem[];
  mediaDeliveries: DnOptionItem[];
  msGroups: DnOptionItem[];
  /** 같은 클러스터의 다른 노드 (DR 노드 후보) */
  drNodes: DnOptionItem[];
}

/**
 * DN 범위 응답 (FreeDn)
 * GET /api/ipron/dns/range
 */
export interface DnRangeItem {
  startDn: string;
  endDn: string;
  availableCnt: number;
}

/**
 * COS 선택 효과 응답 — AS-IS applyCosSettings() 규칙을 서버가 계산.
 * FE는 group은 setFieldsValue + disabled, editable=false는 disabled 바인딩.
 */
export interface CosEffectResponse {
  /** COS 값을 DN 필드에 강제 복사 (FE는 해당 필드 disabled + set) */
  group: {
    dnTblYn?: number;
    dnOblYn?: number;
    dodLimitId?: number;
    dodNumAllow?: number;
    dodNumPattern?: string | null;
    callScreenNum?: string | null;
    coachingSvc?: number;
    monitorSvc?: number;
    callScreenSvc?: number;
    ignoreBugsCoaching?: number;
  };
  /** Personal service: COS.xxx==1이면 편집 허용, 아니면 disabled */
  editable: Record<string, boolean>;
}

// ─── 필터 쿼리 ───────────────────────────────────────────────────────────────

export interface DnFilterQuery {
  nodeId?: number | null;
  tenantId?: number | null;
  dnType?: DnType | null;
  dnStatus?: DnStatus | null;
  dnProfileId?: number | null;
  cosId?: number | null;
  dnNoStart?: string | null;
  dnNoEnd?: string | null;
  keyword?: string | null;
  page?: number;
  size?: number;
}

// ─── 요청 타입 ───────────────────────────────────────────────────────────────

export interface DnCreateRequest {
  // 필수
  nodeId: number;
  tenantId: number;
  dnNo: string;
  dnType: DnType;
  dnProfileId: number;

  // COS / 단말
  cosId?: number | null;
  devMasterId?: number | null;
  deviceType?: number | null;
  macAddress?: string | null;
  provisionSeq?: number | null;
  chnlIdx?: number | null;

  // IP
  ipVersion?: IpVersion | null;
  ipv4Address?: string | null;
  ipv6Address?: string | null;
  portNo?: number | null;
  transportType?: TransportType | null;
  extAuthtype: ExtAuthType;
  extIpUpdate?: number | null;

  // DR
  backUpNodeId?: number | null;
  globalDnYn?: number | null;

  // 인증
  md5Auth: number;
  md5Authid?: string | null;
  md5Authpwd?: string | null;
  srtpYn?: number | null;

  // 사용자 / 상태
  ieUserid?: number | null;
  ieUserName?: string | null;
  dnStatus?: DnStatus | null;
  adnDftState?: AdnDefaultState | null;

  // 부가
  traceYn?: number | null;
  extBlockYn?: number | null;
  snrYn?: number | null;
  dnTblYn?: number | null;
  dnOblYn?: number | null;
  autoanswerYn?: number | null;
  autoanswerBellCnt?: number | null;
  autoMdYn?: number | null;

  // 지정 발신 / 과금
  dodAni?: string | null;
  chrgAni?: string | null;
  internalAni?: string | null;

  // 그룹
  pickupGrpId?: number | null;
  dodLimitId?: number | null;
  origGrpdnId?: number | null;

  // 멘트
  rbMentId?: number | null;
  mohMentId?: number | null;
  coRbMentId?: number | null;
  coMohMentId?: number | null;

  // 미디어
  mediaDeliveryId?: number | null;
  msGroupId?: number | null;
  msDrgroupId?: number | null;

  // IPT 서비스 — 발신 부가서비스 (cosId는 상단 'COS / 단말' 블록에 이미 선언)
  dodNumAllow?: number | null;
  dodNumPattern?: string | null;
  monitorSvc?: number | null;
  coachingSvc?: number | null;
  callResvSvc?: number | null;
  autoReturnSvc?: number | null;
  intercomOrigSvc?: number | null;
  shortDialSvc?: number | null;
  dodNumSvc?: number | null;

  // IPT 서비스 — 착신 부가서비스
  callScreenSvc?: number | null;
  callScreenNum?: string | null;
  ignoreBugsCoaching?: number | null;
  unknownDeny?: number | null;
  dodNameSvc?: number | null;
  busyWaitSvc?: number | null;
  absenceSvc?: number | null;
  mvaSvc?: number | null;
  cidDenySvc?: number | null;
  callAvoidSvc?: number | null;
  intercomTermSvc?: number | null;
  didReleaseTone?: number | null;
  trnsOkTone?: number | null;
  multiCallForking?: number | null;
  cidExternSvc?: number | null;
  silentTermSvc?: number | null;

  // 착신거부
  nonDidDeny?: number | null;
  caseDenySvc?: number | null;

  // 착신전환
  allTransSvc?: number | null;
  allTransNum?: string | null;
  noansTransSvc?: number | null;
  noansTransNum?: string | null;
  busyTransSvc?: number | null;
  busyTransNum?: string | null;
  caseTransSvc?: number | null;
  ctiTransMonSvc?: number | null;

  // 기타전환
  moveAnsSvc?: number | null;
  moveAnsNum?: string | null;
  urTransSvc?: number | null;
  urTransNum?: string | null;
}

/** 수정 요청 — nodeId/tenantId/dnNo 불변 */
export type DnUpdateRequest = Omit<DnCreateRequest, 'nodeId' | 'tenantId' | 'dnNo'>;

/**
 * DN 일괄 등록 요청 (DN 범위 + 공통 프로파일)
 */
export interface DnBatchCreateRequest {
  nodeId: number;
  tenantId: number;
  dnType: DnType;
  dnProfileId: number;
  dnNoStart: string;
  dnNoEnd: string;
  // 공통 설정
  cosId?: number | null;
  extAuthtype: ExtAuthType;
  md5Auth: number;
  /** 공통 비밀번호 (md5Auth=1 시) */
  md5Authpwd?: string | null;
  dnStatus?: DnStatus | null;
}

/**
 * 내선 프로파일에 DN 일괄 배정
 * PUT /api/ipron/dn-profiles/{id}/assign-dns
 */
export interface DnProfileAssignDnsRequest {
  dnIds: number[];
}

// ─── 폼 초기값 ───────────────────────────────────────────────────────────────

export const DN_INITIAL_VALUES: Partial<DnCreateRequest> = {
  dnType: '11',
  ipVersion: '4',
  extAuthtype: '2',
  extIpUpdate: 0,
  md5Auth: 0,
  globalDnYn: 0,
  srtpYn: 0,
  dnStatus: '0',
  autoanswerYn: 0,
  autoanswerBellCnt: 3,
  autoMdYn: 0,
  traceYn: 0,
  extBlockYn: 0,
  snrYn: 0,
  dnTblYn: 0,
  dnOblYn: 0,
  portNo: 5060,
  transportType: '1',
  // 발신 부가서비스
  dodNumAllow: 0,
  monitorSvc: 0,
  coachingSvc: 0,
  callResvSvc: 0,
  autoReturnSvc: 0,
  intercomOrigSvc: 0,
  shortDialSvc: 0,
  dodNumSvc: 1, // AS-IS 기본 설정
  // 착신 부가서비스
  callScreenSvc: 0,
  ignoreBugsCoaching: 0,
  unknownDeny: 0,
  dodNameSvc: 0,
  busyWaitSvc: 0,
  absenceSvc: 0,
  mvaSvc: 0,
  cidDenySvc: 0,
  callAvoidSvc: 0,
  intercomTermSvc: 0,
  didReleaseTone: 0,
  trnsOkTone: 0,
  multiCallForking: 0,
  cidExternSvc: 0,
  silentTermSvc: 0,
  // 착신거부
  nonDidDeny: 0,
  caseDenySvc: 0,
  // 착신전환
  allTransSvc: 0,
  noansTransSvc: 0,
  busyTransSvc: 0,
  caseTransSvc: 0,
  ctiTransMonSvc: 0,
  // 기타전환
  moveAnsSvc: 0,
  urTransSvc: 0,
};

export const DN_BATCH_INITIAL_VALUES: Partial<DnBatchCreateRequest> = {
  dnType: '11',
  extAuthtype: '2',
  md5Auth: 0,
  dnStatus: '0',
};

// ─── SNR (순차 호출) ────────────────────────────────────────────────────────

/**
 * DN SNR — 순차 호출 원격 번호.
 * AS-IS TB_IE_DN_SNR / IPR20S2020_Snr.jsp.
 * DN 하나에 최대 30개까지 등록 가능.
 */
export interface DnSnrResponse {
  dnId: number;
  snrId: number;
  remoteNum: string;
  remoteNumType: number | null;
  ringWait: number | null;
  ringDur: number | null;
  activeYn: number | null;
  allowOpt: number | null;
  allowPtn: string | null;
  snrDesc: string | null;
}

export interface DnSnrRequest {
  remoteNum: string;
  remoteNumType?: number | null;
  ringWait?: number | null;
  ringDur?: number | null;
  activeYn?: number | null;
  allowOpt?: number | null;
  allowPtn?: string | null;
  snrDesc?: string | null;
}

/**
 * DN SNR TOD — 요일/시간대별 규칙.
 * AS-IS TB_IE_DN_SNR_TOD / IPR20S2020_SnrTod.jsp.
 * weekdayByte: 8자리 bit 문자열 (월화수목금토일휴일, "11111100" = 월~금).
 * startTime/finshTime: "HHmm" 4자리.
 */
export interface DnSnrTodResponse {
  dnId: number;
  snrId: number;
  snrTodId: number;
  callType: number | null;
  weekdayByte: string | null;
  startTime: string | null;
  finshTime: string | null;
  activeYn: number | null;
}

export interface DnSnrTodRequest {
  callType?: number | null;
  weekdayByte?: string | null;
  startTime?: string | null;
  finshTime?: string | null;
  activeYn?: number | null;
}

export const DN_SNR_INITIAL_VALUES: Partial<DnSnrRequest> = {
  remoteNum: '',
  remoteNumType: 0,
  ringWait: 0,
  ringDur: 0,
  activeYn: 1,
  allowOpt: 1,
  allowPtn: '',
  snrDesc: '',
};

export const DN_SNR_TOD_INITIAL_VALUES: Partial<DnSnrTodRequest> = {
  callType: 3, // AS-IS 기본값 (내부/외부) — SQLite CHECK(CALL_TYPE IN (1,2,3))
  weekdayByte: '00000000',
  startTime: '0000',
  finshTime: '0000',
  activeYn: 1,
};

// ─── SCA (Shared Call Appearance) ──────────────────────────────────────────

/**
 * DN SCA — 공유호 출현 (하나의 DN을 여러 단말기에 등록).
 * AS-IS TB_IE_DN_SCA / IPR20S2020_Sca.jsp.
 */
export interface DnScaResponse {
  scaId: number;
  dnId: number;
  regiNo: string;
  nodeId: number | null;
  tenantId: number | null;
  deviceType: number | null;
  mobileYn: number | null;
  lineType: number | null;
  regiStatus: number | null;
  regiSec: number | null;
  authType: number | null;
  ipVersion: number | null;
  ipv4Address: string | null;
  ipv6Address: string | null;
  portNo: number | null;
  transportType: number | null;
  md5UseYn: number | null;
  md5Authid: string | null;
  transNum: string | null;
}

export interface DnScaRequest {
  regiNo: string;
  deviceType: number;
  mobileYn?: number | null;
  lineType?: number | null;
  regiStatus?: number | null;
  transNum?: string | null;
  authType?: number | null;
  ipVersion?: number | null;
  ipv4Address?: string | null;
  ipv6Address?: string | null;
  portNo?: number | null;
  transportType?: number | null;
  md5UseYn?: number | null;
  md5Authid?: string | null;
  md5Authpwd?: string | null;
}

export const DN_SCA_INITIAL_VALUES: Partial<DnScaRequest> = {
  regiNo: '',
  deviceType: 0,
  mobileYn: 0,
  lineType: 1,
  regiStatus: 0,
  authType: 2,
  ipVersion: 4,
  ipv4Address: '',
  ipv6Address: '',
  portNo: 5060,
  transportType: 1,
  md5UseYn: 0,
  md5Authid: '',
  md5Authpwd: '',
  transNum: '',
};

// ─── 조건부 착신 전환 (CallTransfer) ────────────────────────────────────────

/** 전환/거부 구분 */
export type TransferDenyType = '1' | '9'; // 1=전환, 9=거부
/** 인입호 유형 */
export type CallTypeCode = '1' | '2' | '3'; // 1=내부, 2=외부, 3=내부/외부
/** 착신변환 종류 */
export type CallTransKindCode = '1' | '2' | '3'; // 1=시간조건, 2=번호조건, 3=무조건
/** 사유 코드 */
export type TransReasonCodeCode =
  | '10'
  | '11'
  | '12'
  | '13'
  | '14' // TRANSFER 그룹
  | '21'
  | '22'
  | '23'; // DENY 그룹

export const TRANSFER_DENY_TYPE_LABELS: Record<TransferDenyType, string> = { '1': '전환', '9': '거부' };
export const DN_CALL_TYPE_LABELS: Record<CallTypeCode, string> = { '1': '내부', '2': '외부', '3': '내부/외부' };
export const CALL_TRANS_KIND_LABELS: Record<CallTransKindCode, string> = { '1': '시간조건', '2': '번호조건', '3': '무조건' };
export const TRANS_REASON_CODE_LABELS: Record<TransReasonCodeCode, string> = {
  '10': '통화중',
  '11': '부재중',
  '12': '회의중',
  '13': '외근중',
  '14': '근무시간외',
  '21': '통화중(거부)',
  '22': '메시지(거부)',
  '23': '사용자(거부)',
};

/** 사유 코드의 그룹 (transType) 매핑 — UI 옵션 동적 갱신용 */
export const TRANS_REASON_GROUPS: Record<TransReasonCodeCode, TransferDenyType> = {
  '10': '1',
  '11': '1',
  '12': '1',
  '13': '1',
  '14': '1',
  '21': '9',
  '22': '9',
  '23': '9',
};

export interface DnCallTransferResponse {
  dnId: number;
  caseTransId: number;
  transType: TransferDenyType;
  callType: CallTypeCode;
  transKind: CallTransKindCode;
  transReasonCode: TransReasonCodeCode;
  holiApplyYn: number;
  weekdayByte: string; // "1110000" (월화수)
  startTime: string; // "0900"
  finshTime: string; // "1800"
  activateYn: number;
  transDnis: string | null;
  transPattern: string | null;
}

export interface DnCallTransferRequest {
  transType: TransferDenyType;
  callType: CallTypeCode;
  transKind: CallTransKindCode;
  transReasonCode: TransReasonCodeCode;
  holiApplyYn: number;
  weekdayByte: string;
  startTime: string;
  finshTime: string;
  activateYn: number;
  transDnis?: string | null;
  transPattern?: string | null;
}

export const DN_CALL_TRANSFER_INITIAL_VALUES: Partial<DnCallTransferRequest> = {
  transType: '1',
  callType: '1',
  transKind: '3',
  transReasonCode: '11',
  holiApplyYn: 0,
  weekdayByte: '1111100',
  startTime: '0900',
  finshTime: '1800',
  activateYn: 1,
  transDnis: '',
  transPattern: '',
};
