/**
 * 발신 DNIS 사전변환 타입 정의
 * AS-IS: 발신 DNIS 사전변환 (Pre Number Transformation)
 * TO-BE: BT-ADMIN-SERVICE-IPRON pre-num-trans feature
 */

// ─── Enum 라벨 매핑 ─────────────────────────────────────────────────────────

/**
 * 편집옵션 (EDIT_OPT) — IE_EDIT_OPT_TYPE
 * 1: 모두 유지, 2: 앞자리 삭제, 3: 뒷자리 유지, 4: 전체 삭제
 */
export const EDIT_OPT_OPTIONS = [
  { label: '모두 유지', value: 1 },
  { label: '앞자리 삭제', value: 2 },
  { label: '뒷자리 유지', value: 3 },
  { label: '전체 삭제', value: 4 },
] as const;

export const EDIT_OPT_LABELS: Record<number, string> = {
  1: '모두 유지',
  2: '앞자리 삭제',
  3: '뒷자리 유지',
  4: '전체 삭제',
};

/**
 * 변환 동작 (TRANS_ACTION)
 * 1: 변환 후 발신, 2: 변환 후 라우트
 */
export const TRANS_ACTION_OPTIONS = [
  { label: '변환 후 발신', value: 1 },
  { label: '변환 후 라우트', value: 2 },
] as const;

export const TRANS_ACTION_LABELS: Record<number, string> = {
  1: '변환 후 발신',
  2: '변환 후 라우트',
};

// ─── Backend Response 타입 ──────────────────────────────────────────────────

/**
 * 발신 DNIS 사전변환 목록/상세 응답
 */
export interface PreNumTrans {
  preTransId: number;
  nodeId: number;
  nodeName: string;
  dnisPattern: string;
  editOpt: number;
  delCount: number;
  addDigit: string | null;
  transAction: number | null;
  routeId: number | null;
  routeName: string | null;
  priority: number;
  transDesc: string | null;
}

// ─── Request 타입 ───────────────────────────────────────────────────────────

export interface PreNumTransCreateRequest {
  nodeId: number;
  dnisPattern: string;
  editOpt: number;
  delCount: number;
  addDigit?: string | null;
  transAction?: number | null;
  routeId?: number | null;
  priority: number;
  transDesc?: string | null;
}

export type PreNumTransUpdateRequest = PreNumTransCreateRequest;

// ─── 초기값 ─────────────────────────────────────────────────────────────────

export const PRE_NUM_TRANS_INITIAL_VALUES: Partial<PreNumTransCreateRequest> = {
  dnisPattern: '',
  editOpt: 1,
  delCount: 0,
  addDigit: '',
  transAction: 1,
  routeId: null,
  priority: 1,
  transDesc: '',
};
