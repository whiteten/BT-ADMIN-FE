/**
 * 시나리오 현황
 *
 * - entryCnt: 진입수
 * - entryDiff: 진입수 전일대비 (%p)
 * - completeCnt: 완결수
 * - completeRate: 완결률 (%)
 * - completeRateDiff: 완결률 전일대비 (%p)
 * - agentReqCnt: 상담원 전환수
 * - agentTransferRate: 상담원 전환률 (%)
 * - agentTransferRateDiff: 상담원 전환률 전일대비 (%p)
 * - incompleteCnt: 미완결수
 * - incompleteRate: 미완결률 (%)
 * - incompleteRateDiff: 미완결률 전일대비 (%p)
 * - avgBusyTime: 평균 점유시간 (초)
 * - avgBusyTimeDiff: 평균 점유시간 전일대비 (초)
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
}

/**
 * 대화 현황
 *
 * - entryCnt: 진입수
 * - entryDiff: 진입수 전일대비 (%p)
 * - completeCnt: 완결수
 * - completeRate: 완결률 (%)
 * - completeRateDiff: 완결률 전일대비 (%p)
 * - incompleteCnt: 미완결수
 * - incompleteRate: 미완결률 (%)
 * - incompleteRateDiff: 미완결률 전일대비 (%p)
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
}

/**
 * 슬롯 현황
 *
 * - entryCnt: 진입수
 * - entryDiff: 진입수 전일대비 (%p)
 * - completeCnt: 완결수
 * - completeRate: 완결률 (%)
 * - completeRateDiff: 완결률 전일대비 (%p)
 * - incompleteCnt: 미완결수
 * - incompleteRate: 미완결률 (%)
 * - incompleteRateDiff: 미완결률 전일대비 (%p)
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
}

/**
 * 대화 미완결율 TOP
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
 * 슬롯 미완결율 TOP
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
 * 슬롯 평균 재시도 횟수 TOP
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
 * 슬롯 재시도 분포 TOP
 *
 * - rank: 순위
 * - serviceName: 시나리오명
 * - dialogName: 대화명
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
 * 키워드 TOP
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
 * 엔티티 TOP
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
 * 인텐트 TOP
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
 * 인텐트 Check/Fail TOP
 *
 * - rank: 순위
 * - serviceName: 시나리오명
 * - modelName: 모델명
 * - intent: 인텐트명
 * - detectCnt: 인식수
 * - avgConfidence: 평균 신뢰도
 * - passRate: Pass 비율 (%)
 * - checkRate: Check 비율 (%)
 * - failRate: Fail 비율 (%)
 */
export interface IntentCheckFailTopItem {
  rank: number;
  serviceName: string;
  modelName: string;
  intent: string;
  detectCnt: number;
  avgConfidence: number;
  passRate: number;
  checkRate: number;
  failRate: number;
}

/**
 * 인텐트 평균 신뢰도 TOP
 *
 * - rank: 순위
 * - serviceName: 시나리오명
 * - modelName: 모델명
 * - intent: 인텐트명
 * - detectCnt: 인식수
 * - avgConfidence: 평균 신뢰도
 * - passRate: Pass 비율 (%)
 * - checkRate: Check 비율 (%)
 * - failRate: Fail 비율 (%)
 */
export interface IntentConfidenceTopItem {
  rank: number;
  serviceName: string;
  modelName: string;
  intent: string;
  detectCnt: number;
  avgConfidence: number;
  passRate: number;
  checkRate: number;
  failRate: number;
}

/**
 * 시간대별 통계 항목
 *
 * - hour: 시간대 (0~23)
 * - entryCnt: 진입수
 * - sumBusyTime: 점유시간 (초)
 */
export interface HourlyStatsItem {
  hour: number;
  entryCnt: number;
  sumBusyTime: number;
}

/**
 * 시간대별 시나리오 데이터
 *
 * - serviceName: 시나리오명
 * - hourlyStats: 시간대별 통계 (00~23시)
 */
export interface HourlyScenarioItem {
  serviceName: string;
  hourlyStats: HourlyStatsItem[];
}

/**
 * 봇 대시보드 API 응답
 *
 * - scenarioSummary: 시나리오 현황
 * - dialogSummary: 대화 현황
 * - slotSummary: 슬롯 현황
 * - dialogIncompleteTop: 대화 미완결율 TOP
 * - slotIncompleteTop: 슬롯 미완결율 TOP
 * - slotRetryAvgTop: 슬롯 평균 재시도 TOP
 * - slotRetryDistTop: 슬롯 재시도 분포 TOP
 * - keywordTop: 키워드 TOP
 * - entityTop: 엔티티 TOP
 * - intentTop: 인텐트 TOP
 * - intentCheckFailTop: 인텐트 Check/Fail TOP
 * - intentConfidenceTop: 인텐트 신뢰도 TOP
 * - hourlyEntry: 시간대별 봇 진입 현황
 * - hourlyBusyTime: 시간대별 봇 점유 현황
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
  intentConfidenceTop: IntentConfidenceTopItem[];
  hourlyEntry: HourlyScenarioItem[];
  hourlyBusyTime: HourlyScenarioItem[];
}
