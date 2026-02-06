export interface BotDashboardResponse {
  scenarios: ScenarioItem[];
  topIntentsData: TopIntentsData;
  topKeywordsData: TopKeywordsData;
  topEntitiesData: TopEntitiesData;
  dialogsData: DialogsData;
  slotsData: SlotsData;
}
export interface ScenarioItem {
  serviceId: number;
  serviceName: string;
  entryCnt: number;
  completeCnt: number;
  incompleteCnt: number;
  completeRate: number;
  agentReqCnt: number;
  agentTransferRate: number;
  sumBusyTime: number;
  avgBusyTime: number;
  completeRateDiff: number;
  entryDiff: number;
  agentTransferRateDiff: number;
  avgBusyTimeDiff: number;
  hourlyStats: HourlyItem[];
}

export interface HourlyItem {
  hour: string;
  entryCnt: number;
  completeCnt: number;
  incompleteCnt: number;
  completeRate: number;
  agentReqCnt: number;
}

export interface TopIntent {
  rank: number;
  intent: string;
  detectCnt: number;
  detectDiff: number;
}

export interface TopIntentsData {
  serviceId: number;
  serviceName: string;
  modelId: number;
  modelName: string;
  avgConfidence: number;
  thresholdPassCnt: number;
  thresholdPassRate: number;
  thresholdCheckCnt: number;
  thresholdCheckRate: number;
  thresholdFailCnt: number;
  thresholdFailRate: number;
  topIntents: TopIntent[];
}

export interface TopKeywordsData {
  serviceId: number;
  serviceName: string;
  modelId: number;
  modelName: string;
  topKeywords: TopKeyword[];
}

export interface TopKeyword {
  rank: number;
  keyword: string;
  entityTag: string | null;
  detectCnt: number;
  detectDiff: number;
}
export interface TopEntitiesData {
  serviceId: number;
  serviceName: string;
  modelId: number;
  modelName: string;
  topEntities: TopEntity[];
}

export interface TopEntity {
  rank: number;
  entityTag: string;
  entityValue: string;
  detectCnt: number;
  detectDiff: number;
}

export interface DialogsData {
  serviceId: number;
  serviceName: string;
  dialogId: number;
  dialogName: string;
  dialogs: DialogItem[];
}

export interface DialogItem {
  dialogName: string;
  entryCnt: number;
  completeCnt: number;
  completeRate: number;
  incompleteCnt: number;
  incompleteRate: number;
}

export interface SlotsData {
  serviceId: number;
  serviceName: string;
  dialogId: number;
  dialogName: string;
  slotId: number;
  slots: SlotItem[];
}

export interface SlotItem {
  slotName: string;
  entityTag: string;
  entryCnt: number;
  completeCnt: number;
  completeRate: number;
  oneTimeCompleteCnt: number;
  oneTimeCompleteRate: number;
  twoTimeCompleteCnt: number;
  twoTimeCompleteRate: number;
  threeOrMoreCompleteCnt: number;
  threeOrMoreCompleteRate: number;
  avgRetryCount: number;
}
