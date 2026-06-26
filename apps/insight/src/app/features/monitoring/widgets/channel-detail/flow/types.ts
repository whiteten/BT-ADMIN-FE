/**
 * 채널 상세 실시간 트래킹/대화 플로우 타입.
 *
 * BE INSIGHT `ChannelDetailFlowService` 응답(`ChannelFlowDetailResponse`)과 1:1 매핑.
 * 대화이력·실시간 봇 트래킹(`BotRealtimeFlowItem` / `BotRealtimeSessionDetailDto`)과 동일 규격.
 */

/** 트래킹/대화 플로우 개별 아이템. */
export interface ChannelFlowItem {
  seq?: number;
  /** 타입 코드 (TRACKING: 0=Menu,1=GetDigit,2=Play... / DIALOG: 0=IVR,10=STT,11=DTMF,20/21=멀티모달). */
  type?: number;
  typeName?: string;
  startTime?: string;
  description?: string;
  result?: string;
  /** 화자 역할: BOT / CUSTOMER / SYSTEM / HIDDEN. */
  dialogRole?: string;
  subFlowId?: string;
  nodeName?: string;
  encrypted?: boolean;
  masked?: boolean;
  entityTag?: string;
  /** 고객 입력 방식: STT / DTMF. */
  inputMethod?: string;
  maskingFormat?: string;
  rawValues?: string[];
}

/** 세션 기본 정보. */
export interface ChannelFlowSession {
  ucid?: string;
  nexthop?: number;
  callDate?: string;
  callTime?: string;
  tenantId?: number;
  ani?: string;
  dnis?: string;
  systemId?: number;
  nodeId?: number;
  sleeChno?: number;
  serviceId?: number;
  serviceName?: string;
  serviceType?: number;
  callStatus?: number;
}

/** 채널 상세 응답 — session + trackingFlow + callEnded (+ sourceType). */
export interface ChannelFlowDetail {
  /** 파싱 소스: TRACKING(TB_RM_IR_TRACKING) / DIALOG(CH:DIALOG). */
  sourceType?: 'TRACKING' | 'DIALOG';
  session?: ChannelFlowSession;
  trackingFlow?: ChannelFlowItem[];
  callEnded?: boolean;
}

/**
 * WS TRACK 대상 — 채널 셀에서 추출.
 * <p>{@code sleeChno} 는 화면 표시용 {@code CHNL_NO} 가 아니라 Redis row 의 실제 채널 {@code SLEE_CH} 다.
 * InitCdr.SLEE_CHNO 매칭 키이므로 반드시 SLEE_CH 를 바인딩한다.</p>
 */
export interface ChannelFlowTarget {
  ucid: string;
  systemId: number;
  /** Redis SLEE_CH (실제 채널) — InitCdr.SLEE_CHNO 매칭용. CHNL_NO 아님. */
  sleeChno: number;
}
