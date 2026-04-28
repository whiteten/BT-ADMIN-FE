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
  createdAt?: string;
  createdBy?: number;
  updatedAt?: string;
  updatedBy?: number;
}
