export interface ChannelStatusItem {
  channelId: number;
  prtYn: 'Y' | 'N';
  channelStatus: number | null;
  channelStatusNm: string | null;
  progressRate: string | null;
  ucidGkey: string | null;
  analKind: string | null;
  ty: string | null;
  dnNo?: string | null;
  agentName?: string | null;
  inoutKind?: string | null;
  callDatetime?: string | null;
  mstartTime?: string | null;
}

export interface SttChatSentence {
  speaker: number; // 0: 왼쪽(고객), 1: 오른쪽(상담사)
  text: string;
  stime: string;
}

export interface RealtimeSentenceDrawerInfo {
  ucidGkey: string;
  channelId?: number;
  channelStatusNm?: string;
  dnNo?: string;
  agentName?: string;
  inoutKind?: string;
  callDatetime?: string;
}

export interface ChannelStatusSearchParams {
  ipv4: string;
}

export interface DnStatusSearchParams {
  dnNo?: string;
}

export interface DnStatusItem {
  dnNo: string;
  ucidGkey: string;
  agentName: string;
  progressRate: string;
  analKind?: string | null;
  ty?: string;
  channelId?: number;
  channelStatusNm?: string;
  inoutKind?: string;
  callDatetime?: string;
}

export interface CallStatusSummaryItem {
  workKindName: string;
  cnt: number;
  sort: number;
}

export interface CallStatusItem {
  ucidGkey: string;
  filename: string;
  callDate: string;
  callTime: string;
  workKind: number;
  workKindName: string;
  dnNo: string;
  dbInsertTime: string;
  saRuntime: string | null;
}

export interface CallStatusSearchParams {
  callDate: string;
}

export interface DashboardItem {
  callDate: string;
  completeCnt: number;
  real: number;
  batch: number;
}

export interface DashboardSummaryItem {
  kind: string;
  cnt: number;
  finalTime: string;
  rcnt: number;
  bcnt: number;
}

export interface DashboardChannelItem {
  systemId: number;
  systemName: string;
  systemAlias: string;
  systemIp: string;
  totCnt: number;
  runCnt: number;
  per: number;
}

export interface DashboardData {
  items: DashboardItem[];
  summary: DashboardSummaryItem[];
  channels: DashboardChannelItem[];
}

export interface DashboardSearchParams {
  callDate: string;
}
