export interface ChannelStatusItem {
  channelId: number;
  channelStatus: string;
  channelStatusNm: string;
  progressRate: string;
  chrPer: string;
  ucidGkey?: string;
  dnNo?: string;
  agentName?: string;
  inoutKind?: string;
  callDatetime?: string;
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
  ty?: string;
  channelId?: number;
  channelStatusNm?: string;
  inoutKind?: string;
  callDatetime?: string;
}
