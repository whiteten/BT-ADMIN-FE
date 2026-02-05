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
  trainChangedYn: boolean;
  deployChangedYn: boolean;
}

// 0: 미학습, 1: 학습중, 2: 학습완료, 3: 학습실패
export type TrainStatus = 0 | 1 | 2 | 3;
// 0: 미배포, 1: 배포중, 2: 배포완료, 3: 배포실패
export type DeployStatus = 0 | 1 | 2 | 3;
/**
 * 이미 학습된 모델의 데이터 변경 상태
 */
export type TrainDiffStatus = 'ADDED' | 'MODIFIED' | 'DELETED';

export enum ModelType {
  NORMAL = 0,
  PUBLIC = 1,
}

export type ModelListItem = Pick<
  Model,
  'modelId' | 'modelName' | 'modelType' | 'trainStatus' | 'trainTime' | 'deployStatus' | 'deployTime' | 'trainChangedYn' | 'deployChangedYn'
> & {
  intentCount: number;
  entityCount: number;
};

export type ModelItem = Model;

export type ModelCreateDatas = Pick<Model, 'modelName' | 'expansion1' | 'modelType'> & {
  file?: File;
};
export type ModelBasicInfoUpdateDatas = Pick<Model, 'modelName' | 'expansion1'>;

/**
 * 엑셀 생성 데이터 타입
 * 1. fileName: 엑셀 파일명 (확장자 제외 (.xlsx 자동추가))
 * 2. sheetName: 엑셀 시트명 (엑셀 시트 탭 이름)
 * 3. keys: 엑셀 헤더 (컬럼 헤더 배열 (예: ["이름","나이","부서"]))
 * 4. values: 엑셀 데이터 (2차원 배열 (예: [["홍길동","30","개발팀"],["김철수","25","기획팀"]]))
 */
export type GenerateExcelDatas = { fileName: string; sheetName: string; keys: string[]; values: string[][] };
