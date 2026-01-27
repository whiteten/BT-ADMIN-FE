export interface Inference {
  text: string;
  modelType: TargetServer;
}

export enum TargetServer {
  TEST = 'test',
  PROD = 'prod',
}

export interface InferenceResponse {
  modelName: string;
  keywords: Record<string, unknown>[];
  intent: Record<string, unknown>[];
  entity: Record<string, unknown>[];
}
