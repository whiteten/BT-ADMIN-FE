import type { LayoutItem } from 'react-grid-layout';

/**
 * 봇 현황
 *
 * - entryCnt: 진입수
 * - entryDiff: 진입수 전일대비
 * - completeCnt: 봇 해결수
 * - completeRate: 봇 해결률 (%)
 * - completeRateDiff: 봇 해결률 전일대비 (%p)
 * - agentReqCnt: 상담사 연결수
 * - agentTransferRate: 상담사 연결률 (%)
 * - agentTransferRateDiff: 상담사 연결률 전일대비 (%p)
 * - incompleteCnt: 미해결 종료수
 * - incompleteRate: 미해결 종료율 (%)
 * - incompleteRateDiff: 미해결 종료율 전일대비 (%p)
 * - avgBusyTime: 평균 점유시간 (초)
 * - avgBusyTimeDiff: 평균 점유시간 전일대비 (초)
 * - prevEntryCnt: 전일 진입수
 * - prevCompleteCnt: 전일 봇 해결수
 * - prevAgentReqCnt: 전일 상담사 연결수
 * - prevIncompleteCnt: 전일 미해결 종료수
 */
export interface ScenarioSummary {
  entryCnt: number;
  entryDiff: number;
  completeCnt: number;
  completeRate: number;
  completeRateDiff: number;
  agentReqCnt: number;
  agentTransferRate: number;
  agentTransferRateDiff: number;
  incompleteCnt: number;
  incompleteRate: number;
  incompleteRateDiff: number;
  avgBusyTime: number;
  avgBusyTimeDiff: number;
  prevEntryCnt: number;
  prevCompleteCnt: number;
  prevAgentReqCnt: number;
  prevIncompleteCnt: number;
}

/**
 * 대화 현황
 *
 * - entryCnt: 진입수
 * - entryDiff: 진입수 전일대비
 * - completeCnt: 완결수
 * - completeRate: 완결률 (%)
 * - completeRateDiff: 완결률 전일대비 (%p)
 * - incompleteCnt: 미완결수
 * - incompleteRate: 미완결률 (%)
 * - incompleteRateDiff: 미완결률 전일대비 (%p)
 * - prevEntryCnt: 전일 진입수
 * - prevCompleteCnt: 전일 완결수
 * - prevIncompleteCnt: 전일 미완결수
 */
export interface DialogSummary {
  entryCnt: number;
  entryDiff: number;
  completeCnt: number;
  completeRate: number;
  completeRateDiff: number;
  incompleteCnt: number;
  incompleteRate: number;
  incompleteRateDiff: number;
  prevEntryCnt: number;
  prevCompleteCnt: number;
  prevIncompleteCnt: number;
}

/**
 * 슬롯 현황
 *
 * - entryCnt: 진입수
 * - entryDiff: 진입수 전일대비
 * - completeCnt: 완결수
 * - completeRate: 완결률 (%)
 * - completeRateDiff: 완결률 전일대비 (%p)
 * - incompleteCnt: 미완결수
 * - incompleteRate: 미완결률 (%)
 * - incompleteRateDiff: 미완결률 전일대비 (%p)
 * - prevEntryCnt: 전일 진입수
 * - prevCompleteCnt: 전일 완결수
 * - prevIncompleteCnt: 전일 미완결수
 */
export interface SlotSummary {
  entryCnt: number;
  entryDiff: number;
  completeCnt: number;
  completeRate: number;
  completeRateDiff: number;
  incompleteCnt: number;
  incompleteRate: number;
  incompleteRateDiff: number;
  prevEntryCnt: number;
  prevCompleteCnt: number;
  prevIncompleteCnt: number;
}

/**
 * 대화 미완결율 순위
 *
 * - rank: 순위 (미완결 기준)
 * - serviceName: 시나리오명
 * - dialogName: 대화명
 * - entryCnt: 진입수
 * - completeCnt: 완결수
 * - completeRate: 완결률 (%)
 * - incompleteCnt: 미완결수
 * - incompleteRate: 미완결률 (%)
 */
