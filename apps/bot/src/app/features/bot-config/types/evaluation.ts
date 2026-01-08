export type EvalStatus = 0 | 1 | 2;

export interface Evaluation {
  evalId: string;
  evalName: string;
  evalStatus: EvalStatus;
  evalStatusNm: string;
  modelId: string;
  createDate: string;
}

export type EvaluationListItem = Evaluation & { questionCount: number };
export type EvaluationItem = Evaluation;
export type EvaluationCreateDatas = Pick<Evaluation, 'evalName'>;
export type EvaluationUpdateDatas = Pick<Evaluation, 'evalName'>;

export interface EvaluationQuestion {
  evalId: string;
  questionSeq: number;
  question: string;
  answer: string;
}

export type EvaluationQuestionListItem = EvaluationQuestion;
export type EvaluationQuestionCreateDatas = Pick<EvaluationQuestion, 'question' | 'answer'>;
export type EvaluationQuestionCreateBulkDatas = EvaluationQuestionCreateDatas[];
export type EvaluationQuestionUpdateDatas = Pick<EvaluationQuestion, 'question' | 'answer'>;

export interface EvaluationResult {
  evalId: string;
  evalDate: string;
  evalDateFormatted: string;
  questionSeq: number;
  intent: string;
  question: string;
  answer: string;
  accuracy: number;
  confidence: number;
  resultStatus: EvaluationResultStatus;
}

export type EvaluationResultStatus = '대기중' | '진행중' | '완료';

export type EvaluationResultListItem = Pick<EvaluationResult, 'evalId' | 'evalDate' | 'confidence' | 'accuracy' | 'resultStatus'>;
export type EvaluationResultListByEvalDateItem = Omit<EvaluationResult, 'evalDateFormatted' | 'resultStatus'>;
export type EvaluationResultListByEvalDateAndQuestionSeqItem = Pick<EvaluationResult, 'evalId' | 'evalDate' | 'questionSeq' | 'intent' | 'confidence'>;
