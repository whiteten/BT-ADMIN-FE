export interface ConfidenceTrainingSearchParams {
  fromDateTime?: string; // yyyyMMddHHmmss
  toDateTime?: string; // yyyyMMddHHmmss
  keyword?: string;
  inoutKind?: string;
  ucidGkey?: string;
  dnNo?: string;
  rxtxKind?: string;
  engineCode?: string;
  tenantId?: string | number;
}

export interface ConfidenceTrainingItem {
  ucidGkey: string;
  armsoffset: number;
  talkTime: string;
  sentence: string;
  rxtxKind: string;
  recSystemIp: string;
  saFilepath: string;
  saFilename: string;
  callDatetime: string;
  inoutKind: string;
  dnNo: string;
  agentId: string;
  engineCode?: string;
  confidence: number;
}

export type ConfidenceTrainingCreateDatas = Pick<ConfidenceTrainingItem, 'ucidGkey' | 'sentence' | 'confidence'>;

// 문자수정
export interface TuningSentenceSearchParams {
  fromDate?: string; // YYYYMMDD
  toDate?: string; // YYYYMMDD
  engineCode?: string;
  keyword?: string;
  tuningKind?: string; // '': 전체, '1': 반영, '2': 미반영
}

export interface TuningSentenceItem {
  dataKey: number;
  ucidGkey: string;
  armsoffset: number;
  trString: string;
  tuningKind?: string;
  workTime: string;
}
