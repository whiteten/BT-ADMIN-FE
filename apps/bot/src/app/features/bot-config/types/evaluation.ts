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

// TODO: EvaluationResult 관련 타입은 API 연동 시 실제 응답 타입에 맞게 수정 필요
export type EvaluationResultStatus = 0 | 1 | 2;

export interface EvaluationResultItem {
  id: string;
  evaluationDate: string;
  accuracy: number;
  confidence: number;
  status: EvaluationResultStatus;
}
