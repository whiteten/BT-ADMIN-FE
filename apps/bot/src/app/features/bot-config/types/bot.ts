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
  conversationCount: number;
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

export type BotListItem = Omit<Bot, 'serviceDesc' | 'confidence'>;
export type BotItem = Bot & BotSchedule & BotVoice;
export type BotCreateDatas = Omit<Bot, 'serviceId' | 'conversationCount' | 'workTime'> & BotVoice;
export type BotBasicInfoUpdateDatas = Omit<Bot, 'conversationCount' | 'workTime'>;
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
export type BotVersionCreateDatas = Omit<BotVersion, 'serviceId' | 'workUser' | 'workTime'>;
export type BotVersionUpdateDatas = Omit<BotVersion, 'workUser' | 'workTime'>;

export interface Stt {
  sttId: number;
  sttName: string;
  sttServer?: number;
  sttInterface?: number;
  sttIp?: string;
  sttPort?: number;
  sttBackupIp?: string;
  sttBackupPort?: number;
  sttGrammarPath?: string;
  workUser?: number;
  workTime?: string;
}

export type SttListItem = Pick<Stt, 'sttId' | 'sttName'>;

export interface Tts {
  ttsId: number;
  ttsName: string;
  ttsServer?: number;
  ttsVendor?: number;
  ttsIp?: string;
  ttsPort?: number;
  ttsSpkId?: string;
  ttsBackupIp?: string;
  ttsBackupPort?: number;
  ttsVoiceFormat?: number;
  ttsTextFormat?: number;
  workUser?: number;
  workTime?: string;
}

export type TtsListItem = Pick<Tts, 'ttsId' | 'ttsName'>;
