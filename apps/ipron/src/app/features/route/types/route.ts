/**
 * 발신라우트 관리 타입 정의
 * SD-ROUTE.md 설계서 기반
 *
 * AS-IS: IPR20S1020 (TB_IE_ROUTE, TB_IE_ROUTEPOINT)
 * TO-BE: BT-ADMIN-SERVICE-IPRON route feature
 */

// ─── Enum 라벨 매핑 ─────────────────────────────────────────────────────────

/** 분배방식 (ROUTE_TYPE) — DB 기준 */
export const ROUTE_TYPE_OPTIONS = [
  { label: '순차', value: 0 },
  { label: '순환', value: 1 },
  { label: '균등', value: 2 },
  { label: 'Main/Backup', value: 3 },
] as const;

export const ROUTE_TYPE_LABELS: Record<number | string, string> = {
  0: '순차',
  1: '순환',
  2: '균등',
  3: 'Main/Backup',
};

/** ANI TYPE — DB 기준 */
export const ANI_TYPE_OPTIONS = [
  { label: '대표번호', value: 0 },
  { label: '국선번호', value: 1 },
  { label: '개별지정번호', value: 2 },
] as const;

export const ANI_TYPE_LABELS: Record<number | string, string> = {
  0: '대표번호',
  1: '국선번호',
  2: '개별지정번호',
};

/** 과금유형 (CHRG_TYPE) — DB 기준 */
export const CHARGE_TYPE_OPTIONS = [
  { label: '대표과금번호', value: 0 },
  { label: '개별과금번호', value: 1 },
] as const;

export const CHARGE_TYPE_LABELS: Record<number | string, string> = {
  0: '대표과금번호',
  1: '개별과금번호',
};

/** 편집옵션 (IE_EDIT_OPT_TYPE) — DB 기준 */
export const EDIT_OPT_OPTIONS = [
  { label: '삭제 후 추가', value: 1 },
  { label: '앞자리 삭제', value: 2 },
  { label: '뒷자리 삭제', value: 3 },
  { label: '전체 변경', value: 4 },
] as const;

export const EDIT_OPT_LABELS: Record<number | string, string> = {
  1: '삭제 후 추가',
  2: '앞자리 삭제',
  3: '뒷자리 삭제',
  4: '전체 변경',
};

/** 업무시간외제어 (IE_ROUTE_WORKTIME_OPT_TYPE) — DB 기준 */
export const WORKTIME_OPT_OPTIONS = [
  { label: '해제', value: 1 },
  { label: '안내멘트 후 종료', value: 2 },
  { label: '라우트 전환', value: 3 },
  { label: '안내멘트 후 라우트 전환', value: 4 },
] as const;

export const WORKTIME_OPT_LABELS: Record<number | string, string> = {
  1: '해제',
  2: '안내멘트 후 종료',
  3: '라우트 전환',
  4: '안내멘트 후 라우트 전환',
};

/** 사용/미사용 */
export const USE_YN_OPTIONS = [
  { label: '사용', value: 1 },
  { label: '미사용', value: 0 },
] as const;

// ─── Backend Response 타입 ──────────────────────────────────────────────────

/**
 * 라우트 목록/상세 응답 -- 백엔드 RouteResponse 기준
 */
export interface Route {
  routeId: number;
  routeName: string;
  routeType: number;
  nodeId: number;
  nodeName: string | null;
  aniType: number;
  aniNo: string | null;
  regionUseYn: number;
  regionNo: string | null;
  localNum: string | null;
  portNo: number;
  delCount: number;
  addDigit: string | null;
  editOpt: number;
  chrgType: number;
  chrgNo: string | null;
  ringbacktoneYn: number;
  routeBlockYn: number;
  callFailRetryYn: number;
  vendorAuthnumYn: number;
  busyRouteId: number | null;
  blockRouteId: number | null;
  ieWorktimeId: number | null;
  worktimeOpt: number;
  worktimeMentId: number | null;
  worktimeRouteId: number | null;
  transNum: string | null;
  dodTransId: number | null;
  dodTransName: string | null;
  routePointCount: number;
}

