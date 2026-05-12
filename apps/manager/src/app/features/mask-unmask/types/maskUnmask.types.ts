/**
 * 마스킹 해지 요청 타입.
 *
 * - 사용자: 평문 노출 요청 등록 / 본인 요청 이력 / 토큰 회수
 * - 관리자: 검토 큐 / 승인-반려 / 감사 로그 조회
 */

/** 요청 상태 */
export type MaskUnmaskStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'REVOKED';

/** 대상 종류 (마스킹된 데이터의 출처) */
export type MaskTargetType = 'CALL' | 'CUSTOMER' | 'USER' | 'TICKET' | 'OTHER';

/** 감사 액션 종류 */
export type MaskAuditAction = 'REQUEST' | 'APPROVE' | 'REJECT' | 'VIEW_UNMASKED' | 'REVOKE' | 'EXPIRE';

/** 해지 요청 (마스터) */
export interface MaskUnmaskRequest {
  requestId: number;
  tenantId: number | null;
  category: string;
  targetType: MaskTargetType;
  targetId: string;
  fieldName: string | null;
  reason: string;
  requestedHours: number;
  grantedHours: number | null;
  status: MaskUnmaskStatus;
  urgent: number;
  approverComment: string | null;
  /** 요청자 정보 */
  requesterUserId: number;
  requesterName: string | null;
  requesterDept: string | null;
  requesterIp: string | null;
  /** 승인자 정보 */
  approverUserId: number | null;
  approverName: string | null;
  /** 시간 */
  requestedAt: string;
  decidedAt: string | null;
  expiresAt: string | null;
  workUser: number | null;
  workTime: string | null;
}

/** 해지 요청 등록 */
export interface UnmaskCreateRequest {
  category: string;
  targetType: MaskTargetType;
  targetId: string;
  fieldName?: string;
  reason: string;
  requestedHours: number;
  urgent?: number;
}

/** 승인 요청 */
export interface UnmaskApproveRequest {
  requestId: number;
  grantedHours: number;
  comment?: string;
}

/** 반려 요청 */
export interface UnmaskRejectRequest {
  requestId: number;
  comment: string;
}

/** 평문 노출 가능 여부 체크 응답 */
export interface UnmaskCheckResponse {
  unmasked: boolean;
  /** 활성 토큰의 만료 시각 (해지 중인 경우) */
  expiresAt: string | null;
  /** 해지 요청 ID (해지 중인 경우) */
  requestId: number | null;
}

/** 감사 로그 */
export interface MaskAudit {
  auditId: number;
  tenantId: number | null;
  userId: number;
  userName: string | null;
  action: MaskAuditAction;
  category: string | null;
  targetType: MaskTargetType | null;
  targetId: string | null;
  fieldName: string | null;
  requestId: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  occurredAt: string;
}

/** 해지 요청 목록 조회 파라미터 */
export interface UnmaskListParams {
  status?: MaskUnmaskStatus;
  category?: string;
  page?: number;
  size?: number;
}

/** 감사 로그 조회 파라미터 */
export interface AuditListParams {
  tenantId?: number | null;
  from?: string;
  to?: string;
}

/** 사용자별 감사 로그 조회 파라미터 */
export interface AuditByUserParams {
  userId: number;
  from?: string;
  to?: string;
}

/** 대상별 감사 로그 조회 파라미터 */
export interface AuditByTargetParams {
  targetType: MaskTargetType;
  targetId: string;
}

/** 상태 라벨 매핑 (UI 표시용) */
export const STATUS_LABELS: Record<MaskUnmaskStatus, string> = {
  PENDING: '대기',
  APPROVED: '승인',
  REJECTED: '반려',
  EXPIRED: '만료',
  REVOKED: '회수',
};

/** 상태별 색상 클래스 (Tailwind) */
export const STATUS_BADGE_CLASS: Record<MaskUnmaskStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
  REVOKED: 'bg-pink-100 text-pink-700',
};

/** 감사 액션 색상 매핑 */
export const AUDIT_ACTION_BADGE_CLASS: Record<MaskAuditAction, string> = {
  REQUEST: 'bg-violet-50 text-violet-700',
  APPROVE: 'bg-blue-50 text-blue-700',
  REJECT: 'bg-red-50 text-red-700',
  VIEW_UNMASKED: 'bg-emerald-50 text-emerald-700',
  REVOKE: 'bg-pink-50 text-pink-700',
  EXPIRE: 'bg-gray-50 text-gray-600',
};

/** 대상 종류 라벨 */
export const TARGET_TYPE_LABELS: Record<MaskTargetType, string> = {
  CALL: '통화',
  CUSTOMER: '고객',
  USER: '사용자',
  TICKET: '티켓',
  OTHER: '기타',
};
