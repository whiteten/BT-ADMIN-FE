import type { Role as SharedRole } from '@/shared-api';

/**
 * RBAC 권한 관리 시스템 타입 정의.
 * IAM 재설계 v2.2: authId/menuId(number) → authKey/menuKey(string).
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
export type Role = SharedRole;

// 액션별 권한 키 (null이면 해당 액션 권한 없음)
export interface ActionAuthKeys {
  read: string | null;
  write: string | null;
  delete: string | null;
  apply: string | null;
  export: string | null;
}

// 권한 마스터
export interface Permission {
  authKey: string;
  appId: string;
  menuKey?: string;
  action: string;
  description?: string;
  isSystem: boolean;
  menuLabel?: string;
}

// 역할-권한 매핑
export interface RolePermission {
  roleId: number;
  authKey: string;
  createdBy?: string;
  createdAt?: string;
}

// 사용자-역할 매핑
export interface UserRole {
  userId: string;
  roleId: number;
  tenantId?: number;
  roleName?: string;
  roleCode?: string;
  createdBy?: string;
  createdAt?: string;
}

// 사용자-권한 직접 매핑 (User Override)
export interface UserAuthMap {
  mapId: number;
  tenantId: number;
  userId: number;
  username?: string;
  authKey: string;
  authDescription?: string;
  appId?: string;
  createdAt?: string;
  createdBy?: number;
}

// 사용자-메뉴 직접 매핑
export interface UserMenu {
  userId: string;
  menuKey: string;
  grantType: 'GRANT' | 'DENY';
  reason?: string;
  expiredAt?: string;
  createdBy?: string;
  createdAt?: string;
  menuLabel?: string;
}

// 사용자 권한 조회 응답
export interface UserAuthorityResponse {
  userId: string;
  userName?: string;
  authorities: string[];
  source: Record<string, 'ROLE' | 'USER_GRANT'>;
  roles: UserRole[];
  overrides: UserAuthMap[];
}

// 사용자 권한 동기화 요청
export interface UserPermissionSyncRequest {
  authKeys: string[];
}

// 사용자 권한 동기화 응답
export interface UserPermissionSyncResponse {
  syncedCount: number;
}

// 역할 생성/수정 요청
export interface RoleUpsertDatas {
  roleCode: string;
  roleName: string;
  description?: string;
  sortOrder?: number;
  isUse?: boolean;
  authKeys?: string[];
}

// 역할 생성 요청
export interface RoleCreateDatas {
  roleCode: string;
  roleName: string;
  description?: string;
  sortOrder?: number;
  isUse?: boolean;
  canResetPassword?: boolean;
  authKeys?: string[];
}

// 역할 수정 요청
export interface RoleUpdateDatas {
  roleCode: string;
  roleName: string;
  description?: string;
  sortOrder?: number;
  isUse: boolean;
  canResetPassword: boolean;
  authKeys?: string[];
}

// 메뉴별 권한 목록 (백엔드 응답 - 트리 구조)
export interface MenuWithPermissions {
  menuKey: string;
  parentKey: string | null;
  menuLabel: string;
  appId: string;
  appName: string;
  menuType: string;
  sortOrder: number;
  permissions: ActionAuthKeys;
  children: MenuWithPermissions[];
}

// 권한 그룹 (UI용)
export interface PermissionGroup {
  appId: string;
  appName: string;
  menus: MenuWithPermissions[];
}

// 테이블 필터
export interface IamFilter {
  appId?: string;
  keyword?: string;
  useYn?: string;
}

// 권한 Flat 응답
export interface PermissionFlat {
  authKey: string;
  appId: string;
  action: string;
  description?: string;
  isSystem: boolean;
  menuKey?: string;
  menuLabel?: string;
}

// 권한 생성 요청
export interface PermissionCreateRequest {
  appId: string;
  menuKey: string;
  action: string;
  description?: string;
}
