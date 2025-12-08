/**
 * RBAC 권한 관리 시스템 타입 정의
 */

// 앱 마스터
export interface App {
  appId: string;
  appName: string;
  description?: string;
  sortOrder: number;
  useYn: string;
}

// 역할 마스터
export interface Role {
  roleId: number;
  roleCode: string;
  roleName: string;
  description?: string;
  sortOrder: number;
  useYn: string;
  permissionCount?: number;
  userCount?: number;
  createdAt?: string;
  createdBy?: string;
}

// 권한 마스터
export interface Permission {
  authId: number;
  appId: string;
  domain: string;
  resource: string;
  action: string;
  permKey: string;
  description?: string;
  useYn: string;
}

// 역할-권한 매핑
export interface RolePermission {
  roleId: number;
  authId: number;
  createdBy?: string;
  createdAt?: string;
}

// 사용자-역할 매핑
export interface UserRole {
  userId: string;
  roleId: number;
  roleName?: string;
  roleCode?: string;
  createdBy?: string;
  createdAt?: string;
}

// 사용자-권한 직접 매핑 (User Override)
export interface UserAuth {
  userId: string;
  authId: number;
  grantType: 'GRANT' | 'DENY';
  reason?: string;
  expiredAt?: string;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  // 조인 정보
  permKey?: string;
  permDescription?: string;
  appId?: string;
}

// 사용자-메뉴 직접 매핑 (User Override)
export interface UserMenu {
  userId: string;
  menuId: number;
  grantType: 'GRANT' | 'DENY';
  reason?: string;
  expiredAt?: string;
  createdBy?: string;
  createdAt?: string;
  // 조인 정보
  menuKey?: string;
  menuLabel?: string;
}

// 사용자 권한 조회 응답
export interface UserAuthorityResponse {
  userId: string;
  userName?: string;
  authorities: string[];
  source: Record<string, 'ROLE' | 'USER_GRANT'>;
  roles: UserRole[];
  overrides: UserAuth[];
}

// 사용자 권한 부여/박탈 요청
export interface UserAuthGrantRequest {
  authId: number;
  grantType: 'GRANT' | 'DENY';
  reason?: string;
  expiredAt?: string;
}

// 역할 생성/수정 요청
export interface RoleUpsertRequest {
  roleCode: string;
  roleName: string;
  description?: string;
  sortOrder?: number;
  permissionIds?: number[];
}

// 권한 그룹 (UI용)
export interface PermissionGroup {
  appId: string;
  appName: string;
  domains: {
    domain: string;
    permissions: Permission[];
  }[];
}

// 테이블 필터
export interface IamFilter {
  appId?: string;
  keyword?: string;
  useYn?: string;
}
