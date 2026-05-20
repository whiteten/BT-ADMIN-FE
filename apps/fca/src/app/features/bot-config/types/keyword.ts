import type { TrainDiffStatus, TrainStatus } from './model';

export interface Keyword {
  keywordId: string;
  keyword: string;
  keywordValues: string;
  trainStatus: TrainStatus;
  trainDiffStatus: TrainDiffStatus;
  changedYn: boolean;
  workTime: string;
}

export type KeywordListItem = Keyword;
export type KeywordCreateDatas = Pick<Keyword, 'keyword' | 'keywordValues'>;
export type KeywordUpdateDatas = Pick<Keyword, 'keyword' | 'keywordValues'>;
