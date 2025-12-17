export interface Model {
  modelId: string;
  pointId: string;
  modelName: string;
  modelDesc: string;
  modelKey: string;
  tenantId: number;
  modelType: number;
  threshold: number;
  expansion1: string;
  expansion2: string;
  trainId: string;
  trainStatus: number;
  trainTime: string;
}

export type ModelListItem = Pick<Model, 'modelId' | 'modelName' | 'trainStatus' | 'trainTime'> & {
  intentCount: number;
  entityCount: number;
};

export type TrainStatus = 0 | 1 | 2;

export type ModelCreateDatas = Pick<Model, 'modelName' | 'modelDesc'>;
export type ModelBasicInfoUpdateDatas = Pick<Model, 'modelName' | 'modelDesc'>;
