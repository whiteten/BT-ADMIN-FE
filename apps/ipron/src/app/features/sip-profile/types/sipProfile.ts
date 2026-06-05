/**
 * SIP 프로파일 관리 타입 정의
 */

// ─── SIP 옵션 DTO (AS-IS: 18자리 문자열 → TO-BE: 객체) ─────────────────────
export interface SipOptionDto {
  didEarlyMedia: number; // [0] DID EarlyMedia Mode (0:미사용/1:사용)
  prackMode: number; // [1] PRACK Mode ON (0:미사용/1:사용)
  mentPlayOn: number; // [2] MENT PLAY ON (0:미사용/1:사용)
  telUri: number; // [3] TEL URI (0:미사용/1:사용)
  referKind: number; // [4] REFER 지원여부 (0:미지원/1:Blind/2:Attended)
  sipPrivacy: number; // [5] SIP Privacy (0:미사용/1:사용)
  autoAnswer: number; // [6] Auto Answer (SIP_OPT_04)
  notifyHold: number; // [7] Notify HOLD (0:미지원/1:지원)
  mobilePush: number; // [8] Mobile Push (0:미사용/1:사용)
  didAniKind: number; // [9] DID ANI Kind (SIP_OPT_01)
  didDnisKind: number; // [10] DID DNIS Kind (SIP_OPT_02)
  dodAniKind: number; // [11] DOD ANI Kind (SIP_OPT_03)
  videoCall: number; // [12] Video Call (0:미지원/1:지원)
  sipsUsage: number; // [13] SIPS 사용여부 (0:미사용/1:사용)
  sipsTcpReuse: number; // [14] SIPS TCP 재사용 (0:미사용/1:사용)
  rfc2833Usage: number; // [15] RFC2833 사용여부 (0:미사용/1:사용)
  noSdpInviteOffer: number; // [16] NoSDP INVITE Offer (0:미지원/1:지원)
  externalIpUsage: number; // [17] 외부 노출 IP 사용여부 (0:미사용/1:사용)
}

export interface SipHeaderOptionDto {
  diversion: number; // [0] Diversion (SIP_H_OPT_01)
  historyInfo: number; // [1] History Info (SIP_H_OPT_01)
  pAssertedIdentity: number; // [2] PAI (SIP_H_OPT_01)
  pPreferredIdentity: number; // [3] PPI (SIP_H_OPT_02)
  remotePartyId: number; // [4] Remote-Party-ID (SIP_H_OPT_02)
  pCalledPartyId: number; // [5] P-Called-Party-ID (SIP_H_OPT_02)
  pAssociatedUri: number; // [6] P-Associated-URI (SIP_H_OPT_02)
  ipronInfo: number; // [7] IPRON-Info (0:미사용/1:사용)
}

export const DEFAULT_SIP_OPTION: SipOptionDto = {
  didEarlyMedia: 1,
  prackMode: 0,
  mentPlayOn: 1,
  telUri: 0,
  referKind: 0,
  sipPrivacy: 0,
  autoAnswer: 0,
  notifyHold: 1,
  mobilePush: 0,
  didAniKind: 0,
  didDnisKind: 0,
  dodAniKind: 0,
  videoCall: 0,
  sipsUsage: 0,
  sipsTcpReuse: 1,
  rfc2833Usage: 0,
  noSdpInviteOffer: 1,
  externalIpUsage: 0,
};

export const DEFAULT_SIP_HEADER_OPTION: SipHeaderOptionDto = {
  diversion: 0,
  historyInfo: 0,
  pAssertedIdentity: 0,
  pPreferredIdentity: 0,
  remotePartyId: 0,
  pCalledPartyId: 0,
  pAssociatedUri: 0,
  ipronInfo: 0,
};

// ─── SIP 옵션 UI 정의 (라벨, 타입) ──────────────────────────────────────────

export type SipOptionControlType = 'switch' | 'select';

export interface SipOptionFieldDef {
  key: keyof SipOptionDto;
  label: string;
  controlType: SipOptionControlType;
  options?: { label: string; value: number }[];
}

