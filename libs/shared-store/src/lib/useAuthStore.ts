import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * 테넌트 요약 (전환 UI용)
 */
export interface TenantSummary {
  tenantId: number;
  tenantName: string;
}

/**
 * 사용자 정보 (서버 /api/auth/me 응답)
 * V23: userAccount(계정), username(사람이름), userId 분리
 * V37: tenantName, availableTenants 추가 (테넌트 전환 UI 지원)
 * V64: globalRoles, roleNames 추가 (시스템 관리자 글로벌 역할 + 역할명 매핑)
 *
 * @property userAccount - 로그인 계정 (Unique, 인증용)
 * @property username - 사람 이름 (표시용, 동명이인 허용)
 * @property userId - 사용자 PK
 * @property tenant - 현재 테넌트 ID (문자열)
 * @property tenantName - 현재 테넌트명
 * @property availableTenants - 접근 가능한 테넌트 목록 (전환 UI용)
 * @property globalRoles - 글로벌 역할 코드 목록 (ROLE_ADMIN 등, 테넌트 무관)
 * @property roles - 현재 테넌트의 역할 코드 목록
 * @property roleNames - 역할 코드 → 역할명 매핑 (FE 표시용, 별도 /role-list 호출 불필요)
 */
export interface UserInfo {
  userAccount: string;
  username: string | null;
  userId: number | null;
  tenant: string;
  tenantName: string;
  availableTenants: TenantSummary[];
  /** 사용자가 가진 모든 역할 코드 (글로벌 + 테넌트 합집합) */
  roles: string[];
  /** 역할 코드 → 역할명 매핑 */
  roleNames: Record<string, string>;
  /** 시스템 관리자(글로벌 ROLE_ADMIN) 여부 */
  isSystemAdmin: boolean;
  /** 비밀번호 초기화 권한 — 사용자의 모든 역할 OR 합산 */
  canResetPassword: boolean;
  /** 리소스 접근 관리 권한 — 사용자의 모든 역할 OR 합산 */
  canManageResourceAccess: boolean;
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
  /** 로딩 상태 */
  isLoading: boolean;
  /** 비밀번호 만료 경고 (로그인 후 메인 페이지에서 토스트 표시용) */
  passwordExpiringWarning: PasswordExpiringWarning | null;
  /** 사용자 정보 설정 */
  setUserInfo: (userInfo: UserInfo | null) => void;
  /** 로딩 상태 설정 */
  setIsLoading: (isLoading: boolean) => void;
  /** 비밀번호 만료 경고 설정 */
  setPasswordExpiringWarning: (warning: PasswordExpiringWarning | null) => void;
  /** 스토어 초기화 (로그아웃 시) */
  reset: () => void;
  /** 역할코드로 역할명 조회 (userInfo.roleNames 기반) */
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
  isLoading: false,
  passwordExpiringWarning: null,
};

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setUserInfo: (userInfo) => set({ userInfo }, false, 'setUserInfo'),
      setIsLoading: (isLoading) => set({ isLoading }, false, 'setIsLoading'),
      setPasswordExpiringWarning: (warning) => set({ passwordExpiringWarning: warning }, false, 'setPasswordExpiringWarning'),
      reset: () => set(initialState, false, 'reset'),

      getRoleName: (roleCode: string) => {
        const { userInfo } = get();
        return userInfo?.roleNames?.[roleCode] ?? roleCode;
      },

      getCurrentRoleName: () => {
        const { userInfo } = get();
        const firstCode = userInfo?.roles?.[0];
        if (!firstCode) return '-';
        return userInfo?.roleNames?.[firstCode] ?? firstCode;
      },

      /** 현재 사용자가 비밀번호 초기화 권한을 가지고 있는지 확인 */
      canResetPassword: () => {
        return get().userInfo?.canResetPassword === true;
      },

      /** 현재 사용자가 리소스 접근 관리 권한을 가지고 있는지 확인 */
      canManageResourceAccess: () => {
        return get().userInfo?.canManageResourceAccess === true;
      },
    }),
    { name: 'AuthStore' },
  ),
);
