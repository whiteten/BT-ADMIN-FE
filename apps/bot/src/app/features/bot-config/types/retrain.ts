export interface Retrain {
  ucidGkey: string;
  questionSeq: number;
  scnId: string;
  hop: number;
  question: string;
  intent: string;
  confidence: number;
  isSuccess: number;
  answer: string;
  dbInsertTime: string;
  status: RetrainStatus;
  tags: string[];
}

/**
 * 0: 미반영, 1: 반영
 */
export type RetrainStatus = 0 | 1;

export type RetrainListItem = Retrain;
export type RetrainUpdateDatas = Pick<Retrain, 'question' | 'answer'>;
