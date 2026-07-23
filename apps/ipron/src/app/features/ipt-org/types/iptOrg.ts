/**
 * IPT 조직도관리 타입 (TB_IE_DN_GROUPMASTER — AS-IS IPR20S2056).
 */

/** 조직 트리 노드 — userCount 는 하위 합산(rollup) */
export interface IptOrgTreeNode {
  dnGroupId: number;
  tenantId: number;
  tenantName: string | null;
  priorGrpId: number | null;
  grpDepth: number;
  dnGrpName: string;
  activateYn: number; // 0/1
  sortSeq: number | null;
  userCount: number;
  children: IptOrgTreeNode[];
  /** 운영자 전체 모드에서 FE 가 합성한 테넌트 그룹 노드 (agent-master 패턴, 음수 id) */
  _scopeKind?: 'tenant';
}

/** 조직 상세/목록 응답 */
export interface IptOrgResponse {
  dnGroupId: number;
  tenantId: number;
  tenantName: string | null;
  priorGrpId: number | null;
  priorGrpName: string | null;
  grpDepth: number;
  grpHierarchy: string | null;
  dnGrpName: string;
  orgPath: string;
  activateYn: number; // 0/1
  grpAniYn: number; // 0/1
  grpAniNo: string | null;
  rbMentId: number | null;
  rbMentName: string | null;
  mohMentId: number | null;
  mohMentName: string | null;
  coRbMentId: number | null;
  coRbMentName: string | null;
  coMohMentId: number | null;
  coMohMentName: string | null;
  sortSeq: number | null;
  userCount: number;
  childCount: number;
  workTime: string | null;
}

/** 조직 등록 요청 — 계층/정렬은 서버 채번 */
export interface IptOrgCreateRequest {
  tenantId: number;
  priorGrpId: number | null;
  dnGrpName: string;
  activateYn?: number;
  grpAniYn?: number;
  grpAniNo?: string | null;
  rbMentId?: number | null;
  mohMentId?: number | null;
  coRbMentId?: number | null;
  coMohMentId?: number | null;
}

/** 조직 수정 요청 — 부모 이동 미지원(레거시 정합) */
export type IptOrgUpdateRequest = Omit<IptOrgCreateRequest, 'tenantId' | 'priorGrpId'>;

/** 정렬순서 일괄 변경 요청 */
export interface IptOrgSortSeqUpdateRequest {
  tenantId: number;
  items: { dnGroupId: number; sortSeq: number }[];
}

/** 멘트 콤보 옵션 (ipron-acd-gdn-ment-options 공용 flow) */
export interface MentOption {
  id: number;
  name: string;
}

/** 테넌트별 조직 통계 — 운영자 대행 선택기 (활성 테넌트 전체, 조직 없는 테넌트 0 카운트 포함) */
export interface IptOrgTenantStat {
  tenantId: number;
  tenantName: string | null;
  orgCnt: number;
  userCnt: number;
}
