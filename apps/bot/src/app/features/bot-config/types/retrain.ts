export interface Retrain {
  ucidGkey: string;
  questionSeq: number;
  scnId: string;
  scnVer: string;
  hop: number;
  question: string;
  intent: string;
  confidence: number;
  isSuccess: number;
  answer: string;
  dbInsertTime: string;
  status: RetrainStatus;
  tags: string[];
  ifeSubflowId?: number;
  ifeNodeName?: string;
}

/**
 * 1: 미반영, 2: 반영
 */
export type RetrainStatus = 1 | 2;

export type RetrainEntity = {
  entityTag: string;
  entityValue: string;
};

export type RetrainKeyword = {
  entityTag: string;
  keyword: string;
};

export type RetrainListItem = Retrain;
export type RetrainUpdateDatas = Pick<Retrain, 'question' | 'answer'>;
export type RetrainDetail = Retrain & {
  entityList: RetrainEntity[];
  keywordList: RetrainKeyword[];
};
