/**
 * DID 번호변환 타입 정의
 * AS-IS: DNIS 번호변환 + ANI 번호변환 통합
 * TO-BE: BT-ADMIN-SERVICE-IPRON did-trans feature
 */

// ─── Category ──────────────────────────────────────────────────────────────

export type DidTransCategory = 'dnis' | 'ani';

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

// ─── Backend Response 타입 ──────────────────────────────────────────────────

/**
 * DID 번호변환 목록/상세 응답
 */
export interface DidTrans {
  transId: number;
  transName: string;
  nodeId: number;
  nodeName: string;
  orgPattern: string;
  editOpt: number;
  delCount: number;
  addDigit: string | null;
  transPriority: number;
  transDesc: string | null;
  tenantId?: number;
}

// ─── Request 타입 ───────────────────────────────────────────────────────────

export interface DidTransCreateRequest {
  nodeId: number;
  transName: string;
  orgPattern: string;
  editOpt: number;
  delCount: number;
  addDigit?: string | null;
  transPriority: number;
  transDesc?: string | null;
  tenantId?: number;
}

export type DidTransUpdateRequest = DidTransCreateRequest;

// ─── 초기값 ─────────────────────────────────────────────────────────────────

export const DID_TRANS_INITIAL_VALUES: Partial<DidTransCreateRequest> = {
  transName: '',
  orgPattern: '',
  editOpt: 1,
  delCount: 0,
  addDigit: '',
  transPriority: 1,
  transDesc: '',
};

// ─── 번호 패턴 ─────────────────────────────────────────────────────────────

export interface NumPattern {
  patternId: number;
  patternName: string;
  numPattern: string;
}

export interface NumPatternCreateRequest {
  patternName: string;
  numPattern: string;
}

export type NumPatternUpdateRequest = NumPatternCreateRequest;
