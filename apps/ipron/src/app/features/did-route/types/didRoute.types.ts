/**
 * DID라우트 관리 타입 정의
 *
 * AS-IS: IPR20S1050 (TB_IE_DIDROUTE)
 * TO-BE: BT-ADMIN-SERVICE-IPRON did-route feature
 */

// ─── Enum 라벨 매핑 ─────────────────────────────────────────────────────────

/** 블록 제어 */
export const BLOCK_CONTROL_OPTIONS = [
  { label: '정상종료', value: 0 },
  { label: '멘트 후 종료', value: 1 },
  { label: '우회 라우팅', value: 2 },
  { label: '멘트 후 우회 라우팅', value: 3 },
] as const;

export const BLOCK_CONTROL_LABELS: Record<number | string, string> = {
  0: '정상종료',
  1: '멘트 후 종료',
  2: '우회 라우팅',
  3: '멘트 후 우회 라우팅',
};

// ─── Backend Response 타입 ──────────────────────────────────────────────────

/**
 * DID라우트 목록/상세 응답 -- 백엔드 DidRouteResponse 기준
 */
export interface DidRoute {
  didrouteId: number;
  didrouteName: string;
  nodeId: number;
  nodeName: string | null;
  aniPattern: string | null;
  dnisPattern: string | null;
  routingPosition: number | null;
  routeId: number | null;
  routeName: string | null;
  dnNo: string | null;
  priority: number;
  didrouteDesc: string | null;
  dnGroupId: number | null;
  ieWorktimeId: number | null;
  anonyCallBlock: number;
  afterRouteId: number | null;
  afterRouteName: string | null;
  afterDnNo: string | null;
  blockYn: number;
  blockControl: number;
  blockMentId: number | null;
  blockRoutingDnis: string | null;
  blockRouteId: number | null;
  blockRouteName: string | null;
}

// ─── Request 타입 ───────────────────────────────────────────────────────────

export interface DidRouteCreateRequest {
  didrouteName: string;
  nodeId: number;
  aniPattern?: string | null;
  dnisPattern?: string | null;
  routeId?: number | null;
  dnNo?: string | null;
  priority: number;
  didrouteDesc?: string | null;
  dnGroupId?: number | null;
  ieWorktimeId?: number | null;
  anonyCallBlock: number;
  afterRouteId?: number | null;
  afterDnNo?: string | null;
  blockYn: number;
  blockControl: number;
  blockMentId?: number | null;
  blockRoutingDnis?: string | null;
  blockRouteId?: number | null;
}

export type DidRouteUpdateRequest = DidRouteCreateRequest;

// ─── 폼 Step 정의 ───────────────────────────────────────────────────────────

export const DID_ROUTE_FORM_STEPS = [{ title: '기본정보' }, { title: '라우팅설정' }, { title: '블록설정' }] as const;

// ─── 초기값 ─────────────────────────────────────────────────────────────────

export const DID_ROUTE_INITIAL_VALUES: Partial<DidRouteCreateRequest> = {
  didrouteName: '',
  aniPattern: '',
  dnisPattern: '',
  priority: 1,
  didrouteDesc: '',
  anonyCallBlock: 0,
  blockYn: 0,
  blockControl: 0,
  dnNo: '',
  afterDnNo: '',
  blockRoutingDnis: '',
};

// ─── 유틸 ────────────────────────────────────────────────────────────────────

/** 업무시간 내/외 라우팅 표시 텍스트 생성 */
export function getRoutingDisplayText(routeName: string | null, dnNo: string | null): string {
  const parts: string[] = [];
  if (routeName) parts.push(routeName);
  if (dnNo) parts.push(dnNo);
  return parts.length > 0 ? parts.join(' / ') : '-';
}
