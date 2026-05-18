export interface ConfidenceTrainingSearchParams {
  fromDateTime?: string; // yyyyMMddHHmmss
  toDateTime?: string; // yyyyMMddHHmmss
  keyword?: string;
  inoutKind?: string;
  ucidGkey?: string;
  dnNo?: string;
  rxtxKind?: string;
  engineCode?: string;
  confidence?: number;
}

export interface ConfidenceTrainingItem {
  ucidGkey: string;
  armsoffset: number;
  endoffset: number;
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
  engineCode: string;
  confidence: number;
}

export interface TuningSentenceCreateDatas {
  ucidGkey: string;
  armsoffset: number;
  rxtxKind: string;
  trString: string;
  engineCode?: string;
}

export interface TuningSentenceUpdateDatas {
  ucidGkey: string;
  armsoffset: number;
  rxtxKind: string;
  trString: string;
  engineCode: string;
}

// 문자수정
export interface TuningSentenceSearchParams {
  fromDate?: string; // YYYYMMDD
  toDate?: string; // YYYYMMDD
  engineCode?: string;
  keyword?: string;
  tunningKind?: string; // '': 전체, '1': 반영, '2': 미반영
}

export interface TuningSentenceItem {
  dataKey: number;
  ucidGkey: string;
  armsoffset: number;
  endoffset: number;
  rxtxKind: string;
  sentence: string;
  trString: string;
  tunningKind?: string;
  engineCode: string;
  trManageId: string;
  workTime: string;
  recSystemIp: string;
  saFilepath: string;
  saFilename: string;
}
