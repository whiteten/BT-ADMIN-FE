/**
 * 교환기 번호자원 현황 (dn-status) — BE DTO 미러 TS 타입 + 화면 상수.
 *
 * BE record(`com.bridgetec.btadmin.ipron.dnstatus.dto.*`) 필드명 1:1 (camelCase JSON 직렬화).
 * 결정 정본: IMPL-DECISIONS.md / 계약: IMPL-BE.md / 설계: PLAN-FE.md §5.2.
 */

// ─── ① nodes (DnStatusOverviewResponse) ──────────────────────────────────

/** 타입별 건수/할당 (DnStatusNodeResponse.TypeCount) */
export interface TypeCount {
  typeCode: string;
  typeKey: string;
  typeLabel: string;
  total: number;
  assigned: number;
}

/** 노드 무관 공통 자원 (CommonResourceStat) — ADN(12)은 NODE_ID=0 전용이라 여기로 분리 */
export interface CommonResourceStat {
  adnTotal: number;
  adnAssigned: number;
  globalDnTotal: number;
  extraTypes: TypeCount[];
}

/** PBX 노드 1개 집계 (DnStatusNodeResponse). ADN 행은 dnTypes 에 없음(common 분리) */
export interface DnStatusNode {
  nodeId: number;
  nodeName: string;
  clusterGrpId: number | null;
  clusterGrpName: string | null;
  /** 11(내선)/13(SIP트렁크 채널) — 0건이어도 포함. 14(GDN 예약)는 1건↑일 때만. ADN(12) 제외 */
  dnTypes: TypeCount[];
  scaCount: number;
  globalDnTotal: number;
  globalDnAssigned: number;
  /** GDN_MASTER GlobalDN — GlobalDN 플래그 행에서 DN 측과 합산 표시용 */
  gdnGlobalDnTotal: number;
}

/** GET /nodes 응답 (DnStatusOverviewResponse) */
export interface DnStatusOverview {
  common: CommonResourceStat;
  nodes: DnStatusNode[];
}

// ─── ② dr (DrLinkResponse) ────────────────────────────────────────────────

/** DR 방향성 링크 1건 (from → to = 백업 노드). GDN = gdnReservedCount + gdnMasterCount 합산 */
export interface DrLink {
  fromNodeId: number;
  fromNodeName: string;
  toNodeId: number;
  toNodeName: string;
  ednCount: number;
  adnCount: number;
  tdnCount: number;
  scaCount: number;
  gdnReservedCount: number;
  gdnMasterCount: number;
  totalCount: number;
}

/** ②-상세 dr/dns (DrDnResponse) — DR 백업 DN 목록 */
export interface DrDn {
  dnNo: string;
  source: 'DN' | 'GDN';
  typeCode: string;
  typeLabel: string;
  fromNodeId: number;
  fromNodeName: string;
  toNodeId: number;
  toNodeName: string;
  globalDn: boolean;
  tenantId: number | null;
}

// ─── ④ gdns (GdnTypeStatResponse) ─────────────────────────────────────────

/** 노드×GDN타입 집계 — 건수만(할당률 미제공, IMPL-BE §④) */
export interface GdnTypeStat {
  nodeId: number;
  gdnType: number;
  typeLabel: string;
  total: number;
  globalDnCount: number;
  backupCount: number;
}

// ─── ③ bands (DnBandStatusResponse) ───────────────────────────────────────

/** 선언 대역 내부 연속 구간 (BandSegment) */
export interface BandSegment {
  segType: 'edn' | 'adn' | 'tdn' | 'gdn' | 'other' | 'free';
  startNo: string;
  endNo: string;
  count: number;
}

/** 선언 대역 1개 + 사용/유휴 집계 (BandUsage) */
export interface BandUsage {
  bandId: number;
  startNo: string;
  endNo: string;
  memo: string | null;
  capacity: number;
  usedTotal: number;
  freeCount: number;
  ednCount: number;
  adnCount: number;
  tdnCount: number;
  gdnCount: number;
  otherCount: number;
  segments: BandSegment[];
}

/** GET /bands?nodeId= 응답 (DnBandStatusResponse) */
export interface DnBandStatus {
  nodeId: number;
  bands: BandUsage[];
  /** 어떤 선언 대역에도 안 속한 점유 번호 수 (선언 누락 감지용 — 노출은 선택) */
  unbandedUsedCount: number;
}

/** ③-등록 POST /bands 요청 (DnBandCreateRequest) */
export interface DnBandCreateRequest {
  nodeId: number;
  startNo: string;
  endNo: string;
  memo?: string;
}

/** ③-등록 응답 (DnBandResponse) */
export interface DnBandResponse {
  bandId: number;
  nodeId: number;
  startNo: string;
  endNo: string;
  memo: string | null;
}

// ─── 화면 상수 (목업 값 계승 — 약어 금지 풀네임) ─────────────────────────

/**
 * 노드 카드 자원행 타입키. 목업의 TYPE_ROWS 계승하되 ADN(agt) 제외(common 분리),
 * GDN 3종(acd/ctiq/sip)은 ④ gdns 에서 노드별 매칭.
 */
export type DnTypeKey = 'edn' | 'tdn' | 'gdn-acd' | 'gdn-ctiq' | 'gdn-sip' | 'gflag';

/** 사이드바 탭 */
export type SidebarTab = 'overview' | 'dr' | 'dnlist' | 'bandmap';

/** 타입키 → 라벨 (풀네임, 약어 금지) */
export const TYPE_LABELS: Record<DnTypeKey, string> = {
  edn: '내선',
  tdn: 'SIP트렁크 채널',
  'gdn-acd': 'ACD',
  'gdn-ctiq': 'CTI큐',
  'gdn-sip': 'SIP트렁크',
  gflag: 'GlobalDN 플래그',
};

/** 타입키 → 색상 (목업 TYPE_COLORS 계승) */
export const TYPE_COLORS: Record<DnTypeKey, string> = {
  edn: '#405189',
  tdn: '#d97706',
  'gdn-acd': '#0891b2',
  'gdn-ctiq': '#0e7490',
  'gdn-sip': '#155e75',
  gflag: '#7c3aed',
};

/** GDN gdnType 코드(16/17/18) → 자원행 타입키 */
export const GDN_TYPE_TO_KEY: Record<number, DnTypeKey> = {
  16: 'gdn-acd',
  17: 'gdn-ctiq',
  18: 'gdn-sip',
};

/**
 * DN 목록 드릴다운 — 자원행 타입키 → 기존 /api/ipron/dns(DnController) 필터.
 * DN_MASTER 소스만 조회 가능(11/13/15). GDN 3종(16/17/18)·gflag 는 DN_MASTER 에 없어 null.
 *  - dnTypes: 콤마구분 DN 타입코드 (DnFilterQuery.dnTypes)
 *  - gdn: GDN_MASTER 소스라 /dns 로 조회 불가 → 드릴다운 미지원(건수만)
 */
export const DRILLDOWN_DN_TYPES: Record<DnTypeKey, string | null> = {
  edn: '11',
  tdn: '13',
  'gdn-acd': null,
  'gdn-ctiq': null,
  'gdn-sip': null,
  gflag: null,
};
