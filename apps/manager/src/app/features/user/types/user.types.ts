/**
 * 계정 상태 타입
 */
export type AccountStatus = 'ACTIVE' | 'DORMANT' | 'DISABLED';

/**
 * 사용자 응답 DTO (백엔드 UserResponse와 일치)
 * TB_BT_CM_USER_MST 테이블 스키마 기준
 */
export interface User {
  /** 사용자 ID (PK) */
  id: number;
  /** 사용자명 (이름) */
  username: string;
  /** 계정 (로그인 ID) */
  userAccount?: string;
  /** 사용자 설명 */
  description?: string;
  /** 계정 상태 (ACTIVE/DORMANT/DISABLED) */
  accountStatus: AccountStatus;
  /** 역할 ID */
  roleId?: number;
  /** 역할명 */
  roleName?: string;
  /** 기본 테넌트 ID */
  tenantId?: number;
  /** 기본 테넌트명 */
  tenantName?: string;
  /** 생성일시 */
  createdAt?: string;
  /** 수정일시 */
  updatedAt?: string;
  /** 마지막 비밀번호 변경일시 */
  passwordChangedAt?: string;
  /** 비밀번호 변경 강제 여부 */
  forcePasswordChange?: boolean;
  /** 마지막 로그인 시각 */
  lastLoginAt?: string;
  /** 마지막 로그인 실패 시각 */
  lastFailedLoginAt?: string;
  /** 핸드폰번호 */
  phone?: string;
  /** 이메일 */
  email?: string;
  /** 접근 허용 IP 목록 (JSON 배열 문자열) */
  allowedIps?: string;
  /** 할당된 역할 목록 */
  roles?: string[];
}

/**
 * 사용자 생성 요청 DTO
 * - 생성 시: 초기 비밀번호는 백엔드에서 userAccount와 동일하게 자동 설정
 * - 생성 시: forcePasswordChange는 백엔드에서 true로 자동 설정 (첫 로그인 시 비밀번호 변경 유도)
 * - 테넌트 정보는 백엔드에서 인증 정보(TenantContext)로 자동 설정됨
 */
export interface UserCreateDatas {
  /** 사용자명 (이름) */
  username: string;
  /** 계정 (로그인 ID) - 초기 비밀번호로도 사용됨 */
  userAccount: string;
  /** 사용자 설명 */
  description?: string;
  /** 역할 ID */
  roleId?: number;
  /** 계정 상태 (ACTIVE/DORMANT/DISABLED) */
  accountStatus?: AccountStatus;
  /** 핸드폰번호 */
  phone?: string;
  /** 이메일 */
  email?: string;
  /** 접근 허용 IP 목록 (JSON 배열 문자열) */
  allowedIps?: string;
}

/**
 * 사용자 수정 요청 DTO
 */
export interface UserUpdateDatas {
  /** 사용자명 (이름) */
  username: string;
  /** 계정 (로그인 ID) */
  userAccount: string;
  /** 사용자 설명 */
  description?: string;
  /** 역할 ID */
  roleId?: number;
  /** 계정 상태 (ACTIVE/DORMANT/DISABLED) */
  accountStatus?: AccountStatus;
  /** 비밀번호 변경 강제 여부 */
  forcePasswordChange?: boolean;
  /** 핸드폰번호 */
  phone?: string;
  /** 이메일 */
  email?: string;
  /** 접근 허용 IP 목록 (JSON 배열 문자열) */
  allowedIps?: string;
}

/**
 * 사용자 검색 파라미터
 */
export interface UserSearchParams {
  tenantId?: number;
  username?: string;
  accountStatus?: AccountStatus;
  page?: number;
  size?: number;
}

/**
 * 비밀번호 변경 요청 데이터
 */
export interface PasswordChangeDatas {
  newPassword: string;
}
