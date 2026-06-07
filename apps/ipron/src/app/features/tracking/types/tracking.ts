/**
 * 통합 콜트래킹 타입 정의 (IPR30S1060)
 * SD-CALL-TRACKING.md 기반
 * Backend: TrackingController (BT-ADMIN-SERVICE-IPRON)
 *
 * Phase 1: 검색 + 상세(IVR step / CTI 라우팅 / Agent 이벤트) + 녹취 redirect
 */

// ─── Enum / 상수 ───────────────────────────────────────────────────────────

/** 트래킹 모드 — 검색 시 어떤 BasicCDR을 기준으로 마스터 그리드를 만들지 */
export type TrackingMode = 'PBX' | 'IVR' | 'CTI';

/** 콜 결과 enum — TB_DM_*_BASICCDR.CDR_STATUS + 후가공 */
export type CallResult =
  | 'COMPLETED' // 정상 완료
  | 'ABANDONED' // 고객 포기 (큐/벨 단계)
  | 'DISCONNECTED' // 호 단절 (장애)
  | 'IVR_SELF' // IVR 셀프 완료
  | 'TRANSFERRED' // 호 전환 발생
  | 'NO_ANSWER'; // 응답 없음

/** IVR step NodeType (TB_DM_IR_TRACKINGDATA.TYPE) — AS-IS IPR30S1021 매핑 */
// AS-IS TrackingDataUtil.getIvrTrackingTypeName() 기준 13 타입
export type IvrNodeType =
  | 'Menu' // 0 메뉴
  | 'GetDigit' // 1 DTMF 입력
  | 'Play' // 2 멘트 재생
  | 'Packet' // 3 전문 패킷
  | 'Cti' // 4 CTI 호전환
  | 'Query' // 5 외부 조회
  | 'Tracking' // 6 트래킹 마커
  | 'UserDef' // 7 메뉴통계
  | 'HA' // 8 HA (시간만)
  | 'EndInfo' // 9 메뉴 종료 정보
  | 'PacketJson' // 23 JSON 패킷
  | 'RequestVARS' // 24 VARS 요청
  | 'CollectDigit' // 25 Collect Digit
  | 'RequestHTTP' // 30 HTTP 요청
  | 'Pause' // 31 일시정지 (v6.2)
  | 'Resume' // 32 재개 (v6.2)
  | 'ShowChat' // 40 IVR Chat 출력 (v6.0)
  | 'GetChat' // 41 고객 Chat 입력 (v6.0)
  | 'OTHER';

/** Agent 이벤트 종류 */
export type AgentEventType =
  | 'STATE_CHANGE' // 상담사 상태 변화
  | 'CALL_RING' // 호 벨울림
  | 'CALL_ANSWER' // 호 응답
  | 'CALL_RELEASE' // 호 종료
  | 'TRANSFER_OUT' // 호 재전환 (보낸 쪽)
  | 'TRANSFER_IN'; // 호 재전환 (받은 쪽)

/** 녹취 미디어 종류 */
export type RecordingType = 'VOICE' | 'SCREEN' | 'STT';

// ─── 검색 (SearchCriteria + Result) ────────────────────────────────────────

/**
 * 검색 조건 — 명령어 팔레트 prefix가 평탄화되어 들어옴.
 *
 * 백엔드 TrackingSearchRequest 와 1:1 대응.
 * `searchSyntax.ts`가 cmdk 입력을 이 객체로 변환.
 */
/** 콜 여정 Sankey — 검색 결과 콜 집합의 거시 단계 흐름 집계 */
export interface JourneyFlow {
  nodes: { name: string }[];
  links: { source: string; target: string; value: number }[];
  callCount: number;
  truncated: boolean;
}

export interface TrackingSearchCriteria {
  /** 트래킹 모드 (default PBX) */
  mode: TrackingMode;
  /** 시작 시각 (ISO 8601, 필수) */
  startTime: string;
  /** 종료 시각 (ISO 8601, 필수) */
  endTime: string;

  // ─── 식별자 (정확 매칭) ──────────────────────────────
  ucid?: string | null;
  ani?: string | null;
  dnis?: string | null;

  // ─── 마스터 ID ────────────────────────────────────
  tenantId?: number | null;
  nodeId?: number | null;
  queueId?: number | null;
  agentId?: string | null;
  scenarioId?: number | null;

