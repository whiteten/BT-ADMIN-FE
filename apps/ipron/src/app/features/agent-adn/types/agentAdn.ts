/**
 * 상담사 로그인번호(ADN) 관리 도메인 타입.
 *
 * AS-IS: SWAT IPR20S3011
 * BE:    BT-ADMIN-SERVICE-IPRON `/api/ipron/agent-adns`
 * 메뉴키: ipron-dn-agent-adn
 *
 * 본 화면은 "상담사↔ADN 매핑"만 다룬다. ADN 번호 자체 CRUD 는 기존 `/ipron/adn` 화면.
 */

export type MappingStatus = 'ASSIGNED' | 'UNASSIGNED';

/** 그리드 한 줄. pbxLoginId 비어 있으면 미할당. */
export interface AgentAdnRowResponse {
  agentId: number;
  tenantId: number;
  tenantName: string | null;
  groupId: number | null;
  groupName: string | null;
  /** SWAT IPR20S3011 그리드 컬럼 "노드명" (#40). TB_CC_NODEMASTER.NODE_ID LEFT JOIN. */
  nodeId: number | null;
  nodeName: string | null;
  agentLoginId: string;
  agentName: string | null;
  agentAlias: string | null;
  activateYn: number | null;
  retireYn: number | null;
  pbxLoginId: string | null;
  mappingStatus: MappingStatus;
  workTime: string | null;
}

/** 테넌트별 카드 stats. */
export interface AgentAdnTenantStat {
  tenantId: number;
  tenantName: string | null;
  totalCnt: number;
  assignedCnt: number;
  unassignedCnt: number;
}

/** 자동채번 정책 (TB_CC_ADN_AUTOCONFIG, configId=1). */
export interface AdnAutoConfigResponse {
  configId: number;
  useYn: number;
  adnPrefix: string | null;
  digitLength: number | null;
  description: string | null;
  workUser: number | null;
  workTime: string | null;
  /** useYn=1 && prefix not empty && digit 2~6. BE 계산값. */
  active: boolean;
}

export interface AdnAutoConfigUpsertRequest {
  useYn: number;
  adnPrefix?: string | null;
  digitLength?: number | null;
  description?: string | null;
}

export interface AutoAssignRequest {
  agentIds: number[];
}

export interface AutoAssignAssignedPair {
  agentId: number;
  adnNo: string;
}

export interface AutoAssignResponse {
  requested: number;
  assigned: number;
  skipped: number;
  newAdnCount: number;
  assignedPairs: AutoAssignAssignedPair[];
  skippedAgentIds: number[];
}

export interface UnassignRequest {
  agentIds: number[];
}

export interface ConflictCheckResponse {
  prefix: string;
  digitLength: number;
  rangeStart: string;
  rangeEnd: string;
  rangeSize: number;
  usedAdns: string[];
  conflictingDns: string[];
}