/** AS-IS DB(TB_CC_COMMONCODE) 기준 SIP 옵션 18개 정의 */
export const SIP_OPTION_FIELDS: SipOptionFieldDef[] = [
  // CC_USED_STATUS (0:미사용, 1:사용)
  { key: 'didEarlyMedia', label: 'DID EarlyMedia Mode', controlType: 'switch' },
  { key: 'prackMode', label: 'PRACK Mode ON', controlType: 'switch' },
  { key: 'mentPlayOn', label: 'MENT PLAY ON', controlType: 'switch' },
  { key: 'telUri', label: 'TEL URI', controlType: 'switch' },
  // IE_REFER_KIND (0:미지원, 1:REFER, 2:REFER+Replaces)
  {
    key: 'referKind',
    label: 'REFER 지원여부',
    controlType: 'select',
    options: [
      { label: '미지원', value: 0 },
      { label: 'REFER', value: 1 },
      { label: 'REFER+Replaces', value: 2 },
    ],
  },
  { key: 'sipPrivacy', label: 'SIP Privacy', controlType: 'switch' },
  // SIP_OPT_04 (0:미사용, 1:Notify Event, 2:Call-Info, 3:Alert-Info)
  {
    key: 'autoAnswer',
    label: 'Auto Answer',
    controlType: 'select',
    options: [
      { label: '미사용', value: 0 },
      { label: 'Notify Event', value: 1 },
      { label: 'Call-Info', value: 2 },
      { label: 'Alert-Info', value: 3 },
    ],
  },
  // SUPPORT_YN (0:미지원, 1:지원)
  { key: 'notifyHold', label: 'Notify HOLD', controlType: 'switch' },
  { key: 'mobilePush', label: 'Mobile Push', controlType: 'switch' },
  // SIP_OPT_01 (0:From Number, 1:Redirecting Number)
  {
    key: 'didAniKind',
    label: 'DID ANI Kind',
    controlType: 'select',
    options: [
      { label: 'From Number', value: 0 },
      { label: 'Redirecting Number', value: 1 },
    ],
  },
  // SIP_OPT_02 (0:To Number, 1:Original Called, 2:From Number)
  {
    key: 'didDnisKind',
    label: 'DID DNIS Kind',
    controlType: 'select',
    options: [
      { label: 'To Number', value: 0 },
      { label: 'Original Called', value: 1 },
      { label: 'From Number', value: 2 },
    ],
  },
  // SIP_OPT_03 (0:기본값, 1:Original Caller)
  {
    key: 'dodAniKind',
    label: 'DOD ANI Kind',
    controlType: 'select',
    options: [
      { label: '기본값', value: 0 },
      { label: 'Original Caller', value: 1 },
    ],
  },
  { key: 'videoCall', label: 'Video Call', controlType: 'switch' },
  { key: 'sipsUsage', label: 'SIPS 사용여부', controlType: 'switch' },
  { key: 'sipsTcpReuse', label: 'SIPS TCP 재사용', controlType: 'switch' },
  { key: 'rfc2833Usage', label: 'RFC2833 사용여부', controlType: 'switch' },
  { key: 'noSdpInviteOffer', label: 'NoSDP INVITE Offer', controlType: 'switch' },
  { key: 'externalIpUsage', label: '외부 노출 IP 사용여부', controlType: 'switch' },
];

export interface SipHeaderOptionFieldDef {
  key: keyof SipHeaderOptionDto;
  label: string;
  controlType: SipOptionControlType;
  options?: { label: string; value: number }[];
}

/** AS-IS DB(TB_CC_COMMONCODE) 기준 SIP 헤더 옵션 8개 정의 */
export const SIP_HEADER_OPTION_FIELDS: SipHeaderOptionFieldDef[] = [
  // SIP_H_OPT_01 (0:미사용, 1:Last DN, 2:대표 착신 DNIS, 3:최종 착신 DNIS)
  {
    key: 'diversion',
    label: 'Diversion',
    controlType: 'select',
    options: [
      { label: '미사용', value: 0 },
      { label: 'Last DN', value: 1 },
      { label: '대표 착신 DNIS', value: 2 },
      { label: '최종 착신 DNIS', value: 3 },
    ],
  },
  {
    key: 'historyInfo',
    label: 'History Info',
    controlType: 'select',
    options: [
      { label: '미사용', value: 0 },
      { label: 'Last DN', value: 1 },
      { label: '대표 착신 DNIS', value: 2 },
      { label: '최종 착신 DNIS', value: 3 },
    ],
  },
  {
    key: 'pAssertedIdentity',
    label: 'PAI (P-Asserted-Identity)',
    controlType: 'select',
    options: [
      { label: '미사용', value: 0 },
      { label: 'Last DN', value: 1 },
      { label: '대표 착신 DNIS', value: 2 },
      { label: '최종 착신 DNIS', value: 3 },
    ],
  },
  // SIP_H_OPT_02 (0:미사용, 1:From Number, 2:대표 착신 DNIS, 3:최종 착신 DNIS)
  {
    key: 'pPreferredIdentity',
    label: 'PPI (P-Preferred-Identity)',
    controlType: 'select',
    options: [
      { label: '미사용', value: 0 },
      { label: 'From Number', value: 1 },
      { label: '대표 착신 DNIS', value: 2 },
      { label: '최종 착신 DNIS', value: 3 },
    ],
  },
  {
    key: 'remotePartyId',
    label: 'Remote-Party-ID',
    controlType: 'select',
    options: [
      { label: '미사용', value: 0 },
      { label: 'From Number', value: 1 },
      { label: '대표 착신 DNIS', value: 2 },
      { label: '최종 착신 DNIS', value: 3 },
    ],
  },
  {
    key: 'pCalledPartyId',
    label: 'P-Called-Party-ID',
    controlType: 'select',
    options: [
      { label: '미사용', value: 0 },
      { label: 'From Number', value: 1 },
      { label: '대표 착신 DNIS', value: 2 },
      { label: '최종 착신 DNIS', value: 3 },
    ],
  },
  {
    key: 'pAssociatedUri',
    label: 'P-Associated-URI',
    controlType: 'select',
    options: [
      { label: '미사용', value: 0 },
      { label: 'From Number', value: 1 },
      { label: '대표 착신 DNIS', value: 2 },
      { label: '최종 착신 DNIS', value: 3 },
    ],
  },
  // CC_USED_STATUS (0:미사용, 1:사용)
  { key: 'ipronInfo', label: 'IPRON-Info', controlType: 'switch' },
];

