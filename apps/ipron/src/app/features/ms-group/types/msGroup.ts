/**
 * MS 관리 타입 정의
 * SD-MS-MANAGEMENT.md 설계서 기반
 *
 * AS-IS: IPR20S1092 (TB_IE_MS_GROUP, TB_IE_MEDIA_SERVER, TB_IE_MS_GRP_LIST)
 * TO-BE: BT-ADMIN-SERVICE-IPRON mediaserver feature
 */

// ─── Enum 라벨 매핑 ─────────────────────────────────────────────────────────

/**
 * 분배방식 (ROUTE_TYPE) - DB 기준, Main/Backup(3) 제외
 * 0: 순차, 1: 순환, 2: 균등
 */
export const ROUTE_TYPE_OPTIONS = [
  { label: '순차', value: '0' },
  { label: '순환', value: '1' },
  { label: '균등', value: '2' },
] as const;

export const ROUTE_TYPE_LABELS: Record<string, string> = {
  '0': '순차',
  '1': '순환',
  '2': '균등',
};

/** IP 버전 */
export const IP_VERSION_OPTIONS = [
  { label: 'IPv4', value: '4' },
  { label: 'IPv6', value: '6' },
] as const;

/** 블록 여부 */
export const BLOCK_YN_OPTIONS = [
  { label: 'OFF', value: '0' },
  { label: 'ON', value: '1' },
] as const;

export const BLOCK_YN_LABELS: Record<string, string> = {
  '0': 'OFF',
  '1': 'ON',
};

/** 미디어서버 상태 (Redis 기반 - 1차 구현에서는 '-' 표시) */
export const MS_STATUS_LABELS: Record<string, string> = {
  '0': 'Critical',
  '1': 'Normal',
  '2': 'Ready',
};

// ─── Backend Response 타입 ──────────────────────────────────────────────────

/**
 * MS그룹 목록/상세 응답
 */
export interface MsGroup {
  msGroupId: number;
  nodeId: number;
  nodeName: string; // BE에서 직접 제공 (카드 폴백 방지)
  msGroupName: string;
  routeType: string;
  routeCnt: number; // 할당 MS 수 (집계)
  workUser: number | null;
  workTime: string | null; // LocalDateTime
}

/**
 * 미디어서버 목록/상세 응답
 */
export interface MediaServer {
  mediaServerId: number;
  nodeId: number;
  mediaServerName: string;
  ipVersion: string | null;
  ipAddr: string;
  portNo: number;
  natIpAddr: string | null;
  state: string | null;
  totalChannel: number;
  blockYn: string | null;
  stateUpdateTime: string | null;
  extOptions: string | null;
  externalIpAddr: string | null;
  workUser: number | null;
  workTime: string | null; // LocalDateTime
  redisState: string | null; // Redis 실시간 상태 (1차: null)
}

/**
 * MS그룹 멤버 응답 (체크여부 + 우선순위 포함)
 */
export interface MsGroupMember {
  mediaServerId: number;
  mediaServerName: string;
  ipAddr: string | null;
  portNo: number | null;
  assigned: boolean; // 해당 그룹에 할당 여부
  priority: number; // 우선순위 (0~999, 미할당 시 0)
}

// ─── Request 타입 ───────────────────────────────────────────────────────────

export interface MsGroupCreateRequest {
  msGroupName: string;
  nodeId: number;
  routeType: string;
}

export type MsGroupUpdateRequest = MsGroupCreateRequest;

export interface MediaServerCreateRequest {
  mediaServerName: string;
  nodeId: number;
  ipAddr: string;
  portNo: number;
  totalChannel: number;
  ipVersion?: string | null;
  natIpAddr?: string | null;
  blockYn?: string | null;
  extOptions?: string | null;
  externalIpAddr?: string | null;
}

export type MediaServerUpdateRequest = MediaServerCreateRequest;

export interface MsGrpMemberItem {
  mediaServerId: number;
  priority: number;
}

export interface MsGrpMemberRequest {
  members: MsGrpMemberItem[];
}

// ─── 노드 기본 MS 설정 ───────────────────────────────────────────────────────

export interface NodeMsSettingResponse {
  nodeId: number;
  nodeName: string;
  msGroupId: number | null;
  natOption: number | null;
}

export interface NodeMsSettingRequest {
  msGroupId: number | null;
  natOption: number | null;
}

export const NAT_OPTION_OPTIONS = [
  { label: '사용안함', value: 0 },
  { label: '전송모드', value: 1 },
  { label: '수신모드', value: 2 },
  { label: '모두사용', value: 3 },
] as const;

// ─── 노드별 그룹 ────────────────────────────────────────────────────────────

export interface NodeMsGroupGroup {
  nodeId: number;
  nodeName: string;
  msGroups: MsGroup[];
}

// ─── 카드 표시 유틸 ─────────────────────────────────────────────────────────

export interface MsGroupTag {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export function getMsGroupTagList(group: MsGroup): MsGroupTag[] {
  const tags: MsGroupTag[] = [];
  const routeLabel = ROUTE_TYPE_LABELS[group.routeType] ?? group.routeType;
  tags.push({
    label: routeLabel,
    color: '#1677ff',
    bgColor: '#e6f4ff',
    borderColor: '#91caff',
  });
  return tags;
}

/** MS그룹 초기값 */
export const MS_GROUP_INITIAL_VALUES: Partial<MsGroupCreateRequest> = {
  msGroupName: '',
  routeType: '2', // 균등
};

/** 미디어서버 초기값 */
export const MEDIA_SERVER_INITIAL_VALUES: Partial<MediaServerCreateRequest> = {
  mediaServerName: '',
  ipVersion: '4',
  ipAddr: '',
  portNo: 9500,
  totalChannel: 100,
  natIpAddr: '',
  blockYn: '0',
  extOptions: '',
  externalIpAddr: '',
};
