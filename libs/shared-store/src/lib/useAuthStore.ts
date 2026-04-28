import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * 사용자 정보 (서버 /api/auth/me 응답)
 * V23: userAccount(계정), username(사람이름), userId 분리
 *
 * @property userAccount - 로그인 계정 (Unique, 인증용)
 * @property username - 사람 이름 (표시용, 동명이인 허용)
 * @property userId - 사용자 PK
 */
export interface UserInfo {
  userAccount: string;
  username: string | null;
  userId: number | null;
  tenant: string;
  roles: string[];
}

/**
 * 역할 정보 (서버 /api/bff/role-list 응답)
 */
export interface RoleInfo {
  roleId: number;
  roleCode: string;
  roleName: string;
  canResetPassword?: boolean;
  canManageResourceAccess?: boolean;
}

/**
 * 비밀번호 만료 경고 정보
 */
export interface PasswordExpiringWarning {
  show: boolean;
  daysUntilExpiration: number | null;
}

interface AuthStore {
  /** 현재 로그인한 사용자 정보 */
  userInfo: UserInfo | null;
  /** 역할 목록 (역할코드 → 역할명 매핑용) */
  roleList: RoleInfo[];
  /** 로딩 상태 */
  isLoading: boolean;
  /** 비밀번호 만료 경고 (로그인 후 메인 페이지에서 토스트 표시용) */
  passwordExpiringWarning: PasswordExpiringWarning | null;
  /** 사용자 정보 설정 */
  setUserInfo: (userInfo: UserInfo | null) => void;
  /** 역할 목록 설정 */
  setRoleList: (roleList: RoleInfo[]) => void;
  /** 로딩 상태 설정 */
  setIsLoading: (isLoading: boolean) => void;
  /** 비밀번호 만료 경고 설정 */
  setPasswordExpiringWarning: (warning: PasswordExpiringWarning | null) => void;
  /** 스토어 초기화 (로그아웃 시) */
  reset: () => void;
  /** 역할코드로 역할명 조회 */
  getRoleName: (roleCode: string) => string;
  /** 현재 사용자의 첫 번째 역할명 조회 */
  getCurrentRoleName: () => string;
  /** 현재 사용자가 비밀번호 초기화 권한을 가지고 있는지 확인 */
  canResetPassword: () => boolean;
  /** 현재 사용자가 리소스 접근 관리 권한을 가지고 있는지 확인 */
  canManageResourceAccess: () => boolean;
}

const initialState = {
  userInfo: null,
  roleList: [],
  isLoading: false,
  passwordExpiringWarning: null,
};

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setUserInfo: (userInfo) => set({ userInfo }, false, 'setUserInfo'),
      setRoleList: (roleList) => set({ roleList }, false, 'setRoleList'),
      setIsLoading: (isLoading) => set({ isLoading }, false, 'setIsLoading'),
      setPasswordExpiringWarning: (warning) => set({ passwordExpiringWarning: warning }, false, 'setPasswordExpiringWarning'),
      reset: () => set(initialState, false, 'reset'),

      getRoleName: (roleCode: string) => {
        const { roleList } = get();
        const role = roleList.find((r) => r.roleCode === roleCode);
        return role?.roleName ?? roleCode;
      },

      getCurrentRoleName: () => {
        const { userInfo, roleList } = get();
        if (!userInfo?.roles?.length) return '-';
        // 첫 번째 역할의 역할명 반환
        const firstRoleCode = userInfo.roles[0];
        const role = roleList.find((r) => r.roleCode === firstRoleCode);
        return role?.roleName ?? firstRoleCode;
      },

      /** 현재 사용자가 비밀번호 초기화 권한을 가지고 있는지 확인 */
      canResetPassword: () => {
        const { userInfo, roleList } = get();
        if (!userInfo?.roles?.length) return false;
        // 사용자의 역할 중 하나라도 canResetPassword가 true면 권한 있음
        return userInfo.roles.some((roleCode) => {
          const role = roleList.find((r) => r.roleCode === roleCode);
          return role?.canResetPassword === true;
        });
      },

      /** 현재 사용자가 리소스 접근 관리 권한을 가지고 있는지 확인 */
      canManageResourceAccess: () => {
        const { userInfo, roleList } = get();
        if (!userInfo?.roles?.length) return false;
        return userInfo.roles.some((roleCode) => {
          const role = roleList.find((r) => r.roleCode === roleCode);
          return role?.canManageResourceAccess === true;
        });
      },
    }),
    { name: 'AuthStore' },
  ),
);
