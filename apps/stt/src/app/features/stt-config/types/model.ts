export const MODEL_TUNNING_TYPE = {
  MANUAL: 0,
  AUTO: 1,
} as const;
export type ModelTunningType = (typeof MODEL_TUNNING_TYPE)[keyof typeof MODEL_TUNNING_TYPE];

export const MODEL_TUNNING_RESULT = {
  REQUESTED: 10,
  TRAINING: 20,
  FAILED: 30,
  DONE: 50,
} as const;
export type ModelTunningResult = (typeof MODEL_TUNNING_RESULT)[keyof typeof MODEL_TUNNING_RESULT];

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
  accuracyRate: number | null;
  recogRate: number | null;
  wordCnt: number | null;
  hitCnt: number | null;
  deletionCnt: number | null;
  substitutionCnt: number | null;
  insertionCnt: number | null;
  orgResult: string;
  sttResult: string | null;
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

export interface RecogEvaluateRequestData {
  modelVerId: string;
  groupCode: string;
  engineCode: string;
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
  distributeTime: string; // 'YYYYMMDDHHmmss'
  systemIds: string[];
}
