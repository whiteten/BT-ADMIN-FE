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
  faqIntentYn: number;
  faqIntentYnNm: string;
}
export type TrainStatus = 0 | 1 | 2;

export type ModelListItem = Pick<Model, 'modelId' | 'modelName' | 'trainStatus' | 'trainTime'> & {
  intentCount: number;
  entityCount: number;
};

export type ModelItem = Model;

export type ModelCreateDatas = Pick<Model, 'modelName' | 'modelDesc' | 'faqIntentYn'>;
export type ModelBasicInfoUpdateDatas = Pick<Model, 'modelName' | 'modelDesc' | 'faqIntentYn'>;