  // ─── 결과 / 시간 필터 ─────────────────────────────
  /** 통화 결과 (다중 가능) */
  results?: CallResult[] | null;
  /** 통화 시간 최소 (초) */
  durationMinSec?: number | null;
  /** 통화 시간 최대 (초) */
  durationMaxSec?: number | null;
  /** 큐 대기 최소 (초) */
  queueWaitMinSec?: number | null;
  /** 큐 대기 최대 (초) */
  queueWaitMaxSec?: number | null;
  /** 상담사 통화시간 최소 (초). AGT_1830(인) + AGT_1810(아웃) 합 */
  agentTalkMinSec?: number | null;
  /** 통화 구분 (CALL_KIND). 0=내선통화, 1=국선수신(인바운드), 2=국선발신(아웃바운드). 다중 가능. */
  callKinds?: number[] | null;
  /** IVR 모드 — 포기 여부 (ABANDON_YN=1 만) */
  abandoned?: boolean | null;
  /** IVR 모드 — 상담연결 여부 (REQ_AGENT_YN=1 만) */
  reqAgent?: boolean | null;
  /** IVR 모드 — IVR 자가해결 (ABANDON_YN=0 AND REQ_AGENT_YN=0) */
  ivrSelfServiced?: boolean | null;

  // ─── 조회목적 (ENTRY_PURPOSE_INQUIRY 설정 활성화 + ANI/UCID 입력 시 팝업 입력값) ────
  /**
   * SWAT ENTRY_PURPOSE_INQUIRY 설정 연동: ANI/UCID 입력 시 조회목적 팝업에서 입력받은 값.
   * 감사 로그 메타데이터로 서버에 전달됨.
   */
  purposeOfInquiry?: string | null;

  // ─── 페이징 ───────────────────────────────────────
  page?: number;
  size?: number;
}

/** 검색 결과 단일 행 (PBX 모드 — TB_DM_IE_BASICCDR 기준)
 *  설계: doc/IPRON v6.3.1 IE 통계 및 CDR설계.xlsx — "교환기통화이력 표시항목" */
export interface CallSearchResult {
  ucid: string;
  hop: number | null;

  /** 콜 시작 시각 (ISO) */
  startTime: string;
  /** 콜 종료 시각 = 시작 + TALK_SEC */
  endTime: string | null;
  /** 통화 시간 (초, TALK_SEC) */
  durationSec: number | null;
  /** 벨울림 시간 (초, ANSWER_SEC) */
  answerSec: number | null;

  /** 발신번호 (마스킹) */
  ani: string | null;
  /** 수신번호 */
  dnis: string | null;

  /** 콜 유형. 0=내선통화, 1=국선수신, 2=국선발신 (CALL_KIND) */
  callKind: number | null;
  /** 홉 유형. 0=일반콜, 1=호이동, 2=호전달, 3=감청 (CALL_TYPE) */
  callType: number | null;

  /** 홉 종료 유형. 0=종료, 1=포기, 2=FAC, 3=분배, 4=전환, 5=회수, 6=초과 (CC_TYPE) */
  ccType: number | null;
  /** 콜 종료 주체. 0=계속진행, 1=국선종료, 2=내선종료, 3=협의종료, 4=시스템종료 (CC_PART) */
  ccPart: number | null;
  /** 종료 사유 코드 (CC_ERR_CODE) */
  ccErrCode: number | null;
  /** 연결 여부. 0/1 (CR_CONN) */
  crConn: number | null;

  /** 발신 회선 상세 (O_*) */
  oLrdn: string | null;
  oRn: string | null;
  oAc: string | null;
  /** 발신 회선 유형. 0=None, 1=국선, 2=내선(EDN), 3=IVR, 4=CTI */
  oType: number | null;
  oName: string | null;

  /** 착신 회선 상세 (T_*) */
  tLrdn: string | null;
  tRn: string | null;
  tAc: string | null;
  tType: number | null;
  tName: string | null;

  /** ID (명칭 매핑은 상세 화면에서만) */
  systemId: number | null;
  nodeId: number | null;
  tenantId: number | null;

  /** 마스킹 여부 (UI 힌트) */
  aniMasked?: boolean;
  /** 트래킹 모드 (UI 표기용) */
  mode?: TrackingMode;
  /** 상담사 정보 (응대된 콜만 채워짐) */
  agentId?: number | null;
  agentName?: string | null;
  groupId?: number | null;
  groupName?: string | null;
  /** 큐 정보 (큐 분배된 콜만 채워짐) */
  queueId?: number | null;
  queueName?: string | null;
  result?: CallResult | null;
  ivrEntered?: boolean;
  /** CTI 큐 분배 (IE T_TYPE=5 hop). attempt=시도, connected=한번이라도 성공, partialFailed=한번이라도 실패 */
  ctiAttempt?: boolean | null;
  ctiConnected?: boolean | null;
  ctiPartialFailed?: boolean | null;
  /** 내선 응대 (IE T_TYPE=2 hop). attempt=라우팅 시도, connected=한번이라도 응답, partialFailed=한번이라도 미응답 */
  agentAttempt?: boolean | null;
  agentConnected?: boolean | null;
  agentPartialFailed?: boolean | null;
  /** IVR 모드 — 상담연결 요청 여부 (REQ_AGENT_YN) */
  reqAgent?: boolean | null;
  /** IVR 모드 — 서비스 번호 (ORIGIN_DNIS, 최초인입 DNIS). PBX 에선 null. */
  originDnis?: string | null;
  /** IVR 모드 — 종료 타입 (CDR_STATUS — IR_CDR_STATUS 공통코드 11/12/13/21/22/31/32/88/99). PBX 에선 null. */
  endStatus?: number | null;
  /** 발신 통화품질 (O_R_FACTOR, 0-100). T_TYPE in (1=국선, 2=내선, 3=트렁크) 일 때만 활성. */
  oRFactor?: number | null;
  queueWaitSec?: number | null;
  resultLabel?: string | null;
  tenantName?: string | null;
  nodeName?: string | null;

