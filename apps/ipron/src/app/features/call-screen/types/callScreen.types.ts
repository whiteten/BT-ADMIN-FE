/**
 * 수신번호 차단 관리 타입 정의
 * TB_IE_CALLSCREEN: 수신번호 차단 패턴
 */

// ─── Backend Response 타입 ──────────────────────────────────────────────────

/**
 * 수신번호 차단 (목록/상세)
 */
export interface CallScreen {
  callscreenId: number;
  tenantId: number;
  tenantName: string;
  nodeId: number;
  nodeName: string;
  numPattern: string;
  screenDesc: string | null;
  dnGroupId: number | null;
}

// ─── Request 타입 ───────────────────────────────────────────────────────────

export interface CallScreenCreateRequest {
  nodeId: number;
  tenantId: number;
  numPattern: string;
  screenDesc?: string | null;
  dnGroupId?: number | null;
}

export interface CallScreenUpdateRequest {
  numPattern: string;
  screenDesc?: string | null;
  dnGroupId?: number | null;
}

// ─── 초기값 ─────────────────────────────────────────────────────────────────

export const CALL_SCREEN_INITIAL_VALUES: Partial<CallScreenCreateRequest> = {
  numPattern: '',
  screenDesc: '',
  dnGroupId: null,
};
