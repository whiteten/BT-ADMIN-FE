import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Checkbox, Form, type FormProps, Input } from 'antd';
import type { AxiosError } from 'axios';
import { Lock, User, Users } from 'lucide-react';
import { useAuthStore } from '@/shared-store';
import { toast } from '@/shared-util';
import styles from './Login.module.scss';
import { authApi } from '../features/auth/api/authApi';
import { useLogin, useResetPassword } from '../features/auth/hooks/useAuthQueries';
import type { LoginErrorResponse, LoginResponse, PasswordPolicy } from '../features/auth/types/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChangePasswordDialog, type ChangePasswordDialogRef, type ChangePasswordMode } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

/**
 * Account lock state
 */
interface LockState {
  retryAfterSeconds: number;
}

export default function Login() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const changePasswordDialogRef = useRef<ChangePasswordDialogRef>(null);
  const [pendingLoginResponse, setPendingLoginResponse] = useState<LoginResponse | null>(null);
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy | undefined>(undefined);
  const { setPasswordExpiringWarning } = useAuthStore();

  // Account lock state (isLocked is derived: retryAfterSeconds > 0)
  const [lockState, setLockState] = useState<LockState>({ retryAfterSeconds: 0 });
  const isLocked = lockState.retryAfterSeconds > 0;

  // Countdown timer for account lock
  useEffect(() => {
    if (lockState.retryAfterSeconds > 0) {
      const timer = setInterval(() => {
        setLockState((prev) => {
          const newSeconds = prev.retryAfterSeconds - 1;
          return { retryAfterSeconds: Math.max(newSeconds, 0) };
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockState.retryAfterSeconds]);

  const { mutate: resetPassword } = useResetPassword({
    mutationOptions: {
      onSuccess: () => {
        // 비밀번호 리셋은 pre-login 흐름이므로 logout 불필요
        // 상태 초기화 후 로그인 페이지에서 재로그인 유도
        setPendingLoginResponse(null);
        setPasswordPolicy(undefined);
        form.resetFields();

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
        // passwordExpiringSoon: 로그인 성공 + 스토어에 경고 저장 후 메인 화면 이동
        // (메인 화면에서 토스트 메시지 표시)
        // (forcePasswordChange, passwordExpired는 401 에러로 처리됨 - onError에서 핸들링)
        if (response.passwordExpiringSoon && response.daysUntilExpiration !== null) {
          // 스토어에 비밀번호 만료 경고 저장 (메인 페이지에서 토스트 표시용)
          setPasswordExpiringWarning({
            show: true,
            daysUntilExpiration: response.daysUntilExpiration,
          });
        }
        // Navigate to main page
        navigate('/');
      },
      onError: async (error: Error) => {
        const axiosError = error as AxiosError<{ ok: boolean; code: string; message: string; data: LoginErrorResponse }>;
        const apiResponse = axiosError.response?.data;

        if (!apiResponse) {
          toast.error('로그인에 실패했습니다. 다시 시도해주세요.');
          return;
        }

        // BFF ApiResponse의 data 필드에서 OAuth2 에러 정보 추출
        const errorData = apiResponse.data;
        if (!errorData?.error) {
          toast.error(apiResponse.message || '로그인에 실패했습니다.');
          return;
        }

        switch (errorData.error) {
          case 'password_change_required': {
            Log.info('[login] Password change required:', errorData);

            // 계정 정책 로드
            if (errorData.tenantId) {
              try {
                const policy = await authApi.getAccountPolicy(errorData.tenantId);
                setPasswordPolicy(policy);
                Log.info('Account policy loaded for tenant:', errorData.tenantId, policy);
              } catch (policyError) {
                Log.warn('Failed to load account policy, using defaults:', policyError);
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
              tokenExpiresAt: errorData.tokenExpiresAt,
            });
            return;
          }

          case 'invalid_grant': {
            const msg = errorData.error_description ?? '아이디 또는 비밀번호가 올바르지 않습니다.';
            const attempts = errorData.remaining_attempts;
            const toastMsg = attempts !== undefined ? `${msg} (남은 시도: ${attempts}회)` : msg;
            toast.error(toastMsg);
            break;
          }

          case 'account_locked':
            setLockState({ retryAfterSeconds: errorData.retry_after ?? 0 });
            toast.warning(errorData.error_description ?? '로그인 시도 횟수를 초과하여 계정이 일시적으로 잠겼습니다.', { autoClose: false });
            break;

          case 'tenant_required':
            toast.warning(errorData.error_description ?? '멀티테넌트 계정입니다. 테넌트를 입력해주세요.');
            break;

          case 'account_dormant':
            toast.error(errorData.error_description ?? '휴면 계정입니다. 관리자에게 문의하세요.');
            break;

          case 'account_disabled':
            toast.error(errorData.error_description ?? '비활성화된 계정입니다. 관리자에게 문의하세요.');
            break;

          case 'ip_not_allowed':
            toast.error(errorData.error_description ?? '허용되지 않은 IP 주소입니다. 관리자에게 문의하세요.');
            break;

          case 'concurrent_login_blocked':
            toast.warning(errorData.error_description ?? '다른 세션에서 이미 로그인되어 있습니다.');
            break;

          default:
            toast.error(errorData.error_description ?? '로그인에 실패했습니다.');
        }
      },
    },
  });

  const onFinish: FormProps<{ userId: string; password: string; tenant?: string }>['onFinish'] = (values) => {
    // Prevent login if account is locked
    if (isLocked) {
      return;
    }

    // V23: username → userAccount로 변경
    // tenant는 멀티테넌트 사용자만 입력 (단일 테넌트 사용자는 자동 선택됨)
    login({
      userAccount: values.userId,
      password: values.password,
      tenant: values.tenant || undefined,
    });
  };

  const onFinishFailed: FormProps<{ userId: string; password: string; tenant?: string }>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  /**
   * Handle password change
   * - first-login 모드: currentPassword 불필요 (토큰만으로 인증)
   * - expired 모드: currentPassword 필수 (현재 비밀번호 검증)
   */
  const handlePasswordChange = async (data: { currentPassword?: string; newPassword: string; passwordResetToken?: string }) => {
    if (!pendingLoginResponse?.userId) {
      throw new Error('사용자 정보를 찾을 수 없습니다.');
    }

    resetPassword({
      passwordResetToken: data.passwordResetToken ?? '',
      newPassword: data.newPassword,
      currentPassword: data.currentPassword,
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

  return (
    <div className="w-screen min-h-svh flex flex-col items-center justify-center gap-3 bg-[#f3f3f9]">
      <div
        className="absolute top-0 left-0 right-0 w-full h-[557px]"
        style={{
          background: 'url(/assets/images/login-bg.png) no-repeat 50% center',
          backgroundSize: 'cover',
          backgroundColor: '#f3f3f9',
        }}
      >
        <div className="absolute top-0 left-0 w-full h-full z-10" style={{ backgroundColor: '#1B28364D' }}></div>
        <div className="absolute bottom-0 left-0 w-full z-20">
          <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1440 120">
            <path fill="#f3f3f9" d="M 0,36 C 144,53.6 432,123.2 720,124 C 1008,124.8 1296,56.8 1440,40L1440 140L0 140z"></path>
          </svg>
        </div>
      </div>
      <div className="w-full h-full z-30 flex flex-col items-center justify-center relative">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Welcome</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles['login-wrapper']}>
              <Form form={form} layout="vertical" onFinish={onFinish} onFinishFailed={onFinishFailed} autoComplete="off">
                <Form.Item name="userId" label="아이디" rules={[{ required: true, message: '아이디를 입력해주세요' }]} className="!mb-4">
                  <Input size="large" placeholder="아이디" prefix={<User className="h-4 w-4 text-gray-400" />} disabled={isLocked} />
                </Form.Item>

                <Form.Item name="password" label="비밀번호" rules={[{ required: true, message: '비밀번호를 입력해주세요' }]} className="!mb-4">
                  <Input.Password size="large" placeholder="비밀번호" prefix={<Lock className="h-4 w-4 text-gray-400" />} disabled={isLocked} />
                </Form.Item>

                <Form.Item name="tenant" label="테넌트명" className="!mb-4">
                  <Input size="large" placeholder="테넌트명 (멀티테넌트 사용자만 입력)" prefix={<Users className="h-4 w-4 text-gray-400" />} disabled={isLocked} />
                </Form.Item>

                <Form.Item className="!mb-5">
                  <Checkbox disabled={isLocked}>로그인 정보 저장</Checkbox>
                </Form.Item>

                <Form.Item className="!mb-0">
                  <Button type="primary" size="large" htmlType="submit" loading={isPending} disabled={isLocked} block className="!bg-[var(--color-bt-primary)]">
                    {isLocked ? `잠금 해제까지 ${formatTime(lockState.retryAfterSeconds)}` : '로그인'}
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </CardContent>
        </Card>
        <div className="absolute bottom-[-30px] flex justify-center p-1 z-10">
          <img src="/assets/images/copyright.svg" alt="Copyright" />
        </div>
      </div>

      {/* Password change dialog */}
      <ChangePasswordDialog
        ref={changePasswordDialogRef}
        policy={passwordPolicy}
        onPasswordChange={handlePasswordChange}
        onSuccess={() => {
          // Handled in useResetPassword onSuccess
        }}
        onError={(error) => {
          Log.error('Password change failed:', error);
        }}
        onClose={() => {
          // 비밀번호 변경 다이얼로그 닫기 시 상태 초기화 (로그인 페이지로 돌아가기)
          setPendingLoginResponse(null);
          setPasswordPolicy(undefined);
          form.resetFields();
        }}
      />
    </div>
  );
}
