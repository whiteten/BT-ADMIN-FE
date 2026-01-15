export interface Model {
  modelId: string;
  modelName: string;
  modelKey: string;
  tenantId: number;
  modelType: ModelType;
  threshold: number;
  expansion1: string; // 모델 설명
  expansion2: string;
  trainId: string;
  trainStatus: TrainStatus;
  trainTime: string;
  deployStatus: DeployStatus;
  deployTime: string;
}

// 0: 미학습, 1: 학습중, 2: 학습완료, 3: 학습실패
export type TrainStatus = 0 | 1 | 2 | 3;
// 0: 미배포, 1: 배포중, 2: 배포완료, 3: 배포실패
export type DeployStatus = 0 | 1 | 2 | 3;

export enum ModelType {
  NORMAL = 0,
  PUBLIC = 1,
}

export type ModelListItem = Pick<Model, 'modelId' | 'modelName' | 'modelType' | 'trainStatus' | 'trainTime' | 'deployStatus' | 'deployTime'> & {
  intentCount: number;
  entityCount: number;
};

export type ModelItem = Model;

export type ModelCreateDatas = Pick<Model, 'modelName' | 'expansion1' | 'modelType'>;
export type ModelBasicInfoUpdateDatas = Pick<Model, 'modelName' | 'expansion1'>;
