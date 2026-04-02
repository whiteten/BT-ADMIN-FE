import type { Role as SharedRole } from '@/shared-api';

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
export type Role = SharedRole;

// 액션별 권한 ID
export interface ActionAuthIds {
  read: number | null;
  write: number | null;
  delete: number | null;
  apply: number | null;
  export: number | null;
}

// 권한 마스터
export interface Permission {
  authId: number;
  appId: string;
  menuId: number;
  action: string;
  authKey: string;
  description?: string;
  isSystem: boolean;
  menuLabel?: string;
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

// 사용자-권한 직접 매핑 (User Override) - 백엔드 응답 타입
export interface UserAuthMap {
  mapId: number;
  tenantId: number;
  userId: number;
  username?: string;
  authId: number;
  authKey?: string;
  authDescription?: string;
  appId?: string;
  createdAt?: string;
  createdBy?: number;
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
  overrides: UserAuthMap[];
}

// 사용자 권한 동기화 요청 (역할 권한 매핑과 동일 형식)
export interface UserPermissionSyncRequest {
  authIds: number[];
}

// 사용자 권한 동기화 응답 (Replacement 모델)
export interface UserPermissionSyncResponse {
  syncedCount: number; // 동기화된 권한 수
}

// 역할 생성/수정 요청
export interface RoleUpsertDatas {
  roleCode: string;
  roleName: string;
  description?: string;
  sortOrder?: number;
  isUse?: boolean;
  authIds?: number[];
}

// 역할 생성 요청
export interface RoleCreateDatas {
  roleCode: string;
  roleName: string;
  description?: string;
  sortOrder?: number;
  isUse?: boolean;
  canResetPassword?: boolean;
  authIds?: number[];
}

// 역할 수정 요청
export interface RoleUpdateDatas {
  roleCode: string;
  roleName: string;
  description?: string;
  sortOrder?: number;
  isUse: boolean;
  canResetPassword: boolean;
  authIds?: number[];
}

// 메뉴별 권한 목록 (백엔드 응답 - 트리 구조)
export interface MenuWithPermissions {
  menuId: number;
  parentId: number | null;
  menuKey: string;
  menuLabel: string;
  appId: string;
  appName: string;
  menuType: string;
  sortOrder: number;
  permissions: ActionAuthIds;
  children: MenuWithPermissions[];
}

// 권한 그룹 (UI용) - 앱별로 메뉴를 그룹화
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

// 권한 Flat 응답 (메뉴 정보 포함)
export interface PermissionFlat {
  authId: number;
  appId: string;
  action: string;
  authKey: string;
  description?: string;
  isSystem: boolean;
  menuId?: number;
  menuKey?: string;
  menuLabel?: string;
  roleCount: number;
  userOverrideCount: number;
}

// 권한 생성 요청
export interface PermissionCreateRequest {
  appId: string;
  menuId: number;
  menuKey: string;
  action: string;
  description?: string;
}