export interface DialogIncompleteTopItem {
  rank: number;
  serviceName: string;
  dialogName: string;
  entryCnt: number;
  completeCnt: number;
  completeRate: number;
  incompleteCnt: number;
  incompleteRate: number;
}

/**
 * 슬롯 미완결율 순위
 *
 * - rank: 순위 (미완결 기준)
 * - serviceName: 시나리오명
 * - dialogName: 대화명
 * - slotName: 슬롯명
 * - entryCnt: 진입수
 * - completeCnt: 완결수
 * - completeRate: 완결률 (%)
 * - incompleteCnt: 미완결수
 * - incompleteRate: 미완결률 (%)
 */
export interface SlotIncompleteTopItem {
  rank: number;
  serviceName: string;
  dialogName: string;
  slotName: string;
  entryCnt: number;
  completeCnt: number;
  completeRate: number;
  incompleteCnt: number;
  incompleteRate: number;
}

/**
 * 슬롯 평균 재시도 횟수 순위
 *
 * - rank: 순위
 * - serviceName: 시나리오명
 * - dialogName: 대화명
 * - slotName: 슬롯명
 * - entryCnt: 진입수
 * - completeCnt: 완결수
 * - avgRetryCount: 평균 재시도
 * - oneTimeCompleteCnt: 1회이하 완결수
 * - twoTimeCompleteCnt: 2회 완결수
 * - threeOrMoreCompleteCnt: 3회이상 완결수
 */
export interface SlotRetryAvgTopItem {
  rank: number;
  serviceName: string;
  dialogName: string;
  slotName: string;
  entryCnt: number;
  completeCnt: number;
  avgRetryCount: number;
  oneTimeCompleteCnt: number;
  twoTimeCompleteCnt: number;
  threeOrMoreCompleteCnt: number;
}

/**
 * 슬롯 재시도 분포 순위
 *
 * - rank: 순위
 * - serviceName: 시나리오명
 * - slotName: 슬롯명
 * - entryCnt: 진입수
 * - completeCnt: 완결수
 * - oneTimeCompleteCnt: 1회이하 완결수
 * - oneTimeCompleteRate: 1회이하 비율 (%)
 * - twoTimeCompleteCnt: 2회 완결수
 * - twoTimeCompleteRate: 2회 비율 (%)
 * - threeOrMoreCompleteCnt: 3회이상 완결수
 * - threeOrMoreCompleteRate: 3회이상 비율 (%)
 * - avgRetryCount: 평균 재시도
 */
export interface SlotRetryDistTopItem {
  rank: number;
  serviceName: string;
  dialogName: string;
  slotName: string;
  entryCnt: number;
  completeCnt: number;
  oneTimeCompleteCnt: number;
  oneTimeCompleteRate: number;
  twoTimeCompleteCnt: number;
  twoTimeCompleteRate: number;
  threeOrMoreCompleteCnt: number;
  threeOrMoreCompleteRate: number;
  avgRetryCount: number;
}

/**
 * 키워드 현황
 *
 * - rank: 순위
 * - keyword: 키워드
 * - detectCnt: 검출 횟수
 */
export interface KeywordTopItem {
  rank: number;
  keyword: string;
  detectCnt: number;
}

/**
 * 개체 순위
 *
 * - rank: 순위
 * - entityTag: 엔티티 태그
 * - detectCnt: 검출 횟수
 */
export interface EntityTopItem {
  rank: number;
  entityTag: string;
  detectCnt: number;
}

/**
 * 의도 순위
 *
 * - rank: 순위
 * - intent: 인텐트명
 * - detectCnt: 검출 횟수
 */
export interface IntentTopItem {
  rank: number;
  intent: string;
  detectCnt: number;
}

