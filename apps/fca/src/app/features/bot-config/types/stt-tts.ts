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
