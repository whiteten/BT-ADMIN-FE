/**
 * IVR EndPoint 타입 정의
 * AS-IS: IPR20S6011 (TB_IR_ENDPT_MASTER, TB_IR_ENDPT_MEMBER)
 * TO-BE: BT-ADMIN-SERVICE-FC ivrendpoint feature
 */

// ─── Enum 라벨 매핑 ─────────────────────────────────────────────────────────

export const ENDPT_TYPE_OPTIONS = [
  { label: 'IPRON IE', value: '10' },
  { label: 'AVAYA SM', value: '20' },
  { label: 'CISCO CM', value: '30' },
  { label: 'NORTEL', value: '40' },
  { label: 'ETC', value: '50' },
  { label: 'Chat', value: '90' },
] as const;
export const ENDPT_TYPE_LABELS: Record<string, string> = {
  '10': 'IPRON IE',
  '20': 'AVAYA SM',
  '30': 'CISCO CM',
  '40': 'NORTEL',
  '50': 'ETC',
  '90': 'Chat',
};

export const LINE_TYPE_OPTIONS = [
  { label: 'Trunk 방식', value: '10' },
  { label: '내선 방식', value: '20' },
] as const;
export const LINE_TYPE_LABELS: Record<string, string> = { '10': 'Trunk 방식', '20': '내선 방식' };

export const CONN_TYPE_OPTIONS = [
  { label: 'UDP 방식', value: '10' },
  { label: 'TCP 방식', value: '20' },
  { label: 'TLS 방식', value: '30' },
] as const;
export const CONN_TYPE_LABELS: Record<string, string> = { '10': 'UDP 방식', '20': 'TCP 방식', '30': 'TLS 방식' };

export const ALLOC_METHOD_OPTIONS = [
  { label: '우선순위 방식', value: '10' },
  { label: '순차 방식', value: '20' },
  { label: '균등 방식', value: '30' },
] as const;
export const ALLOC_METHOD_LABELS: Record<string, string> = { '10': '우선순위 방식', '20': '순차 방식', '30': '균등 방식' };

export const REG_TYPE_OPTIONS = [
  { label: '공통', value: '10' },
  { label: '개별', value: '20' },
] as const;
export const REG_TYPE_LABELS: Record<string, string> = { '10': '공통', '20': '개별' };

export const REG_METHOD_OPTIONS = [
  { label: '전체유지', value: '10' },
  { label: '앞쪽삭제', value: '20' },
  { label: '뒤쪽삭제', value: '30' },
  { label: '전체삭제', value: '40' },
] as const;
export const REG_METHOD_LABELS: Record<string, string> = { '10': '전체유지', '20': '앞쪽삭제', '30': '뒤쪽삭제', '40': '전체삭제' };

export const BLOCK_STATE_LABELS: Record<number, string> = { 0: '해제', 1: '설정' };

// ─── Backend Response 타입 ──────────────────────────────────────────────────

export interface IvrEndpointMaster {
  endptId: number;
  endptName: string;
  nodeId: number;
  nodeName?: string;
  endptType: string;
  lineType: string | null;
  connType: string | null;
  regInterval: number | null;
  aliveChk: number | null;
  blockState: number | null;
  allocMethod: string | null;
  workUser?: number;
  workTime?: string;
}

export interface IvrEndpointMember {
  endptMembId: number;
  endptId: number;
  endptMembName: string;
  endptIp: string;
  endptPort: number;
  domainName: string | null;
  blockState: number;
  priority: number;
  regType: string;
  regIdAddpfx: string | null;
  regIdLen: number | null;
  regIdMethod: string | null;
  regPwLen: number | null;
  regPwMethod: string | null;
  workUser?: number;
  workTime?: string;
}

// ─── Request 타입 ───────────────────────────────────────────────────────────

export interface IvrEndpointMasterCreateRequest {
  nodeId: number;
  endptName: string;
  endptType: string;
  lineType: string;
  connType: string;
  blockState: number;
  regInterval: number;
  aliveChk: number;
  allocMethod: string;
}

export type IvrEndpointMasterUpdateRequest = Omit<IvrEndpointMasterCreateRequest, 'nodeId'>;

export interface IvrEndpointMemberCreateRequest {
  endptMembName: string;
  endptIp: string;
  endptPort: number;
  domainName?: string | null;
  blockState: number;
  priority: number;
  regType: string;
  regIdAddpfx?: string | null;
  regIdLen?: number | null;
  regIdMethod?: string | null;
  regPwAddpfx?: string | null;
  regPwLen?: number | null;
  regPwMethod?: string | null;
}

export type IvrEndpointMemberUpdateRequest = IvrEndpointMemberCreateRequest;

// ─── 카드 표시 유틸 ─────────────────────────────────────────────────────────

export interface IvrEndpointTag {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/**
 * 블럭 상태일 때만 배지 정보 반환. 그 외는 null (배지 표시 X).
 * IPRON과 달리 IVR EndPoint는 실시간 상태(epStatus) 컬럼이 없어 블럭여부만 표시.
 */
export function getMasterStatusInfo(m: IvrEndpointMaster): { label: string; color: string; bgColor: string } | null {
  if (m.blockState === 1) return { label: '블럭', color: '#ff4d4f', bgColor: '#fff2f0' };
  return null;
}

export function getMasterTagList(m: IvrEndpointMaster): IvrEndpointTag[] {
  const tags: IvrEndpointTag[] = [];
  // Type 태그 (벤더별 색상은 동일 톤)
  tags.push(
    m.endptType === '90'
      ? { label: 'Chat', color: '#722ed1', bgColor: '#f9f0ff', borderColor: '#d3adf7' }
      : { label: ENDPT_TYPE_LABELS[m.endptType] ?? '-', color: '#1677ff', bgColor: '#e6f4ff', borderColor: '#91caff' },
  );
  // 블럭 태그 — 항상 표시 (IPRON 국선관리 패턴: 블럭설정=빨강 / 블럭해제=초록)
  tags.push(
    m.blockState === 1
      ? { label: '블럭설정', color: '#ff4d4f', bgColor: '#fff2f0', borderColor: '#ffccc7' }
      : { label: '블럭해제', color: '#52c41a', bgColor: '#f6ffed', borderColor: '#b7eb8f' },
  );
  return tags;
}
