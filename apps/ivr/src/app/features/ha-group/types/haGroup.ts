/**
 * HA 다중화 구성 타입 정의
 * AS-IS: IPR20S8080 (TB_HA_GROUP_MASTER, TB_HA_GROUP_MEMBER — 레거시 테이블 그대로 사용)
 * TO-BE: BT-ADMIN-SERVICE-IVR ivr/hagroup feature
 *
 * TB_HA_GROUP_MEMBER는 서러게이트 ID가 없고 (haGroupId, systemId) 복합키라
 * systemId는 등록 후 변경 불가 — 멤버 수정/삭제는 이 두 값으로 식별.
 */

// ─── 상태값 상수 ────────────────────────────────────────────────────────────

/**
 * HA Role 타입 20/30 분기(백업/서비스)는 라벨(공통코드)과 무관하게 고정된 비즈니스 로직 —
 * roleType=SERVICE일 때만 SVC NIC/IP/Netmask 입력을 활성화한다 (AS-IS onChangedRoleType 동일).
 */
export const HA_ROLE_TYPE_KIND = {
  BACKUP: 20,
  SERVICE: 30,
} as const;
export type HaRoleTypeKind = (typeof HA_ROLE_TYPE_KIND)[keyof typeof HA_ROLE_TYPE_KIND];

/** 라벨은 BE HaRoleType enum(고정값, DB 미조회)과 동일 문자열로 이식. */
export const HA_ROLE_TYPE_KIND_LABELS: Record<number, string> = {
  [HA_ROLE_TYPE_KIND.BACKUP]: '백업장비',
  [HA_ROLE_TYPE_KIND.SERVICE]: '서비스장비',
};

/** HA 그룹 모드 — 그룹 등록 시 기본값은 License sharing mode(20). */
export const HA_GROUP_MODE_KIND = {
  N_PLUS_1_REDUNDANCY: 10,
  LICENSE_SHARING: 20,
} as const;
export type HaGroupModeKind = (typeof HA_GROUP_MODE_KIND)[keyof typeof HA_GROUP_MODE_KIND];

/** 라벨은 BE HaGroupMode enum(고정값, DB 미조회)과 동일 문자열로 이식. */
export const HA_GROUP_MODE_KIND_LABELS: Record<number, string> = {
  [HA_GROUP_MODE_KIND.N_PLUS_1_REDUNDANCY]: 'N+1 Redundancy',
  [HA_GROUP_MODE_KIND.LICENSE_SHARING]: 'License sharing mode',
};

/** HA Role 상태 — TB_HA_GROUP_STATUS 조인 결과(공통코드 HA_ROLE_STATUS). */
export const HA_ROLE_STATUS_KIND = {
  WAITING: 10,
  ACTIVE: 20,
  NORMAL: 30,
} as const;
export type HaRoleStatusKind = (typeof HA_ROLE_STATUS_KIND)[keyof typeof HA_ROLE_STATUS_KIND];

/** 라벨은 BE HaRoleStatus enum(고정값, DB 미조회)과 동일 문자열로 이식. */
export const HA_ROLE_STATUS_KIND_LABELS: Record<number, string> = {
  [HA_ROLE_STATUS_KIND.WAITING]: '서비스 불가 상태',
  [HA_ROLE_STATUS_KIND.ACTIVE]: '백업 상태',
  [HA_ROLE_STATUS_KIND.NORMAL]: '서비스 상태',
};

// ─── Backend Response 타입 ─────────────────────────────────────────────────

export interface HaGroup {
  haGroupId: number;
  haGroupName: string;
  nodeId: number;
  haGroupMode: number;
  activateYn: '1' | '0';
  memberCount: number;
  workUser?: number;
  workTime?: string;
}

export interface HaGroupMember {
  haGroupId: number;
  systemId: number;
  systemName?: string;
  roleIndex: number;
  roleType: number;
  roleAlias: string;
  haIpaddr: string;
  svcNic?: string;
  svcIpaddr?: string;
  svcNetmask?: number;
  workUser?: number;
  workTime?: string;
  /** TB_HA_GROUP_STATUS 조인 결과 — 상태 행 없으면 10(대기), 나머지는 undefined. */
  roleStatus?: number;
  roleChgTime?: string;
  roleChgReason?: string;
  /** 해당 시스템의 Redis 실시간 채널 현황(총/사용중/대기) — 데이터 없으면 undefined. */
  totCnt?: number;
  busyCnt?: number;
  idleCnt?: number;
}

export interface AvailableSystem {
  systemId: number;
  systemName: string;
  ipv4Address?: string;
  ipv6Address?: string;
}

// ─── Request 타입 ──────────────────────────────────────────────────────────

export interface HaGroupCreateRequest {
  nodeId: number;
  haGroupName: string;
  haGroupMode: number;
  activateYn: '1' | '0';
}

export type HaGroupUpdateRequest = Omit<HaGroupCreateRequest, 'nodeId'>;

export interface HaGroupMemberCreateRequest {
  systemId: number;
  roleAlias: string;
  roleType: number;
  haIpaddr: string;
  svcNic?: string;
  svcIpaddr?: string;
  svcNetmask?: number;
}

/** systemId는 식별자라 수정 불가(등록 후 변경 불가 — AS-IS updHaGroupMember의 SET 절에도 없음). */
export type HaGroupMemberUpdateRequest = Omit<HaGroupMemberCreateRequest, 'systemId'>;
