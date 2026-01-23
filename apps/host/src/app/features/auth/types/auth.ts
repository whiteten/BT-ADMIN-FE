export interface LoginRequestDatas {
  username: string;
  password: string;
}

/**
 * 사용자 정보 응답 타입 (/api/auth/me)
 */
export interface UserInfoResponse {
  username: string;
  tenant: string;
  roles: string[];
}

/**
 * 역할 정보 타입
 */
export interface RoleResponse {
  roleId: number;
  roleCode: string;
  roleName: string;
  description?: string;
  sortOrder: number;
  isUse: boolean;
}

/**
 * 로그인 응답 타입
 */
export interface LoginResponse {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  jti: string;
  mode: string;
  sid: string;
  tenant: string;
  roles: string[];
  userId: number;
  passwordExpired: boolean;
  passwordExpiringSoon: boolean;
  daysUntilExpiration: number | null;
  forcePasswordChange: boolean;
}
