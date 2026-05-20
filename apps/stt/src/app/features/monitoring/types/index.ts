export interface ChannelStatusItem {
  channelId: number;
  channelStatus: string;
  channelStatusNm: string;
  progressRate: string;
  chrPer: string;
  ucidGkey?: string;
}

export interface SttChatSentence {
  speaker: 'TX' | 'RX';
  text: string;
  time: string;
  offset: number;
}

export interface SttRealSentenceDrawerInfo {
  ucidGkey: string;
  channelId?: number;
  channelStatusNm?: string;
  dnNo?: string;
  agentName?: string;
  progressRate?: string;
}

export interface ChannelStatusSearchParams {
  ipv4: string;
}

export interface DnStatusItem {
  dnNo: string;
  ucidGkey: string;
  agentName: string;
  progressRate: string;
}