  /** 호 전환 발생 여부 */
  transferred: boolean;
}

// ─── 콜 상세 (헤더 + segment) ──────────────────────────────────────────────

/** 콜 헤더 — 상세 페이지 상단에 표시 */
export interface CallDetailHeader {
  ucid: string;
  startTime: string;
  endTime: string | null;
  durationSec: number | null;
  ani: string | null;
  aniMasked: boolean;
  dnis: string | null;
  agentId: string | null;
  agentName: string | null;
  queueName: string | null;
  result: CallResult | null;
  resultLabel: string | null;
  tenantId: number | null;
  tenantName: string | null;
  nodeId: number | null;
  nodeName: string | null;
  /** 재전환 횟수 */
  transferCount: number;
  /** 마스킹 해제 가능 여부 (사용자 권한 + 정책) */
  unmaskAvailable: boolean;
}

/** Call segment (CallFlow의 노드 1개) */
export interface CallSegment {
  segmentId: string;
  /** segment 종류 (inbound / ivr / cti / agent / disconnect) */
  kind: 'INBOUND' | 'OUTBOUND' | 'QUEUE_IN' | 'IVR' | 'CTI' | 'AGENT' | 'DISCONNECT' | 'OTHER';
  startTime: string;
  endTime: string | null;
  durationSec: number | null;
  /** 표시 라벨 */
  label: string;
  /** 메타 (큐명/상담사명 등) */
  meta?: Record<string, string | number | null>;
  /** 다음 segment ID (CallFlow 화살표) */
  nextSegmentId?: string | null;
  /** 재전환/장애 표시 */
  isError?: boolean;
}

// ─── IVR Step Tree ─────────────────────────────────────────────────────────

/** IVR 시나리오 1개 (CDR_PKEY 단위) */
export interface IvrScenarioGroup {
  cdrPkey: number;
  /** 시나리오명 */
  scenarioName: string;
  scenarioId: number;
  /** 시나리오 버전 */
  scenarioVersion: string | null;
  startTime: string;
  endTime: string | null;
  durationSec: number | null;
  /** STT(VoiceRecogine) 노드 포함 여부 → 대화 탭 활성화 */
  hasVoiceRecognition: boolean;
  steps: IvrStep[];
}

/** IVR step (TB_DM_IR_TRACKINGDATA 1행) */
export interface IvrStep {
  stepId: string;
  type: IvrNodeType;
  /** TYPE 원본값 (0~50) */
  rawType: number;
  /** 메뉴/노드 ID (시나리오 step name) */
  menuId: string | null;
  /** 트리 depth */
  depth: number;
  /** step 진입 시각 */
  enterTime: string;
  /** step 머무른 시간 (초) */
  durationSec: number | null;
  /** 멘트 파일명 (MENT/MENU 노드) */
  mentName: string | null;
  /** DTMF 입력값 (GETDIGIT 노드) */
  dtmfInput: string | null;
  /** STT 인식 결과 (VOICE_RECOGNINE 노드) */
  sttResult: string | null;
  /** 외부 query 결과 (QUERY 노드) */
  queryResult: string | null;
  /** 종료 사유 (DISCONNECT 노드) */
  endReason: string | null;
  /** 분기 라벨 ("1=요금 / 2=가입") */
  branchLabel: string | null;
}

// ─── CTI Routing Timeline ──────────────────────────────────────────────────

/** CTI 라우팅 결정 1단계 */
export interface CtiRoutingHop {
  hopNumber: number;
  /** 단계명 (진입사유 / 라우팅룰 / 스킬셋 / 우선순위 / 시도 / 매칭) */
  title: string;
  /** 설명 */
  description: string;
  enterTime: string | null;
  /** AS-IS actionCode (0=라우팅시도 / 1=상담원착신 / 2=Host조회 / 3=BSR대표큐 / 4=BSR수신대기) */
  actionCode: number | null;
  /** 단위 라우팅 종료 사유 */
  endReason: string | null;
  /** 매칭된 상담사 ID/이름 */
  agentId: string | null;
  agentName: string | null;
  /** 시도 결과 (success / busy / no-answer / skip) */
  status: 'SUCCESS' | 'BUSY' | 'NO_ANSWER' | 'SKIP' | 'PENDING' | 'FAILED';
  /** 추가 메타 (스킬, 우선순위 등) */
  meta?: Record<string, string | number | null>;
}

