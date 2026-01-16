import type { TrainDiffStatus, TrainStatus } from './model';

export interface Intent {
  modelId: string;
  intentId: string;
  intentName: string;
  intentDesc: string;
  trainStatus: number;
  trainDiffStatus: TrainDiffStatus;
  modelVersion: string;
  workUser: number;
  workTime: string;
}

export type IntentListItem = Intent & { sentenceCount: number; changedYn: boolean };
export type IntentItem = Omit<Intent, 'modelId' | 'trainStatus' | 'modelVersion'>;
export type IntentCreateDatas = Pick<Intent, 'intentName' | 'intentDesc'>;
export type IntentBasicInfoUpdateDatas = Pick<Intent, 'intentName' | 'intentDesc'>;

export interface IntentSentence {
  sentenceId: string;
  sentenceType: string;
  sentence: string;
  trainStatus: TrainStatus;
  trainDiffStatus: TrainDiffStatus;
  workUser: number;
  workTime: string;
  modelVersion: string;
  trainId: string;
}

export type IntentSentenceListItem = IntentSentence & { intentId: string; intentName: string };
export type IntentSentenceItem = IntentSentence;
export type IntentSentenceCreateDatas = Pick<IntentSentence, 'sentence'>;
export type IntentSentenceCreateBulkDatas = { sentences: string[] };