/**
 * 의도 Check/Fail 순위
 *
 * - rank: 순위
 * - serviceId: 시나리오 ID
 * - serviceName: 시나리오명
 * - modelId: 모델 ID
 * - modelName: 모델명
 * - intent: 인텐트명
 * - detectCnt: 인식수
 * - passCnt: Pass 건수
 * - passRate: Pass 비율 (%)
 * - checkCnt: Check 건수
 * - checkRate: Check 비율 (%)
 * - failCnt: Fail 건수
 * - failRate: Fail 비율 (%)
 */
export interface IntentCheckFailTopItem {
  rank: number;
  serviceId: number;
  serviceName: string;
  modelId: string;
  modelName: string;
  intent: string;
  detectCnt: number;
  passCnt: number;
  passRate: number;
  checkCnt: number;
  checkRate: number;
  failCnt: number;
  failRate: number;
}

/**
 * 의도 실패율 순위
 *
 * - rank: 순위
 * - serviceId: 시나리오 ID
 * - serviceName: 시나리오명
 * - modelId: 모델 ID
 * - modelName: 모델명
 * - intent: 인텐트명
 * - detectCnt: 인식수
 * - failCnt: Fail 수
 * - failRate: 실패율 (%)
 */
export interface IntentFailRateTopItem {
  rank: number;
  serviceId: number;
  serviceName: string;
  modelId: string;
  modelName: string;
  intent: string;
  detectCnt: number;
  failCnt: number;
  failRate: number;
}

/**
 * 시간대별 기본 데이터
 *
 * - serviceId: 시나리오 ID
 * - serviceName: 시나리오명
 */
interface HourlyBaseItem {
  serviceId: string;
  serviceName: string;
}

/**
 * 시간대별 시나리오 데이터
 *
 * - hourlyStats: 시간대별 통계 (00~23시)
 */
export interface HourlyEntryItem extends HourlyBaseItem {
  hourlyStats: HourlyEntryStatsItem[];
}

/**
 * 시간대별 진입수 데이터
 *
 * - hour: 시간대 (0~23)
 * - entryCnt: 진입수
 */
interface HourlyEntryStatsItem {
  hour: string;
  entryCnt: number;
}

/**
 * 점유율 항목
 *
 * - key: 명칭
 * - callCount: 실시간 콜수
 */
export interface OccupancyItem {
  key: string;
  callCount: number;
}

/**
 * 봇 대시보드 API 응답
 *
 * - scenarioSummary: 봇 현황
 * - dialogSummary: 대화 현황
 * - slotSummary: 슬롯 현황
 * - dialogIncompleteTop: 대화 미완결율 순위
 * - slotIncompleteTop: 슬롯 미완결율 순위
 * - slotRetryAvgTop: 슬롯 평균 재시도 횟수 순위
 * - slotRetryDistTop: 슬롯 재시도 분포 순위
 * - keywordTop: 키워드 현황
 * - entityTop: 개체 순위
 * - intentTop: 의도 순위
 * - intentCheckFailTop: 의도 Check/Fail 순위
 * - hourlyEntry: 시간대별 봇 진입 현황
 * - serviceOccupancy: 봇 점유 현황
 * - dialogOccupancy: 대화 점유 현황
 * - slotOccupancy: 슬롯 점유 현황
 */
export interface BotDashboardResponse {
  scenarioSummary: ScenarioSummary;
  dialogSummary: DialogSummary;
  slotSummary: SlotSummary;
  dialogIncompleteTop: DialogIncompleteTopItem[];
  slotIncompleteTop: SlotIncompleteTopItem[];
  slotRetryAvgTop: SlotRetryAvgTopItem[];
  slotRetryDistTop: SlotRetryDistTopItem[];
  keywordTop: KeywordTopItem[];
  entityTop: EntityTopItem[];
  intentTop: IntentTopItem[];
  intentCheckFailTop: IntentCheckFailTopItem[];
  intentFailRateTop: IntentFailRateTopItem[];
  hourlyEntry: HourlyEntryItem[];
  serviceOccupancy: OccupancyItem[];
  dialogOccupancy: OccupancyItem[];
  slotOccupancy: OccupancyItem[];
}