/**
 * 라우트 포인트 (국선배정)
 */
export interface RoutePoint {
  endptId: number;
  endptName: string | null;
  endptType: number;
  endptTypeName: string | null;
  nodeId: number;
  nodeName: string | null;
  epPriority: number;
  backupGb: string | null;
}

// ─── Request 타입 ───────────────────────────────────────────────────────────

export interface RouteCreateRequest {
  routeName: string;
  routeType: number;
  nodeId: number;
  portNo: number;
  editOpt: number;
  delCount: number;
  addDigit?: string | null;
  dodTransId?: number | null;
  aniType: number;
  aniNo: string;
  regionNo?: string | null;
  localNum?: string | null;
  regionUseYn: number;
  chrgType: number;
  chrgNo?: string | null;
  ringbacktoneYn: number;
  routeBlockYn: number;
  busyRouteId?: number | null;
  blockRouteId?: number | null;
  ieWorktimeId?: number | null;
  worktimeRouteId?: number | null;
  worktimeOpt: number;
  transNum?: string | null;
  worktimeMentId?: number | null;
  vendorAuthnumYn: number;
  callFailRetryYn: number;
  points?: RoutePointItem[];
}

export type RouteUpdateRequest = RouteCreateRequest;

export interface RoutePointItem {
  endptId: number;
  epPriority: number;
}

export interface RoutePointBatchRequest {
  points: RoutePointItem[];
}

// ─── 국선배정 Dialog용 ──────────────────────────────────────────────────────

/** 국선배정 Dialog에서 사용하는 체크+우선순위 포함 국선 행 */
export interface EndpointForAssign {
  endptId: number;
  endptName: string;
  endptType: number;
  nodeId: number;
  nodeName: string | null;
  assigned: boolean;
  epPriority: number;
  backupGb: string;
}

// ─── 노드별 그룹 ────────────────────────────────────────────────────────────

export interface NodeRouteGroup {
  nodeId: number;
  nodeName: string;
  routes: Route[];
}

// ─── 폼 Step 정의 ───────────────────────────────────────────────────────────

export const ROUTE_FORM_STEPS = [{ title: '기본정보' }, { title: '부가정보' }] as const;

// ─── 초기값 ─────────────────────────────────────────────────────────────────

export const ROUTE_INITIAL_VALUES: Partial<RouteCreateRequest> = {
  routeType: 0,
  portNo: 5060,
  editOpt: 1,
  delCount: 0,
  aniType: 0,
  aniNo: '',
  regionUseYn: 0,
  chrgType: 0,
  ringbacktoneYn: 0,
  routeBlockYn: 0,
  vendorAuthnumYn: 0,
  callFailRetryYn: 0,
  worktimeOpt: 1,
};

// ─── 카드 표시 유틸 ─────────────────────────────────────────────────────────

export interface RouteTag {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export function getRouteTagList(route: Route): RouteTag[] {
  const tags: RouteTag[] = [];
  // 분배방식
  const routeTypeLabel = ROUTE_TYPE_LABELS[route.routeType] ?? route.routeType;
  tags.push({ label: routeTypeLabel, color: '#1677ff', bgColor: '#e6f4ff', borderColor: '#91caff' });
  // 링백톤
  if (route.ringbacktoneYn === 1) {
    tags.push({ label: '링백톤', color: '#722ed1', bgColor: '#f9f0ff', borderColor: '#d3adf7' });
  }
  // 호실패재시도
  if (route.callFailRetryYn === 1) {
    tags.push({ label: '호실패재시도', color: '#fa8c16', bgColor: '#fff7e6', borderColor: '#ffd591' });
  }
  return tags;
}

/** 카드 상태 배지 (차단일 때만 표시, 정상이면 null) */
export function getRouteStatusInfo(route: Route): { label: string; color: string; bgColor: string } | null {
  if (route.routeBlockYn === 1) return { label: '차단', color: '#ff4d4f', bgColor: '#fff2f0' };
  return null;
}
