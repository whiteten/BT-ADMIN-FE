import { create } from 'zustand';

/**
 * 사용자 정보 (서버 /api/auth/me 응답)
 */
export interface UserInfo {
  username: string;
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
}

interface AuthStore {
  /** 현재 로그인한 사용자 정보 */
  userInfo: UserInfo | null;
  /** 역할 목록 (역할코드 → 역할명 매핑용) */
  roleList: RoleInfo[];
  /** 로딩 상태 */
  isLoading: boolean;
  /** 사용자 정보 설정 */
  setUserInfo: (userInfo: UserInfo | null) => void;
  /** 역할 목록 설정 */
  setRoleList: (roleList: RoleInfo[]) => void;
  /** 로딩 상태 설정 */
  setIsLoading: (isLoading: boolean) => void;
  /** 스토어 초기화 (로그아웃 시) */
  reset: () => void;
  /** 역할코드로 역할명 조회 */
  getRoleName: (roleCode: string) => string;
  /** 현재 사용자의 첫 번째 역할명 조회 */
  getCurrentRoleName: () => string;
}

const initialState = {
  userInfo: null,
  roleList: [],
  isLoading: false,
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...initialState,

  setUserInfo: (userInfo) => set({ userInfo }),
  setRoleList: (roleList) => set({ roleList }),
  setIsLoading: (isLoading) => set({ isLoading }),
  reset: () => set(initialState),

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
}));
