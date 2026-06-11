/**
 * DOD DNIS 관리 타입 정의
 * Master-Detail: DOD DNIS 변환 마스터 + 변환 아이템(패턴 리스트)
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
 * 변환 사용여부 (TRANS_YN)
 * 1: 사용, 0: 미사용
 */
export const TRANS_YN_OPTIONS = [
  { label: '사용', value: 1 },
  { label: '미사용', value: 0 },
] as const;

export const TRANS_YN_LABELS: Record<number, string> = {
  1: '사용',
  0: '미사용',
};

// ─── Backend Response 타입 ──────────────────────────────────────────────────

/**
 * DOD DNIS 변환 마스터 (목록/카드용)
 */
export interface DodTransMaster {
  dodTransId: number;
  dodTransName: string;
  nodeId: number;
  nodeName: string;
  tenantId: number;
  tenantName: string;
  itemCount: number;
}

/**
 * DOD DNIS 변환 아이템 (패턴 리스트 — 하단 그리드)
 */
export interface DodTransItem {
  dodTransId: number;
  listSeq: number;
  numPattern: string;
  editOpt: number;
  delCount: number;
  addDigit: string | null;
  transYn: number;
  masterName?: string;
  nodeName?: string;
  tenantName?: string;
}

// ─── Request 타입 ───────────────────────────────────────────────────────────

export interface DodTransMasterCreateRequest {
  nodeId: number;
  dodTransName: string;
}

export type DodTransMasterUpdateRequest = DodTransMasterCreateRequest;

export interface DodTransItemCreateRequest {
  dodTransId: number;
  numPattern: string;
  editOpt: number;
  delCount: number;
  addDigit?: string | null;
  transYn: number;
}

export interface DodTransItemUpdateRequest {
  numPattern: string;
  editOpt: number;
  delCount: number;
  addDigit?: string | null;
  transYn: number;
}

// ─── 초기값 ─────────────────────────────────────────────────────────────────

export const DOD_TRANS_MASTER_INITIAL_VALUES: Partial<DodTransMasterCreateRequest> = {
  dodTransName: '',
};

export const DOD_TRANS_ITEM_INITIAL_VALUES: Partial<DodTransItemCreateRequest> = {
  numPattern: '',
  editOpt: 1,
  delCount: 0,
  addDigit: '',
  transYn: 1,
};

// ─── 노드별 마스터 그룹 (트리용) ────────────────────────────────────────────

export interface NodeDodTransGroup {
  nodeId: number;
  nodeName: string;
  masters: DodTransMaster[];
}
