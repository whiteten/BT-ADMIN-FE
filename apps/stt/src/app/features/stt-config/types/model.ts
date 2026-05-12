export type ModelTunningType = 0 | 1;
export type ModelTunningResult = 10 | 20 | 30 | 50;

export interface SttModelItem {
  modelVerId: string;
  modelVerName: string;
  modelDesc: string;
  recogRate: number | null;
  tunningKind: number;
  tunningResult: ModelTunningResult;
  tunningType: ModelTunningType;
  workTime: string;
}

export interface SttModelSearchParams {
  engineCode?: string;
}

export interface SttModelCreateData {
  engineCode: string;
  modelVerName: string;
  modelDesc?: string;
}

export interface SttModelUpdateData {
  engineCode: string;
  modelVerId: string;
  modelVerName: string;
  modelDesc?: string;
}

export interface RecogResultItem {
  ucidGkey: string;
  armsoffset: number;
  rxtxKind: number;
  recogStatus: number;
  recogStatusName: string;
  accuracyRate: number;
  recogRate: number;
  wordCnt: number;
  hitCnt: number;
  deletionCnt: number;
  substitutionCnt: number;
  insertionCnt: number;
  orgResult: string;
  sttResult: string;
}

export interface RecogResultSummary {
  recogRate: number | null;
  recogDate: string | null;
}

export interface RecogResultListData {
  items: RecogResultItem[];
  summary: RecogResultSummary;
}

export interface RecogResultSearchParams {
  modelVerId: string;
  groupCode: string;
}

export interface RecogResultRequestData {
  modelVerId: string;
  groupCode: string;
  // ucidGkey: string;
  // armsoffset: number;
  // rxtxKind: number;
}

export interface SttModelDeployItem {
  deployId: string;
  modelVerId: string;
  modelVerName: string;
  distributeType: number;
  distributeTypeName: string;
  distributeStatus: number;
  distributeResult: number;
  distributeResultName: string;
  distributeTime: string;
}

export interface SttModelDeploySearchParams {
  modelName?: string;
  systemId?: string;
}

export interface SttModelDeployCreateData {
  modelVerId: string;
  distributeType: number; // 0: 즉시배포, 1: 예약배포
  distributeDateTime: string; // 'YYYYMMDDHHmmss'
  systemIds: string[];
}
