/**
 * 사용자 응답 DTO (백엔드 UserResponse와 일치)
 */
export interface User {
  userId?: number;
  tenantId?: number;
  tenantName?: string;
  userSabun: string;
  userName?: string;
  position?: string;
  nodeId?: number;
  nodeName?: string;
  grantId?: number;
  grantName?: string;
  userTelNo?: string;
  userStatus?: string;
  userStatusName?: string;
  loginLock?: string;
  multiLogin?: string;
  oscomName?: string;
  centerId?: number;
  centerName?: string;
  companyId?: number;
  companyName?: string;
  accessScope?: string;
  ipStart?: string;
  ipFinsh?: string;
  loginErrorCount?: number;
  passwordTime?: string;
  noticeAutority?: number;
  approvalAuthority?: number;
  isUse?: boolean;
  createdAt?: string;
  createdBy?: number;
  createdByName?: string;
  updatedAt?: string;
  updatedBy?: number;
  updatedByName?: string;
}

/**
 * 사용자 생성/수정 요청 DTO (백엔드 UserRequest와 일치)
 */
export interface UserRequest {
  tenantId?: number;
  userSabun: string;
  userName?: string;
  userPassword?: string;
  position?: string;
  nodeId?: number;
  grantId?: number;
  userTelNo?: string;
  userStatus?: string;
  loginLock?: string;
  multiLogin?: string;
  oscomName?: string;
  centerId?: number;
  companyId?: number;
  accessScope?: string;
  ipStart?: string;
  ipFinsh?: string;
  noticeAutority?: number;
  approvalAuthority?: number;
  isUse?: boolean;
}

/**
 * 사용자 검색 파라미터
 */
export interface UserSearchParams {
  tenantId?: number;
  centerId?: number;
  userSabun?: string;
  userName?: string;
  userStatus?: string;
  isUse?: boolean;
  page?: number;
  size?: number;
}

/**
 * 비밀번호 변경 요청
 */
export interface PasswordChangeRequest {
  newPassword: string;
}
