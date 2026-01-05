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
  status: number;
  tags: string[];
}

export type RetrainListItem = Retrain;
export type RetrainUpdateDatas = Pick<Retrain, 'question' | 'answer'>;
