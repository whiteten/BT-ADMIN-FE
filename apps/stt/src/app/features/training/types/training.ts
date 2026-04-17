export interface TrainingSearchParams {
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  keyword?: string;
  inOutType?: string;
  ucid?: string;
  extension?: string;
  speakerType?: string;
  tenantId?: string | number;
}

export interface TrainingItem {
  ucid: string;
  extension: string;
  callDate: string;
  callDuration: string;
  speaker: string;
  confidence: number;
  sentence: string;
}

export type TrainingRegisterDatas = Pick<TrainingItem, 'ucid' | 'sentence' | 'confidence'>;
