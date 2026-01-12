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
}
export type TrainStatus = 0 | 1 | 2;

export enum ModelType {
  NORMAL = 0,
  PUBLIC = 1,
}

export type ModelListItem = Pick<Model, 'modelId' | 'modelName' | 'modelType' | 'trainStatus' | 'trainTime'> & {
  intentCount: number;
  entityCount: number;
};

export type ModelItem = Model;

export type ModelCreateDatas = Pick<Model, 'modelName' | 'expansion1' | 'modelType'>;
export type ModelBasicInfoUpdateDatas = Pick<Model, 'modelName' | 'expansion1'>;
