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

/** 트래킹 플로우 아이템 */
export interface TrackingFlowItem {
  seq: number;
  type: number;
  typeName: string;
  menuId: string | null;
  menuName: string | null;
  block: string;
  startTime: string;
  description: string | null;
  /** 멀티모달 이미지 URL (Type=2일 때만 존재) */
  imagePath: string | null;
  result: string;
  dialogRole: DialogRole;
  rawValues: string[];
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
