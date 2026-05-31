/** 트래킹 세션 목록 아이템 (DB + Redis 병합) */
export interface TrackingSession {
  // DB 기본 정보
  ucid: string;
  nexthop: number;
  callDate: string;
  callTime: string;
  tenantId: number;
  centerId: number;
  ani: string;
  dnis: string;
  systemId: number;
  nodeId: number;
  sleeId: number;
  sleeChno: number;
  serviceId: number;
  serviceName: string;
  serviceType: number;
  callStatus: number;
  callStep: number;
  dbUpdateTime: string;

  // 계산 필드
  duration: number;
}

/** SSE 푸시 데이터 */
export interface TrackingPushData {
  items: TrackingSession[];
}

/** 대화 화자 역할 */
export type DialogRole = 'BOT' | 'CUSTOMER' | 'SYSTEM' | 'HIDDEN';

/** NLU 개체 항목 */
export interface NluEntityItem {
  entityTag: string;
  entityValue: string;
}

/** NLU 분석 결과 (HOP 단위) */
export interface NluAnalysisItem {
  questionText: string;
  intent: string;
  confidence: number | null;
  threshold: number | null;
  thresholdFail: number | null;
  isSuccess: number | null;
  isCheck: number | null;
  isFailed: number | null;
  isEntity: number | null;
  modelName: string;
  ifeNodeName: string;
  hop: number;
  entities: NluEntityItem[];
  keywords: { keyword: string }[];
  modelId: string | null;
  questionSeq: number;
  ucidGkey: string;
  retrainStatus: number | null; // null=미수정, 1=미반영, 2=반영
  modifiedQuestion: string | null;
  retrainAnswer: string | null;
  // 마지막 변경 이력
  lastBeforeQuestion: string | null;
  lastAfterQuestion: string | null;
  lastBeforeAnswer: string | null;
  lastAfterAnswer: string | null;
  lastModifiedBy: string | null;
  lastModifiedAt: string | null;
}

/** 트래킹 플로우 아이템 */
export interface TrackingFlowItem {
  seq: number;
  type: number;
  typeName: string;
  startTime: string;
  description: string | null;
  /** 멀티모달 이미지 URL (Type=2일 때만 존재) */
  imagePath: string | null;
  result: string;
  dialogRole: DialogRole;
  /** IFE SubFlow ID (Type=0일 때) */
  subFlowId: string | null;
  /** IFE Node Name (Type=0일 때) */
  nodeName: string | null;
  /** 원시 값 (VAL1~VAL10) */
  rawValues: string[];
  /**
   * 암호화 버블 여부 (Val4=1 또는 3). true면 `description`은 암호문이며, 복호화 API를 통해
   * 열람해야 평문을 볼 수 있습니다. 콜봇 이력 전용 — 실시간 트래킹에서는 항상 false.
   */
  encrypted?: boolean;
  /**
   * 마스킹 여부 (Val4=2 또는 3). true면 프론트엔드에서 노출 시 마스킹 표시 필요.
   * Val4=2: 평문이지만 마스킹 표시, Val4=3: 암호화+마스킹 (복호화 후에도 마스킹).
   */
  masked?: boolean;
  /**
   * Entity Tag (Val10). 고객 발화가 암호화되었을 때 버블에 대체 표시할 태그.
   */
  entityTag?: string | null;
  /**
   * 고객 입력 방식. "STT"(음성인식) 또는 "DTMF"(키패드 입력).
   * 프론트엔드에서 STT/DTMF 버블 색상을 분리하는 데 사용. 고객 타입이 아니면 null.
   */
  inputMethod?: 'STT' | 'DTMF' | null;
  /**
   * 마스킹 포맷 (Val9). `*`=마스킹, `#`=원문 표시.
   * 예: `"**##"` → "국민은행" → "**은행". masked=true일 때만 유효, null이면 범용 마스킹.
   * <p>응답 길이가 가변적일 경우 `;`로 구분된 다중 패턴이 올 수 있으며(예: `"##**;####**;######**"`),
   * 서버가 응답 길이와 길이가 같은 패턴을 선택해 마스킹을 적용한 뒤 `description`을 내려줍니다.
   * 즉 클라이언트는 이 필드를 직접 해석할 필요가 없습니다 (참고용).
   */
  maskingFormat?: string | null;
  /**
   * 복호화 API 호출 시 대상 식별자. 형식: `"{seq}:{innerIdx}"`.
   * encrypted=true일 때만 값이 존재합니다.
   */
  bubbleKey?: string | null;
}

/** 재학습 변경 이력 항목 */
export interface RetrainLogItem {
  logId: string;
  beforeQuestion: string | null;
  afterQuestion: string | null;
  beforeAnswer: string | null;
  afterAnswer: string | null;
  modifiedBy: string;
  modifiedAt: string;
}

/** 세션 상세 */
export interface TrackingSessionDetail {
  session: TrackingSession;
  trackingFlow: TrackingFlowItem[];
  callEndInfo: Record<string, string> | null;
  /** 콜 종료 여부 (DB 레코드 삭제 감지 시 true) */
  callEnded: boolean;
}

/** 트래킹 명령 요청 */
export interface TrackingCommandRequest {
  systemId: number;
  nodeId: number;
  sleeChno: number;
  state: number;
  ucid?: string;
  nexthop?: number;
}

/** 트래킹 명령 결과 */
export interface TrackingCommandResult {
  success: boolean;
  message: string;
}
