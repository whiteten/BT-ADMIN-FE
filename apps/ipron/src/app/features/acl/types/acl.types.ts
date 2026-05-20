/**
 * 교환기 IP 접근관리 타입 정의
 * AS-IS: IPR20S1072
 * TO-BE: BT-ADMIN-SERVICE-IPRON acl feature
 */

// ─── Enum 라벨 매핑 ─────────────────────────────────────────────────────────

/**
 * 활성화 여부 (USE_YN)
 * 1: 설정, 0: 해제
 */
export const USE_YN_OPTIONS = [
  { label: '설정', value: 1 },
  { label: '해제', value: 0 },
] as const;

export const USE_YN_LABELS: Record<number, string> = {
  1: '설정',
  0: '해제',
};

// ─── Backend Response 타입 ──────────────────────────────────────────────────

/**
 * ACL 목록/상세 응답
 */
export interface Acl {
  aclId: number;
  aclName: string;
  nodeId: number;
  nodeName: string;
  aclType: number;
  ipNet: string;
  ipMask: string;
  useYn: number;
  aclDesc: string | null;
}

// ─── Request 타입 ───────────────────────────────────────────────────────────

export interface AclCreateRequest {
  nodeId: number;
  aclName: string;
  ipNet: string;
  ipMask: string;
  useYn: number;
  aclType: number;
  aclDesc?: string | null;
}

export type AclUpdateRequest = AclCreateRequest;

// ─── 초기값 ─────────────────────────────────────────────────────────────────

export const ACL_INITIAL_VALUES: Partial<AclCreateRequest> = {
  aclName: '',
  ipNet: '',
  ipMask: '',
  useYn: 1,
  aclType: 1,
  aclDesc: '',
};
