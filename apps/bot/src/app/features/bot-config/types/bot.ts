/**
 * 봇 기본정보 컬럼
 */
export interface Bot {
  serviceId: string;
  serviceName: string;
  serviceDesc?: string;
  serviceVer?: string;
  modelId?: string;
  modelName?: string;
  confidence: [number, number];
  tags?: string[];
  workTime: string;
}

/**
 * 봇 스케쥴 컬럼
 */
export interface BotSchedule {
  bhWorktimeId: number;
  ahMessage: string;
}

/**
 * 봇 STT & TTS 컬럼
 */
export interface BotVoice {
  sttId: number;
  ttsId: number;
  ttsSpeaker?: string;
  ttsSpeed: number;
  ttsVolume: number;
  ttsPitch: number;
}

export type BotListItem = Omit<Bot, 'serviceDesc' | 'confidence'> & {
  conversationCount: number;
};
export type BotItem = Bot & BotSchedule & BotVoice;
export type BotCreateDatas = Omit<Bot, 'serviceId' | 'workTime'> & BotVoice;
export type BotBasicInfoUpdateDatas = Omit<Bot, 'workTime'>;
export type BotScheduleUpdateDatas = BotSchedule;
export type BotVoiceUpdateDatas = BotVoice;

export interface BotVersion {
  serviceId: string;
  serviceVer: string;
  versionName: string;
  versionDesc: string;
  workUser: string;
  workTime: string;
}

export type BotVersionListItem = BotVersion;
export type BotVersionItem = Omit<BotVersion, 'workUser' | 'workTime'>;
export type BotVersionCreateDatas = Omit<BotVersion, 'serviceId' | 'workUser' | 'workTime'> & {
  sourcever?: string;
};
export type BotVersionUpdateDatas = Omit<BotVersion, 'workUser' | 'workTime'>;

export interface BotDeployConfig {
  systemId: number;
  systemName: string;
  serviceId: number;
  priorVer: string;
  applyVer: string;
  assignYn: number;
}

export type BotDeployConfigItem = BotDeployConfig;
export type BotDeployConfigCreateDatas = { systemIds: number[] };

export interface BotAoeDetail {
  useAoe: number;
  agentId: string | null;
  agentName: string | null;
}

export type BotAoeDetailItem = BotAoeDetail;
export type BotAoeUpdateDatas = Omit<BotAoeDetail, 'agentName'>;
