/**
 * ACD 그룹DN 도메인 타입
 *
 * AS-IS: SWAT IPR20S3010(마스터) + IPR20S3030(멤버)
 * BE: BT-ADMIN-SERVICE-IPRON `/api/ipron/acd-gdns`
 *
 * 멘트 wizard 제거, 멘트 ID 컬럼은 등록 폼 콤보로만 유지.
 */

// ──────────────────────────────────────────────────────────
//  마스터
// ──────────────────────────────────────────────────────────

export interface GdnResponse {
  gdnId: number;
  gdnNo: string;
  gdnName: string;
  gdnType: number; // 16=ACD
  nodeId: number | null;
  nodeName?: string | null;
  backUpNodeId: number | null;
  backUpNodeName?: string | null;
  globalDnYn: number | null;

  companyId: number | null;
  tenantId: number | null;
  tenantName: string | null;

  // 호분배 / ACD
  acdYn: number | null;
  acdType: number | null;
  routingKind: number | null;
  skillsetId: number | null;
  skillsetName: string | null;
  maxWaitcnt: number | null;
  maxWaittime: number | null;

  // 헌팅
  huntingYn: number | null;
  huntingType: number | null;
  huntWaitTime: number | null;

  // 멘트 8단계
  initMent: number | null;
  waitMent: number | null;
  closeMent: number | null;
  connMent: number | null;
  holdMent: number | null;
  coConnMent: number | null;
  coHoldMent: number | null;
  blockMent: number | null;

  // 블록/종료/라우팅
  blockYn: number | null;
  closeType: number | null;
  blockRoutingDnis: string | null;
  errorRoutingDnis: string | null;
  busyRoutingDnis: string | null;

  // 기타
  aniNo: string | null;
  channelLimitCount: number | null;
  accessCodeProfileId: number | null;
  drAccessCodeProfileId: number | null;

  // 보강
  memberCount: number | null;

  // 감사
  createDate?: string | null;
  workUser?: number | null;
  workTime?: string | null;
}

export interface GdnCreateRequest {
  tenantId: number;
  nodeId: number;
  gdnNo: string;
  gdnName: string;

  backUpNodeId?: number | null;
  globalDnYn?: number | null;

  acdYn: number;
  acdType: number;
  routingKind: number;
  skillsetId?: number | null;
  maxWaitcnt?: number | null;
  maxWaittime?: number | null;

  huntingYn?: number | null;
  huntingType?: number | null;
  huntWaitTime?: number | null;

  initMent?: number | null;
  waitMent?: number | null;
  closeMent?: number | null;
  connMent?: number | null;
  holdMent?: number | null;
  coConnMent?: number | null;
  coHoldMent?: number | null;
  blockMent?: number | null;

  blockYn?: number | null;
  closeType?: number | null;
  blockRoutingDnis?: string;
  errorRoutingDnis?: string;
  busyRoutingDnis?: string;

  aniNo?: string;
  channelLimitCount?: number | null;
  accessCodeProfileId?: number | null;
  drAccessCodeProfileId?: number | null;
}

export type GdnUpdateRequest = Omit<GdnCreateRequest, 'tenantId' | 'nodeId' | 'gdnNo'>;

export interface GdnDeleteRequest {
  gdnIds: number[];
}

export interface GdnTenantStat {
  tenantId: number;
  tenantName: string | null;
  totalCnt: number;
  acdActiveCnt: number;
  blockedCnt: number;
  huntingCnt: number;
}

// ──────────────────────────────────────────────────────────
//  멤버
// ──────────────────────────────────────────────────────────

export interface GdnMemberResponse {
  gdnId: number;
  dnId: number | null;
  dnNo: string | null;
  nodeId: number | null;
  nodeName: string | null;
  memberPriority: number | null;
  channelLimitCount: number | null;
  workUser?: number | null;
  workTime?: string | null;

  // v2 멤버 패널 추가 컬럼 (BE GdnMemberResponse — members-pool)
  dnType?: string | null; // 11=EDN, 12=ADN
  loginAdn?: string | null; // ADN 로그인 ID
  extBlockYn?: number | null; // 블록여부 (1=ON)
  backUpNodeId?: number | null; // DR 노드 ID
  backUpNodeName?: string | null; // DR 노드 이름
  tenantId?: number | null;
  tenantName?: string | null;
  assigned?: boolean | null; // 해당 그룹DN 기배정 여부 (members-pool)
}

