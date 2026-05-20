/**
 * IVR 미디어 관리 타입 정의 (IPR20S6041)
 *
 * AS-IS: TB_IR_MEDIA_SERVER (시스템 1:1) + TB_IR_TTS_MASTER + TB_IR_STT_MASTER
 * TO-BE: BT-ADMIN-SERVICE-IVR ivr-media feature
 *
 * 설계 메모:
 *  - ASR_USE_YN 은 화면 비노출 + 백엔드 자동 ON 정책 (AS-IS와 동일).
 *    Request DTO에서는 제거되어 백엔드가 강제 '1'(ON)로 세팅한다.
 *  - TTS_SERVER / STT_SERVER 는 0/1 기본여부 — 단 1건 제약은 Service 검증.
 */

// ─── Enum 코드 ──────────────────────────────────────────────────────────────

export type AsrUseStatusCode = '0' | '1'; // 미사용 | 사용

/** TTS Vendor — 공통코드 IR_TTS_VENDOR Enum 전환 */
export type IrTtsVendorCode = '10' | '20' | '30' | '40';

/** TTS Voice Format — 공통코드 IR_TTS_VOICE_FORMAT Enum 전환 */
export type IrTtsVoiceFormatCode = '10' | '20';

/** TTS Text Format — 공통코드 IR_TTS_TEXT_FORMAT Enum 전환 */
export type IrTtsTextFormatCode = '0' | '1';

// ─── Backend Response 타입 ─────────────────────────────────────────────────

export interface IrMediaServer {
  systemId: number;
  systemName?: string;
  speakerCnt: number;
  rtpIp: string;
  rtpCodec: string;
  dtmfOption: string;
  asrUseYn: AsrUseStatusCode; // 항상 '1' (백엔드 자동), 화면 비노출
  asrIp: string;
  asrPort: number;
  asrBackupIp: string;
  asrBackupPort: number;
  grammarPath: string;
  workUser?: number;
  workTime?: string;
}

export interface IrTtsMaster {
  ttsId: number;
  ttsName: string;
  ttsServer: number; // 0/1 (기본여부)
  ttsVendor: IrTtsVendorCode;
  ttsIp: string;
  ttsPort: number;
  ttsBackupIp?: string;
  ttsBackupPort?: number;
  ttsSpkId: string;
  ttsVoiceFormat: IrTtsVoiceFormatCode;
  ttsTextFormat: IrTtsTextFormatCode;
  workUser?: number;
  workTime?: string;
}

export interface IrSttMaster {
  sttId: number;
  sttName: string;
  sttServer: number; // 0/1 (기본여부 — 레거시 IPR20S6041_SttMasterInfo.jsp 체크박스)
  sttInterface: number; // 0/1 (3rd Party — 레거시 체크박스)
  sttIp: string;
  sttPort: number;
  sttBackupIp?: string;
  sttBackupPort?: number;
  sttGrammarPath?: string;
  workUser?: number;
  workTime?: string;
}

/**
 * ForCus 필터된 시스템 목록 (BFF Flow `ivr-system-list`).
 * SYS_CLASS_CD ∈ {1035, 1036, 1037} 시스템만. hasMediaServer 플래그로 카드의 "⚡ MS" 칩 노출 여부 판단.
 */
export interface IrSystemUsage {
  systemId: number;
  systemName: string;
  nodeId: number;
  nodeName?: string;
  hasMediaServer: boolean;
}

// ─── Request 타입 ──────────────────────────────────────────────────────────

export interface IrMediaServerUpsertRequest {
  speakerCnt: number;
  rtpIp: string;
  rtpCodec: string;
  dtmfOption: string;
  // asrUseYn 제거 — 백엔드가 자동으로 '1' 세팅 (AS-IS Hidden+강제 1 정책 유지)
  asrIp: string;
  asrPort: number;
  asrBackupIp: string;
  asrBackupPort: number;
  grammarPath: string;
}

export interface IrTtsMasterCreateRequest {
  ttsName: string;
  ttsServer: number;
  ttsVendor: IrTtsVendorCode;
  ttsIp: string;
  ttsPort: number;
  ttsBackupIp?: string;
  ttsBackupPort?: number;
  ttsSpkId: string;
  ttsVoiceFormat: IrTtsVoiceFormatCode;
  ttsTextFormat: IrTtsTextFormatCode;
}

/**
 * TTS Master 수정 요청 — AS-IS와 동일하게 ttsName 수정 불가.
 * 백엔드 {@code IrTtsMasterUpdateRequest} 에 ttsName 필드 자체가 없음.
 */
export type IrTtsMasterUpdateRequest = Partial<Omit<IrTtsMasterCreateRequest, 'ttsName'>>;

export interface IrSttMasterCreateRequest {
  sttName: string;
  sttServer: number;
  sttInterface: number; // 0/1 (3rd Party)
  sttIp: string;
  sttPort: number;
  sttBackupIp?: string;
  sttBackupPort?: number;
  sttGrammarPath?: string;
}

export type IrSttMasterUpdateRequest = Partial<IrSttMasterCreateRequest>;

// ─── Enum 라벨/옵션 ────────────────────────────────────────────────────────

export const ASR_USE_LABELS: Record<AsrUseStatusCode, string> = {
  '0': '미사용',
  '1': '사용',
};

/**
 * TTS_SERVER / STT_SERVER 기본 여부 드롭다운 옵션.
 * Integer 0/1 — Options와 initialValues 모두 number로 통일 (타입 불일치 방지).
 */
export const DEFAULT_FLAG_OPTIONS = [
  { label: '아니오 (N)', value: 0 },
  { label: '예 (Y) — 기본', value: 1 },
] as const;

export const DEFAULT_FLAG_LABELS: Record<number, string> = {
  0: '아니오',
  1: '예 (기본)',
};

// ─── TTS 공통코드 라벨/옵션 ─────────────────────────────────────────────────

export const TTS_VENDOR_OPTIONS = [
  { label: 'Voice Ware', value: '10' as IrTtsVendorCode },
  { label: 'HCI_Lab', value: '20' as IrTtsVendorCode },
  { label: 'Core Voice', value: '30' as IrTtsVendorCode },
  { label: '3rd Party', value: '40' as IrTtsVendorCode },
] as const;

export const TTS_VENDOR_LABELS: Record<IrTtsVendorCode, string> = {
  '10': 'Voice Ware',
  '20': 'HCI_Lab',
  '30': 'Core Voice',
  '40': '3rd Party',
};

export const TTS_VOICE_FORMAT_OPTIONS = [
  { label: 'PCM', value: '10' as IrTtsVoiceFormatCode },
  { label: 'WAV', value: '20' as IrTtsVoiceFormatCode },
] as const;

export const TTS_VOICE_FORMAT_LABELS: Record<IrTtsVoiceFormatCode, string> = {
  '10': 'PCM',
  '20': 'WAV',
};

export const TTS_TEXT_FORMAT_OPTIONS = [
  { label: 'NORMAL', value: '0' as IrTtsTextFormatCode },
  { label: 'SSML', value: '1' as IrTtsTextFormatCode },
] as const;

export const TTS_TEXT_FORMAT_LABELS: Record<IrTtsTextFormatCode, string> = {
  '0': 'NORMAL',
  '1': 'SSML',
};
