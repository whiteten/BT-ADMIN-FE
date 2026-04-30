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

export type DeployStatus = 'deploying' | 'requested' | 'deployed' | 'failed';
export type DeployType = 'realtime' | 'scheduled';

export interface SttModelDeployItem {
  deployId: string;
  modelName: string;
  deployTime: string;
  deployType: DeployType;
  deployStatus: DeployStatus;
}

export interface SttModelDeploySearchParams {
  modelName?: string;
}