/** 위젯 타입 정보를 포함하는 확장 레이아웃 아이템 */
export interface DashboardLayoutItem extends LayoutItem {
  widgetType: DashboardWidgetType;
}

export const DASHBOARD_VIEW = {
  CHART: 'chart',
  TABLE: 'table',
} as const;
export type DashboardViewMode = (typeof DASHBOARD_VIEW)[keyof typeof DASHBOARD_VIEW];

// --- 대시보드 옵션 타입 ---

/** 위젯 구독 옵션 (위젯마다 자유롭게 구성) */
export type DashboardSubscribeOptions = Record<string, unknown>;

// --- WebSocket 메시지 프로토콜 타입 ---

export type DashboardWidgetType = keyof BotDashboardResponse;

export const DASHBOARD_MSG_TYPE = {
  SUBSCRIBE: 'SUBSCRIBE',
  UNSUBSCRIBE: 'UNSUBSCRIBE',
  DATA: 'DATA',
  ERROR: 'ERROR',
  CONNECTED: 'CONNECTED',
  SUBSCRIBED: 'SUBSCRIBED',
  UNSUBSCRIBED: 'UNSUBSCRIBED',
} as const;
export type DashboardMsgType = (typeof DASHBOARD_MSG_TYPE)[keyof typeof DASHBOARD_MSG_TYPE];

interface DashboardWsBaseMessage {
  wsId: string;
}

/** 클라이언트 → 서버: 위젯 구독 */
export interface DashboardWsSubscribeMessage extends DashboardWsBaseMessage {
  type: typeof DASHBOARD_MSG_TYPE.SUBSCRIBE;
  widgetId: string;
  widgetType: DashboardWidgetType;
  options: DashboardSubscribeOptions;
}

/** 클라이언트 → 서버: 위젯 구독 해제 */
export interface DashboardWsUnsubscribeMessage extends DashboardWsBaseMessage {
  type: typeof DASHBOARD_MSG_TYPE.UNSUBSCRIBE;
  widgetId: string;
}

/** 서버 → 클라이언트: 데이터 push */
export interface DashboardWsDataMessage extends DashboardWsBaseMessage {
  type: typeof DASHBOARD_MSG_TYPE.DATA;
  widgetId: string;
  widgetType: DashboardWidgetType;
  data: unknown;
}

/** 서버 → 클라이언트: 에러 */
export interface DashboardWsErrorMessage extends DashboardWsBaseMessage {
  type: typeof DASHBOARD_MSG_TYPE.ERROR;
  widgetId: string;
  message: string;
}

/** 서버 → 클라이언트: 연결 시 wsId 전달 */
export interface DashboardWsConnectedMessage extends DashboardWsBaseMessage {
  type: typeof DASHBOARD_MSG_TYPE.CONNECTED;
}

/** 서버 → 클라이언트: 위젯 구독 시 전달 */
export interface DashboardWsSubscribedMessage extends DashboardWsBaseMessage {
  type: typeof DASHBOARD_MSG_TYPE.SUBSCRIBED;
  widgetId: string;
  widgetType: DashboardWidgetType;
  options: DashboardSubscribeOptions;
}

/** 서버 → 클라이언트: 위젯 구독 해제 시 전달 */
export interface DashboardWsUnsubscribedMessage extends DashboardWsBaseMessage {
  type: typeof DASHBOARD_MSG_TYPE.UNSUBSCRIBED;
  widgetId: string;
}

export type DashboardWsServerMessage =
  | DashboardWsDataMessage
  | DashboardWsErrorMessage
  | DashboardWsConnectedMessage
  | DashboardWsSubscribedMessage
  | DashboardWsUnsubscribedMessage;
