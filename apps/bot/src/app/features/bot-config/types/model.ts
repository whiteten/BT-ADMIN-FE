export interface Model {
  modelId: string;
  modelName: string;
  modelKey: string;
  tenantId: number;
  modelType: number;
  threshold: number;
  expansion1: string; // 모델 설명
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

export type ModelCreateDatas = Pick<Model, 'modelName' | 'expansion1' | 'faqIntentYn'>;
export type ModelBasicInfoUpdateDatas = Pick<Model, 'modelName' | 'expansion1' | 'faqIntentYn'>;