// ─── Agent Event Timeline ──────────────────────────────────────────────────

/** Agent 이벤트 1행 */
export interface AgentEvent {
  eventId: string;
  type: AgentEventType;
  eventTime: string;
  agentId: string;
  agentName: string | null;
  /** 상태 변화 (이전→이후) */
  fromState: string | null;
  toState: string | null;
  /** 호 응답 시 응답 시간 (초) */
  responseSec: number | null;
  /** 메모/사유 */
  description: string | null;
}

// ─── IVR 대화 (Dialog CDR) ─────────────────────────────────────────────────

/** TB_DM_IR_DIALOG_CDR 한 turn (FORCUS_CDR_규격_v6.2 ForCus Dialog CDR 상세) */
export interface DialogTurn {
  seq: number | null; // 대화 순번
  type: number | null; // 0 IVR / 10 음성STT / 11 음성DTMF / 20 멀티모달
  speaker: 'BOT' | 'CUSTOMER';
  text: string | null; // 발화/입력 내용
  mentId: string | null; // Val3
  startMs: number | null; // 절대시각
  durationMs: number | null;
  result: string | null; // S/F
  subFlow: string | null; // Val7
  scenarioName: string | null; // Val8
}

// ─── 통화품질 (Quality 탭) ─────────────────────────────────────────────────

/**
 * Quality 탭 — UCID + HOP 기준 통화품질 데이터.
 * SWAT IPR30S1060QT.do selQualityData / TB_DM_IE_BASICCDR 컬럼 대응.
 * O_TYPE/T_TYPE: 회선유형 (0=None,1=국선,2=내선,3=트렁크,4=IVR큐,5=CTI큐,6=ACD큐)
 */
export interface CallQuality {
  /** 발신측 회선유형 */
  oType: number | null;
  /** 착신측 회선유형 */
  tType: number | null;
  /** 발신측 IP 주소 */
  oRemoteAddr: string | null;
  /** 착신측 IP 주소 */
  tRemoteAddr: string | null;
  /** 발신측 협상 코덱 */
  oNegoCodec: string | null;
  /** 착신측 협상 코덱 */
  tNegoCodec: string | null;
  /** 발신측 MOS (0~5) */
  oMos: number | null;
  /** 착신측 MOS */
  tMos: number | null;
  /** 발신측 Jitter 평균 (ms) */
  oJitterAvg: number | null;
  /** 착신측 Jitter 평균 (ms) */
  tJitterAvg: number | null;
  /** 발신측 패킷 손실 (%) */
  oRtpMsLost: number | null;
  /** 착신측 패킷 손실 (%) */
  tRtpMsLost: number | null;
  /** 발신측 R-Factor (0~100) */
  oRFactor: number | null;
  /** 착신측 R-Factor */
  tRFactor: number | null;
  /** 발신측 ICMP RTT (ms) */
  oIcmpRtt: number | null;
  /** 착신측 ICMP RTT (ms) */
  tIcmpRtt: number | null;
}

// ─── 녹취 ──────────────────────────────────────────────────────────────────

/**
 * 녹취 리다이렉트 응답 — 외부 미디어 플레이어 URL.
 *
 * 백엔드는 TrackingController에서 callid + userid + type 기반으로
 * 외부 미디어 플레이어 URL을 만들어서 응답한다. FE는 이 URL을 새 탭에 open.
 */
export interface RecordingRedirectResponse {
  /** 외부 미디어 플레이어 URL (Range 헤더 지원) */
  url: string;
  /** 녹취 권한 보유 여부 (백엔드 재검증) */
  allowed: boolean;
  /** 거부 사유 (allowed=false일 때) */
  reason?: string | null;
}

// ─── 검색 프리셋 / 최근 검색 ───────────────────────────────────────────────

/** 빠른 프리셋 칩 (오늘/어제/최근1시간 등) */
export type DateRangePreset = 'LAST_1H' | 'TODAY' | 'YESTERDAY' | 'LAST_24H' | 'THIS_WEEK' | 'LAST_WEEK' | 'CUSTOM';

/** LocalStorage에 저장되는 최근 검색 1건 */
export interface RecentSearch {
  /** 사용자가 입력한 cmdk 원문 */
  rawQuery: string;
  /** 파싱된 검색 조건 */
  criteria: TrackingSearchCriteria;
  /** 마지막 실행 시각 (ISO 8601) */
  executedAt: string;
  /** 결과 건수 (캐시) */
  resultCount?: number | null;
}
