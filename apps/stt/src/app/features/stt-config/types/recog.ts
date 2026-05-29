export interface RecogGroupSearchParams {
  engineCode?: string;
}

export interface RecogGroupItem {
  groupCode: string;
  groupName: string;
  engineCode: string;
  sentenceCount: number;
  workTime: string;
}

export interface RecogGroupCreateData {
  groupName: string;
  engineCode: string;
}

export interface RecogGroupDetail {
  groupCode: string;
  groupName: string;
  engineCode: string;
  lastScore?: number;
  lastMeasuredAt?: string;
}

export interface RecogAccuracyResult {
  score: number;
  measuredAt: string;
}

export interface RecogGroupUpdateData {
  groupCode: string;
  groupName: string;
}

export interface RecogTargetSearchParams {
  groupCode?: string;
  engineCode?: string;
  fromDateTime?: string;
  toDateTime?: string;
  dnNo?: string;
}

export interface RecogTargetSearchItem {
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
}

export interface RecogTargetListItem {
  id: number;
  groupCode: string;
  ucidGkey: string;
  armsoffset: number;
  rxtxKind: string;
  orgSentence: string;
  saLoadResult: number;
  loadUser: number;
  loadTime: string;
}

export interface LatestRecogGroup {
  groupCode: string;
}

export interface RecogTargetCreateData {
  groupCode: string;
  ucidGkey: string;
  armsoffset: number;
  rxtxKind: number;
  orgSentence: string;
  engineCode: string;
}
