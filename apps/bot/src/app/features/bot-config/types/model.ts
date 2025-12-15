export interface Model {
  modelId: string;
  pointId: string;
  modelName: string;
  modelKey: string;
  tenantId: number;
  modelType: number;
  threshold: number;
  expansion1: string;
  expansion2: string;
  trainId: string;
  trainStatus: string;
  trainTime: string;
}

export type ModelListItem = Pick<Model, 'modelId' | 'modelName' | 'trainStatus' | 'trainTime'> & {
  intentCount: number;
  entityCount: number;
};