/** 멤버 통합 풀 조회 파라미터 (v2 우측 패널) */
export interface GdnMemberPoolParams {
  /** all(기본) / assigned(기배정) / unassigned(미배정) */
  assignFilter?: 'all' | 'assigned' | 'unassigned';
  /** DN번호 / ADN 검색어 */
  keyword?: string;
}

// ──────────────────────────────────────────────────────────
//  DN 타입 Enum / Lookup (멤버 EDN/ADN)
// ──────────────────────────────────────────────────────────

export const DN_TYPE_EDN = '11';
export const DN_TYPE_ADN = '12';

export function getDnTypeName(v: string | null | undefined): string {
  if (v === DN_TYPE_ADN) return '상담원(ADN)';
  if (v === DN_TYPE_EDN) return '내선(EDN)';
  return '-';
}

export interface GdnMemberItem {
  dnId: number;
  memberPriority?: number | null;
  channelLimitCount?: number | null;
}

export interface GdnMemberSaveRequest {
  inserts?: GdnMemberItem[];
  updates?: GdnMemberItem[];
  deletes?: GdnMemberItem[];
}

// ──────────────────────────────────────────────────────────
//  Enum / Lookup
// ──────────────────────────────────────────────────────────

/**
 * BE enum 동기화: BT-ADMIN-SERVICE-IPRON
 *   com.bridgetec.btadmin.ipron.acdgdn.domain.enums.AcdType
 *   코드값 변경 시 BE enum 과 함께 수정할 것.
 */
export const ACD_TYPE_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '로그인 상담사' },
  { value: 2, label: '전화 등록' },
  { value: 3, label: '로그인 상담사 DN (스킬)' },
];

/**
 * BE enum 동기화: BT-ADMIN-SERVICE-IPRON
 *   com.bridgetec.btadmin.ipron.acdgdn.domain.enums.RoutingKind
 *   코드값 변경 시 BE enum 과 함께 수정할 것.
 */
export const ROUTING_KIND_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '1. 우선순위' },
  { value: 2, label: '2. 순차' },
  { value: 3, label: '3. 랜덤' },
  { value: 4, label: '4. 직접 (대기/종료멘트·헌팅 비활성)' },
];

/**
 * BE enum 동기화: BT-ADMIN-SERVICE-IPRON
 *   com.bridgetec.btadmin.ipron.acdgdn.domain.enums.HuntingType
 *   코드값 변경 시 BE enum 과 함께 수정할 것.
 */
export const HUNTING_TYPE_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '1. 순차 헌팅' },
  { value: 2, label: '2. 동시 헌팅' },
  { value: 3, label: '3. 우선순위 헌팅' },
];

export const YN_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: '사용안함' },
  { value: 1, label: '사용' },
];

/**
 * TB_CC_COMMONCODE CLASS_CD='CALL_CLOSE_TYPE' 실측 코드 (2026-06-07).
 *
 * BE enum 동기화: BT-ADMIN-SERVICE-IPRON
 *   com.bridgetec.btadmin.ipron.acdgdn.domain.enums.CallCloseType
 *   코드값 변경 시 BE enum 과 함께 수정할 것.
 */
export const CALL_CLOSE_TYPE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: '정상 종료' },
  { value: 1, label: '멘트 후 종료' },
  { value: 2, label: '우회 DN/GDN 라우팅' },
  { value: 3, label: '멘트 후 우회 DN/GDN 라우팅' },
];

export function getCloseTypeName(v: number | null | undefined): string {
  if (v == null) return '-';
  return CALL_CLOSE_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? String(v);
}

export function getYnName(v: number | null | undefined): string {
  if (v == null) return '-';
  return v === 1 ? '사용' : '사용안함';
}

export function getAcdTypeName(v: number | null | undefined): string {
  if (v == null) return '-';
  return ACD_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? String(v);
}

export function getRoutingKindName(v: number | null | undefined): string {
  if (v == null) return '-';
  return (
    ROUTING_KIND_OPTIONS.find((o) => o.value === v)
      ?.label.replace(/^\d+\.\s*/, '')
      .replace(/\s\(.*\)$/, '') ?? String(v)
  );
}

// ──────────────────────────────────────────────────────────
//  콤보 옵션 (BE: GdnOptionItem) — 멘트/스킬셋 공용
// ──────────────────────────────────────────────────────────

export interface GdnOptionItem {
  id: number;
  name: string;
}
