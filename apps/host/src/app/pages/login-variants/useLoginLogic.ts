import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Form } from 'antd';
import type { AxiosError } from 'axios';
import { toast } from '@/shared-util';
import { authApi } from '../../features/auth/api/authApi';
import { useChangePassword, useLogin } from '../../features/auth/hooks/useAuthQueries';
import type { LoginErrorResponse, LoginResponse, PasswordPolicy } from '../../features/auth/types/auth';
import type { ChangePasswordDialogRef, ChangePasswordMode } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

/**
 * Account lock state
 */
export interface LockState {
  isLocked: boolean;
  retryAfterSeconds: number;
}

/**
 * Login error state
 */
export interface LoginErrorState {
  error: LoginErrorResponse['error'] | null;
  message: string;
  remainingAttempts?: number;
}

/**
 * Login form values
 */
export interface LoginFormValues {
  userId: string;
  password: string;
  tenantName?: string;
  rememberMe?: boolean;
}

/**
 * Custom hook that encapsulates all login page logic
 * Shared across all login page design variants
 */
export function useLoginLogic() {
  const navigate = useNavigate();
  const [form] = Form.useForm<LoginFormValues>();
  const { modal } = App.useApp();
  const changePasswordDialogRef = useRef<ChangePasswordDialogRef>(null);
  const [pendingLoginResponse, setPendingLoginResponse] = useState<LoginResponse | null>(null);
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy | undefined>(undefined);
  const [pendingResetToken, setPendingResetToken] = useState<string | undefined>(undefined);

  // Account lock state
  const [lockState, setLockState] = useState<LockState>({ isLocked: false, retryAfterSeconds: 0 });

  // Login error state
  const [loginError, setLoginError] = useState<LoginErrorState>({ error: null, message: '' });

  // Countdown timer for account lock
  useEffect(() => {
    if (lockState.retryAfterSeconds > 0) {
      const timer = setInterval(() => {
        setLockState((prev) => {
          const newSeconds = prev.retryAfterSeconds - 1;
          if (newSeconds <= 0) {
            return { isLocked: false, retryAfterSeconds: 0 };
          }
          return { ...prev, retryAfterSeconds: newSeconds };
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockState.retryAfterSeconds]);

  const { mutate: changePassword } = useChangePassword({
    mutationOptions: {
      onSuccess: async () => {
        // Reset Token 기반이 아닌 경우에만 로그아웃
        if (!pendingResetToken) {
          try {
            await authApi.logout();
          } catch (error) {
            Log.warn('Logout after password change failed:', error);
          }
        }

        // 상태 초기화
        setPendingLoginResponse(null);
        setPasswordPolicy(undefined);
        setPendingResetToken(undefined);
        form.resetFields();

        // 안내 메시지 표시
        toast.success('비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해주세요.');
      },
      onError: () => {
        toast.error('비밀번호 변경에 실패했습니다.');
      },
    },
  });

  const { mutate: login, isPending } = useLogin({
    mutationOptions: {
      onSuccess: async (response: LoginResponse) => {
        // Clear any previous errors
        setLoginError({ error: null, message: '' });

        // 비밀번호 곧 만료 예정 체크 (forcePasswordChange/passwordExpired는 이제 401 + PASSWORD_CHANGE_REQUIRED 에러로 처리됨)
        if (response.passwordExpiringSoon && response.daysUntilExpiration !== null) {
          // Password expiring soon - show confirmation modal
          setPendingLoginResponse(response);

          // Load password policy for the dialog
          if (response.tenantId) {
            try {
              const policy = await authApi.getPasswordPolicy(response.tenantId);
              setPasswordPolicy(policy);
            } catch (error) {
              Log.warn('Failed to load password policy:', error);
            }
          }

          modal.confirm({
            title: '비밀번호 만료 예정',
            content: `비밀번호가 ${response.daysUntilExpiration}일 후 만료됩니다. 지금 변경하시겠습니까?`,
            okText: '지금 변경',
            cancelText: '나중에',
            centered: true,
            onOk: () => {
              changePasswordDialogRef.current?.open({
                mode: 'manual',
                userId: form.getFieldValue('userId'),
              });
            },
            onCancel: () => {
              navigate('/');
            },
          });
        } else {
          // Normal login - navigate to main page
          navigate('/');
        }
      },
      onError: async (error: Error) => {
        const axiosError = error as AxiosError<{ ok: boolean; code: string; message: string; data: LoginErrorResponse }>;
        const apiResponse = axiosError.response?.data;

        if (!apiResponse) {
          setLoginError({ error: null, message: '로그인에 실패했습니다. 다시 시도해주세요.' });
          return;
        }

        // BFF ApiResponse의 data 필드에서 OAuth2 에러 정보 추출
        const errorData = apiResponse.data;
        if (!errorData?.error) {
          setLoginError({ error: null, message: apiResponse.message || '로그인에 실패했습니다.' });
          return;
        }

        // password_change_required 처리
        if (errorData.error === 'password_change_required') {
          Log.info('[login] Password change required:', errorData);

          // Password Reset Token 저장
          if (errorData.passwordResetToken) {
            setPendingResetToken(errorData.passwordResetToken);
            Log.debug('[login] Password reset token received');
          }

          // 비밀번호 정책 로드
          if (errorData.tenantId) {
            try {
              const policy = await authApi.getPasswordPolicy(errorData.tenantId);
              setPasswordPolicy(policy);
              Log.info('Password policy loaded for tenant:', errorData.tenantId, policy);
            } catch (policyError) {
              Log.warn('Failed to load password policy, using defaults:', policyError);
            }
          }

          // pendingLoginResponse 설정
          setPendingLoginResponse({
            username: '',
            userId: errorData.userId,
            tenantId: errorData.tenantId,
            forcePasswordChange: true,
            passwordExpired: errorData.passwordExpired,
            passwordExpiringSoon: false,
            daysUntilExpiration: errorData.daysUntilExpiration,
          });

          // 비밀번호 변경 다이얼로그 열기
          const mode: ChangePasswordMode = errorData.passwordExpired ? 'expired' : 'first-login';
          changePasswordDialogRef.current?.open({
            mode,
            userId: errorData.userAccount,
            passwordResetToken: errorData.passwordResetToken,
          });
          return;
        }

        switch (errorData.error) {
          case 'account_locked':
            setLockState({
              isLocked: true,
              retryAfterSeconds: errorData.retry_after ?? 0,
            });
            setLoginError({ error: 'account_locked', message: '' });
            break;

          case 'account_dormant':
            setLoginError({
              error: 'account_dormant',
              message: errorData.error_description ?? '휴면 계정입니다. 관리자에게 문의하세요.',
            });
            break;

          case 'account_disabled':
            setLoginError({
              error: 'account_disabled',
              message: errorData.error_description ?? '비활성화된 계정입니다. 관리자에게 문의하세요.',
            });
            break;

          case 'invalid_grant':
            setLoginError({
              error: 'invalid_grant',
              message: '아이디 또는 비밀번호가 올바르지 않습니다.',
              remainingAttempts: errorData.remaining_attempts,
            });
            break;

          default:
            setLoginError({
              error: null,
              message: errorData.error_description ?? '로그인에 실패했습니다.',
            });
        }
      },
    },
  });

  const onFinish = (values: LoginFormValues) => {
    // Clear previous errors
    setLoginError({ error: null, message: '' });

    // Prevent login if account is locked
    if (lockState.isLocked) {
      return;
    }

    login({ userAccount: values.userId, password: values.password });
  };

  const onFinishFailed = (errorInfo: unknown) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  /**
   * Handle password change
   * - Reset Token이 있으면 resetPassword API 사용 (세션 없이 비밀번호 변경)
   * - Reset Token이 없으면 기존 changePassword API 사용 (세션 기반)
   */
  const handlePasswordChange = async (data: { currentPassword?: string; newPassword: string; passwordResetToken?: string }) => {
    // Reset Token 기반 비밀번호 변경
    if (data.passwordResetToken) {
      Log.info('[handlePasswordChange] Using reset token');
      try {
        const response = await authApi.resetPassword({
          passwordResetToken: data.passwordResetToken,
          newPassword: data.newPassword,
        });
        Log.info('[handlePasswordChange] Reset password success:', response.message);

        // 상태 초기화
        setPendingLoginResponse(null);
        setPasswordPolicy(undefined);
        setPendingResetToken(undefined);
        form.resetFields();

        // 안내 메시지 표시
        toast.success('비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해주세요.');
      } catch (error) {
        Log.error('[handlePasswordChange] Reset password failed:', error);
        toast.error('비밀번호 변경에 실패했습니다.');
        throw error;
      }
      return;
    }

    // 기존 방식 (세션 기반)
    if (!pendingLoginResponse?.userId) {
      throw new Error('사용자 정보를 찾을 수 없습니다.');
    }

    changePassword({
      userId: pendingLoginResponse.userId,
      data: { newPassword: data.newPassword },
    });
  };

  /**
   * Format seconds to mm:ss
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    form,
    lockState,
    loginError,
    isPending,
    passwordPolicy,
    changePasswordDialogRef,
    onFinish,
    onFinishFailed,
    handlePasswordChange,
    formatTime,
  };
}
