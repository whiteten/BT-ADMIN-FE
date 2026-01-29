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

// 권한 마스터
export interface Permission {
  authId: number;
  appId: string;
  domain: string;
  resource: string;
  action: string;
  authKey: string;
  description?: string;
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
// AWS IAM과 동일한 업계 표준 용어 사용
export type PermissionEffect = 'ALLOW' | 'DENY';

export interface UserAuthMap {
  mapId: number;
  tenantId: number;
  userId: number;
  username?: string;
  authId: number;
  authKey?: string;
  authDescription?: string;
  appId?: string;
  effect: PermissionEffect;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
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

// 사용자 권한 부여/박탈 요청 (단건)
export interface UserAuthGrantDatas {
  authId: number;
  effect: PermissionEffect;
}

// 사용자 권한 매핑 생성 요청 - 단일 사용자, 다중 권한
// userId는 URL path에서 전달
export interface UserAuthMapCreateDatas {
  authIds: number[];
  effect: PermissionEffect;
}

// 사용자 권한 매핑 생성 응답
export interface UserAuthMapCreateResponse {
  totalCreated: number;
  authCount: number;
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
  authIds?: number[];
}

// 역할 수정 요청
export interface RoleUpdateDatas {
  roleCode: string;
  roleName: string;
  description?: string;
  sortOrder?: number;
  isUse: boolean;
  authIds?: number[];
}

// 권한 요약 정보 (메뉴별 권한 조회용)
export interface PermissionSummary {
  authId: number;
  authKey: string;
  description?: string;
  domain: string;
  resourceKey: string;
  action: string;
}

// 메뉴별 권한 목록 (백엔드 응답 - 트리 구조)
export interface MenuWithPermissions {
  menuId: number;
  parentId: number | null;
  menuKey: string;
  menuLabel: string;
  appId: string;
  menuType: string;
  sortOrder: number;
  permissions: PermissionSummary[];
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
