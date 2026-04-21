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
  fromDateTime?: string;
  toDateTime?: string;
  keyword?: string;
  inoutKind?: string;
  ucidGkey?: string;
  dnNo?: string;
  rxtxKind?: string;
  engineCode?: string;
  tenantId?: number;
}

export interface RecogTargetItem {
  ucidGkey: string;
  dnNo: string;
  callDatetime: string;
  talkTime: string;
  rxtxKind: string;
  sentence: string;
}

export interface RecogTargetListItem {
  id: number;
  sentence: string;
  rxtxKind: string;
  ucidGkey: string;
  workTime: string;
}

export interface RecogTargetAddData {
  groupCode: string;
  ucidGkey: string;
  sentence: string;
}
