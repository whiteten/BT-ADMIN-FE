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
