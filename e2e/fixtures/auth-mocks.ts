/**
 * 로그인 응답 Mock 데이터
 * OAuth2 스타일 에러 응답 및 성공 응답
 */

export interface LoginResponse {
  username: string;
  userId: number;
  tenantId: string | null;
  forcePasswordChange: boolean;
  passwordExpired: boolean;
  passwordExpiringSoon: boolean;
  daysUntilExpiration: number | null;
}

export interface LoginErrorResponse {
  error: 'invalid_request' | 'invalid_grant' | 'account_locked' | 'account_dormant' | 'account_disabled' | 'tenant_required';
  error_description?: string;
  remaining_attempts?: number;
  retry_after?: number;
}

// 정상 로그인 성공
export const mockLoginSuccess: LoginResponse = {
  username: 'admin',
  userId: 1,
  tenantId: 'tenant-001',
  forcePasswordChange: false,
  passwordExpired: false,
  passwordExpiringSoon: false,
  daysUntilExpiration: null,
};

// 계정 잠금 (5분 카운트다운)
export const mockLoginAccountLocked: LoginErrorResponse = {
  error: 'account_locked',
  error_description: '로그인 시도 횟수를 초과했습니다.',
  retry_after: 300, // 5분 = 300초
};

// 잘못된 비밀번호 (시도 횟수 많음 - 4회 남음)
export const mockLoginInvalidPasswordHigh: LoginErrorResponse = {
  error: 'invalid_grant',
  error_description: '아이디 또는 비밀번호가 올바르지 않습니다.',
  remaining_attempts: 4,
};

// 잘못된 비밀번호 (시도 횟수 적음 - 2회 남음, 경고 스타일)
export const mockLoginInvalidPasswordLow: LoginErrorResponse = {
  error: 'invalid_grant',
  error_description: '아이디 또는 비밀번호가 올바르지 않습니다.',
  remaining_attempts: 2,
};

// 휴면 계정
export const mockLoginDormant: LoginErrorResponse = {
  error: 'account_dormant',
  error_description: '90일 이상 미사용으로 휴면 계정 전환되었습니다.',
};

// 비활성화 계정
export const mockLoginDisabled: LoginErrorResponse = {
  error: 'account_disabled',
  error_description: '계정이 비활성화되었습니다. 관리자에게 문의하세요.',
};

// 비밀번호 만료 임박 (7일 남음)
export const mockLoginExpiringSoon: LoginResponse = {
  ...mockLoginSuccess,
  passwordExpiringSoon: true,
  daysUntilExpiration: 7,
};

// 최초 로그인 (비밀번호 변경 필요)
export const mockLoginFirstLogin: LoginResponse = {
  ...mockLoginSuccess,
  forcePasswordChange: true,
};

// 비밀번호 만료됨
export const mockLoginExpired: LoginResponse = {
  ...mockLoginSuccess,
  passwordExpired: true,
  daysUntilExpiration: 0,
};

// 멀티테넌트 사용자 - 테넌트 선택 필요
export const mockLoginTenantRequired: LoginErrorResponse = {
  error: 'tenant_required',
  error_description: '여러 테넌트에 속한 계정입니다. 테넌트를 선택해주세요.',
};

// 멀티테넌트 사용자 - 권한 없는 테넌트
export const mockLoginUnauthorizedTenant: LoginErrorResponse = {
  error: 'invalid_grant',
  error_description: '해당 테넌트에 접근 권한이 없습니다.',
};
