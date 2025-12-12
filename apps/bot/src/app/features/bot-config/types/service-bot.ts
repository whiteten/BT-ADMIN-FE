/**
 * 봇 기본정보 컬럼
 */
export interface ServiceBot {
  serviceId: string;
  serviceName: string;
  serviceDesc?: string;
  serviceVer?: string;
  modelId?: string;
  modelName?: string;
  conversationCount: number;
  confidence: [number, number];
  tags?: string[];
  workTime: string;
}

/**
 * 봇 스케쥴 컬럼
 */
export interface ServiceBotSchedule {
  bhWorktimeId: number;
  ahMessage: string;
}

/**
 * 봇 STT & TTS 컬럼
 */
export interface ServiceBotVoice {
  sttId: number;
  ttsId: number;
  ttsSpeaker?: string;
  ttsSpeed: number;
  ttsVolume: number;
  ttsPitch: number;
}

export type ServiceBotListItem = Omit<ServiceBot, 'serviceDesc' | 'confidence'>;
export type ServiceBotItem = ServiceBot & ServiceBotSchedule & ServiceBotVoice;
export type ServiceBotCreateDatas = Omit<ServiceBot, 'serviceId' | 'conversationCount' | 'workTime'> & ServiceBotVoice;
export type ServiceBotBasicInfoUpdateDatas = Omit<ServiceBot, 'conversationCount' | 'workTime'>;
export type ServiceBotScheduleUpdateDatas = ServiceBotSchedule;
export type ServiceBotVoiceUpdateDatas = ServiceBotVoice;

export interface ServiceBotVersion {
  serviceId: string;
  serviceVer: string;
  versionName: string;
  versionDesc: string;
  workUser: string;
  workTime: string;
}

export type ServiceBotVersionListItem = ServiceBotVersion;
export type ServiceBotVersionItem = Omit<ServiceBotVersion, 'workUser' | 'workTime'>;
export type ServiceBotVersionCreateDatas = Omit<ServiceBotVersion, 'serviceId' | 'workUser' | 'workTime'>;
export type ServiceBotVersionUpdateDatas = Omit<ServiceBotVersion, 'workUser' | 'workTime'>;
