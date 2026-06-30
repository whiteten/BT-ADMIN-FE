/**
 * 역할 마스터.
 *
 * IAM 재설계 v2.2:
 * - authIds(number[]) → authKeys(string[])
 * - tenantId 추가 (0 = 공용, 양수 = 테넌트 전용)
 */
export interface Role {
  roleId: number;
  tenantId?: number;
  roleCode: string;
  roleName: string;
  description?: string;
  sortOrder: number;
  isUse: boolean;
  canResetPassword: boolean;
  canManageResourceAccess: boolean;
  isSystem: boolean;
  permissionCount?: number;
  userCount?: number;
  authKeys?: string[];
  /** 화면에서 readonly(체크 고정·비활성) 처리할 권한 KEY. 시스템 관리자 역할의 IAM 핵심 권한 등. BE가 판단해 내려준다. */
  lockedAuthKeys?: string[];
  createdAt?: string;
  createdBy?: number;
  updatedAt?: string;
  updatedBy?: number;
}
