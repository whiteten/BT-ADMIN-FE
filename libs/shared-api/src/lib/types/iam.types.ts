// 역할 마스터
export interface Role {
  roleId: number;
  roleCode: string;
  roleName: string;
  description?: string;
  sortOrder: number;
  isUse: boolean;
  permissionCount?: number;
  userCount?: number;
  authIds?: number[];
  createdAt?: string;
  createdBy?: number;
  updatedAt?: string;
  updatedBy?: number;
}
