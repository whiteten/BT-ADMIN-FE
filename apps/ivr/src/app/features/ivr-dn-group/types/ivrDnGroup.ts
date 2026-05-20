/**
 * IVR DN 그룹 타입 정의
 * AS-IS: IPR20S6012 (TB_IR_DN_GROUP, TB_IR_SUB_DN_GROUP)
 * TO-BE: BT-ADMIN-SERVICE-FC ivrdngroup feature
 */

// ─── Enum 코드 ──────────────────────────────────────────────────────────────

export type IrDnDirection = '10' | '20' | '30'; // Outbound | Inbound | Both
export type IrDnRegKind = '10' | '20' | '30'; //   개별 | 공통 | 그룹
export type IrProtocolType = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
//                            sip | nocc| ops0| gds0| mfc0| isd0| web | chat
export type OutchUseType = '1' | '2' | '3' | '4' | '5';
//                          일반음성| 영상 | 데이터| 2채널| 자동아웃바운드(ACS)
export type IrSubDnKind = '1'; //                  일반

// ─── Enum 라벨/옵션 ────────────────────────────────────────────────────────

export const DIRECTION_OPTIONS = [
  { label: 'Outbound', value: '10' },
  { label: 'Inbound', value: '20' },
  { label: 'Both', value: '30' },
] as const;
export const DIRECTION_LABELS: Record<IrDnDirection, string> = {
  '10': 'Outbound',
  '20': 'Inbound',
  '30': 'Both',
};

export const REG_KIND_OPTIONS = [
  { label: 'Not Regist', value: '10' },
  { label: 'Regist', value: '20' },
  { label: 'Group Regist', value: '30' },
] as const;
export const REG_KIND_LABELS: Record<IrDnRegKind, string> = {
  '10': 'Not Regist',
  '20': 'Regist',
  '30': 'Group Regist',
};

export const PROTOCOL_OPTIONS = [
  { label: 'sip', value: '1' },
  { label: 'nocc', value: '2' },
  { label: 'ops0', value: '3' },
  { label: 'gds0', value: '4' },
  { label: 'mfc0', value: '5' },
  { label: 'isd0', value: '6' },
  { label: 'web', value: '7' },
  { label: 'chat', value: '8' },
] as const;
export const PROTOCOL_LABELS: Record<IrProtocolType, string> = {
  '1': 'sip',
  '2': 'nocc',
  '3': 'ops0',
  '4': 'gds0',
  '5': 'mfc0',
  '6': 'isd0',
  '7': 'web',
  '8': 'chat',
};

export const OUTCH_OPTIONS = [
  { label: '상담원 연결', value: '1' },
  { label: '데몬', value: '2' },
  { label: '영업점', value: '3' },
  { label: '2채널', value: '4' },
  { label: '자동 아웃바운드(ACS)', value: '5' },
] as const;
export const OUTCH_LABELS: Record<OutchUseType, string> = {
  '1': '상담원 연결',
  '2': '데몬',
  '3': '영업점',
  '4': '2채널',
  '5': '자동 아웃바운드(ACS)',
};

export const SUB_DN_KIND_OPTIONS = [{ label: '일반', value: '1' }] as const;
export const SUB_DN_KIND_LABELS: Record<IrSubDnKind, string> = {
  '1': '일반',
};

// ─── Backend Response 타입 ─────────────────────────────────────────────────

export interface IrDnGroup {
  dnGroupId: number;
  endptId: number;
  endptName: string;
  systemId: number;
  systemName: string;
  nodeId: number;
  nodeName: string;
  dnGroupName: string;
  protocol: IrProtocolType;
  direction: IrDnDirection;
  dnisNo?: string;
  groupDn?: string;
  startDn: string;
  dnCount: number;
  startChannel: number;
  channelCount: number;
  chidx?: number;
  regKind: IrDnRegKind;
  outchUsetype?: OutchUseType;
  inCount?: number;
  workUser?: number;
  workTime?: string;
}

export interface IrSubDnGroup {
  subDnGroupId: number;
  dnGroupId: number;
  systemId: number;
  subDnGroupName: string;
  chnlCnt: number;
  subDnGroupKind: IrSubDnKind;
  subDnGroupDesc?: string;
  workTime?: string;
}

export interface IrSubDnQuota {
  dnGroupId: number;
  dnGroupChannelCount: number;
  usedChannelCount: number;
  availableChannelCount: number;
}

export interface IrSystemUsage {
  systemId: number;
  systemName: string;
  nodeId: number;
  usedDnCount: number;
  maxDnCount: number;
  availableDnCount: number;
}

// ─── Request 타입 ──────────────────────────────────────────────────────────

export interface IrDnGroupCreateRequest {
  endptId: number;
  systemId: number;
  dnGroupName: string;
  protocol: IrProtocolType;
  direction: IrDnDirection;
  dnisNo?: string;
  groupDn?: string;
  startDn: string;
  dnCount: number;
  startChannel: number;
  channelCount: number;
  regKind: IrDnRegKind;
  outchUsetype?: OutchUseType;
  inCount?: number;
}

export type IrDnGroupUpdateRequest = Partial<IrDnGroupCreateRequest>;

export interface IrSubDnGroupCreateRequest {
  subDnGroupName: string;
  chnlCnt: number;
  subDnGroupKind: IrSubDnKind;
  subDnGroupDesc?: string;
}

export type IrSubDnGroupUpdateRequest = IrSubDnGroupCreateRequest;

// ─── 카드 표시 유틸 ────────────────────────────────────────────────────────

export interface IvrDnGroupTag {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/**
 * Direction별 배지 색상. Outbound=청록, Inbound=파랑, Both=보라.
 */
export function getDirectionTag(direction: IrDnDirection): IvrDnGroupTag {
  switch (direction) {
    case '10':
      return { label: 'Outbound', color: '#08979c', bgColor: '#e6fffb', borderColor: '#87e8de' };
    case '20':
      return { label: 'Inbound', color: '#1677ff', bgColor: '#e6f4ff', borderColor: '#91caff' };
    case '30':
    default:
      return { label: 'Both', color: '#722ed1', bgColor: '#f9f0ff', borderColor: '#d3adf7' };
  }
}

/**
 * 카드 하단 태그 목록 — Direction + REG 처리.
 * <p>ACS({@code outchUsetype='5'})는 카드 헤더(시스템 칩 옆)에 별도 배지로 표시하므로 여기서 제외.
 * 영문화된 라벨이 길어져 3개 태그가 한 줄에 안 들어가는 wrap 문제 회피.</p>
 */
export function getDnGroupTagList(g: IrDnGroup): IvrDnGroupTag[] {
  const tags: IvrDnGroupTag[] = [];
  tags.push(getDirectionTag(g.direction));
  tags.push({
    label: REG_KIND_LABELS[g.regKind] ?? '-',
    color: '#595959',
    bgColor: '#f5f5f5',
    borderColor: '#d9d9d9',
  });
  return tags;
}

/**
 * Sub DN 등록 가능 여부 — Direction=Outbound(10) AND outchUsetype=ACS(5)일 때만 가능.
 * AS-IS IPR20S6012.jsp 의 분기 로직 그대로.
 */
export function isSubDnEligible(g: IrDnGroup | null | undefined): boolean {
  return !!g && g.direction === '10' && g.outchUsetype === '5';
}
