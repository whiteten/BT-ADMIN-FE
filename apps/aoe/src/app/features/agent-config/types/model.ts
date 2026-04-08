export interface ModelListItem {
  modelId: string;
  modelName: string;
  modelType?: string;
  modelTypeName?: string;
  activeDetailCount?: number;
  totalDetailCount?: number;
  apiKey?: string;
  apiUrl?: string | null;
  workTime?: string;
  useYn?: 0 | 1;
}

export interface ModelValidateRequest {
  modelType: string;
  modelName: string;
  apiKey: string;
}

export interface ModelVersionItem {
  id: string;
  name: string;
  costPerInputToken?: number;
  costPerOutputToken?: number;
}

export interface ModelCreateRequest {
  modelName: string;
  modelType: string;
  apiKey?: string;
  modelVersions: ModelVersionItem[];
}

export interface AvailableModelItem {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
}

export interface ModelValidateResponseData {
  data: AvailableModelItem[];
  message: string;
  statusCode: 'SUCCESS' | 'FAIL';
}

export interface ModelItem extends ModelListItem {
  details?: ModelDetailItem[];
}

export interface ModelDetailItem {
  detailId: string;
  modelId: string;
  modelVersion: string;
  useYn: 0 | 1;
  costPerInputToken?: number;
  costPerOutputToken?: number;
  workTime?: string;
}

export interface ModelDetailUpdateDatas {
  detailId: string;
  useYn: 0 | 1;
  costPerInputToken?: number;
  costPerOutputToken?: number;
}

export interface ModelUpdateVersionItem {
  id: string;
  name: string;
  useYn: 0 | 1;
  costPerInputToken?: number;
  costPerOutputToken?: number;
}

export interface ModelUpdateRequest {
  modelName: string;
  useYn?: 0 | 1;
  modelVersions?: ModelUpdateVersionItem[];
}