// ─── Backend Response / Request 타입 ─────────────────────────────────────────

export interface SipProfile {
  sipProfileId: number;
  sipProfileName: string;
  sipHeaderGrpId: number | null;
  sipHeaderGrpName: string | null;
  ssRefreshType: number;
  ssRefreshInterval: number;
  sipOption: SipOptionDto;
  sipHeaderOption: SipHeaderOptionDto;
  autoAnswerOption: string | null;
}

export interface SipProfileCreateRequest {
  sipProfileName: string;
  sipHeaderGrpId?: number | null;
  ssRefreshType: number;
  ssRefreshInterval: number;
  sipOption: SipOptionDto;
  sipHeaderOption: SipHeaderOptionDto;
  autoAnswerOption?: string | null;
}

export interface SipProfileUpdateRequest {
  sipProfileName: string;
  sipHeaderGrpId?: number | null;
  ssRefreshType: number;
  ssRefreshInterval: number;
  sipOption: SipOptionDto;
  sipHeaderOption: SipHeaderOptionDto;
  autoAnswerOption?: string | null;
}

// ─── Header Group / Relay 타입 (변경없음) ────────────────────────────────────

export interface SipHeaderGroup {
  sipHeaderGrpId: number;
  sipHeaderGrpName: string;
  memberCount?: number;
}

export interface SipHeaderRelay {
  sipHeaderId: number;
  sipHeader: string;
  headerType: number;
  assigned?: boolean;
}

export interface SipHeaderGroupCreateRequest {
  sipHeaderGrpName: string;
}
export interface SipHeaderGroupUpdateRequest {
  sipHeaderGrpName: string;
}
export interface SipHeaderRelayCreateRequest {
  sipHeader: string;
}
export interface SipHeaderRelayUpdateRequest {
  sipHeader: string;
}
export interface SipHeaderGrpMemUpdateRequest {
  sipHeaderIds: number[];
}

// ─── 세션갱신 타입 옵션 ──────────────────────────────────────────────────────

export const SS_REFRESH_TYPE_OPTIONS = [
  { label: 'NONE', value: 0 },
  { label: 'UPDATE', value: 1 },
  { label: 'OPTION', value: 2 },
  { label: 'REINVITE', value: 3 },
] as const;

export const SS_REFRESH_TYPE_LABELS: Record<number, string> = {
  0: 'NONE',
  1: 'UPDATE',
  2: 'OPTION',
  3: 'REINVITE',
};

// ─── 카드에 표시할 활성 옵션 태그 ────────────────────────────────────────────

export function getActiveSipOptionTags(sipOption: SipOptionDto): string[] {
  const tags: string[] = [];
  if (sipOption.didEarlyMedia) tags.push('EarlyMedia');
  if (sipOption.prackMode) tags.push('PRACK');
  if (sipOption.mentPlayOn) tags.push('MENT');
  if (sipOption.referKind) tags.push('REFER');
  if (sipOption.notifyHold) tags.push('HOLD');
  if (sipOption.videoCall) tags.push('Video');
  if (sipOption.sipsTcpReuse) tags.push('SIPS');
  if (sipOption.noSdpInviteOffer) tags.push('NoSDP');
  return tags.slice(0, 5);
}
