import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Button, Checkbox, Form, type FormProps, Input } from 'antd';
import type { AxiosError } from 'axios';
import { Lock, LockKeyhole, Timer, User, Users } from 'lucide-react';
import { toast } from '@/shared-util';
import styles from './Login.module.scss';
import { authApi } from '../features/auth/api/authApi';
import { useChangePassword, useLogin } from '../features/auth/hooks/useAuthQueries';
import type { LoginErrorResponse, LoginResponse, PasswordPolicy } from '../features/auth/types/auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog, type ChangePasswordDialogRef, type ChangePasswordMode } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

/**
 * Account lock state
 */
interface LockState {
  isLocked: boolean;
  retryAfterSeconds: number;
}

/**
 * Login error state
 */
interface LoginErrorState {
  error: LoginErrorResponse['error'] | null;
  message: string;
  remainingAttempts?: number;
}

export default function Login() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { modal } = App.useApp();
  const changePasswordDialogRef = useRef<ChangePasswordDialogRef>(null);
  const [pendingLoginResponse, setPendingLoginResponse] = useState<LoginResponse | null>(null);
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy | undefined>(undefined);

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
        try {
          // 비밀번호 변경 후 강제 로그아웃
          await authApi.logout();
        } catch (error) {
          Log.warn('Logout after password change failed:', error);
        }

        // 상태 초기화
        setPendingLoginResponse(null);
        setPasswordPolicy(undefined);
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

        // Check forcePasswordChange or passwordExpired
        if (response.forcePasswordChange || response.passwordExpired) {
          setPendingLoginResponse(response);

          // Load password policy for tenant
          if (response.tenantId) {
            try {
              const policy = await authApi.getPasswordPolicy(response.tenantId);
              setPasswordPolicy(policy);
              Log.info('Password policy loaded for tenant:', response.tenantId, policy);
            } catch (error) {
              Log.warn('Failed to load password policy, using defaults:', error);
            }
          } else {
            Log.warn('No tenantId in login response, using default password policy');
          }

          // Open password change dialog
          const mode: ChangePasswordMode = response.passwordExpired ? 'expired' : 'first-login';
          changePasswordDialogRef.current?.open({
            mode,
            userId: form.getFieldValue('userId'),
          });
        } else if (response.passwordExpiringSoon && response.daysUntilExpiration !== null) {
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
            icon: <Timer className="h-6 w-6 text-yellow-500 mr-2" />,
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
      onError: (error: Error) => {
        const axiosError = error as AxiosError<LoginErrorResponse>;
        const errorData = axiosError.response?.data;

        if (!errorData) {
          setLoginError({ error: null, message: '로그인에 실패했습니다. 다시 시도해주세요.' });
          return;
        }

        switch (errorData.error) {
          case 'account_locked':
            setLockState({
              isLocked: true,
              retryAfterSeconds: errorData.retry_after || 0,
            });
            setLoginError({ error: 'account_locked', message: '' });
            break;

          case 'account_dormant':
            setLoginError({
              error: 'account_dormant',
              message: errorData.error_description || '휴면 계정입니다. 관리자에게 문의하세요.',
            });
            break;

          case 'account_disabled':
            setLoginError({
              error: 'account_disabled',
              message: errorData.error_description || '비활성화된 계정입니다. 관리자에게 문의하세요.',
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
              message: errorData.error_description || '로그인에 실패했습니다.',
            });
        }
      },
    },
  });

  const onFinish: FormProps<{ userId: string; password: string }>['onFinish'] = (values) => {
    // Clear previous errors
    setLoginError({ error: null, message: '' });

    // Prevent login if account is locked
    if (lockState.isLocked) {
      return;
    }

    // V23: username → userAccount로 변경
    login({ userAccount: values.userId, password: values.password });
  };

  const onFinishFailed: FormProps<{ userId: string; password: string }>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  /**
   * Handle password change
   */
  const handlePasswordChange = async (data: { currentPassword?: string; newPassword: string }) => {
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

  /**
   * Render login error alert
   */
  const renderErrorAlert = () => {
    // Account locked state
    if (lockState.isLocked) {
      return (
        <Alert variant="destructive" className="mb-4">
          <LockKeyhole className="h-4 w-4" />
          <AlertTitle>계정 잠금</AlertTitle>
          <AlertDescription>
            로그인 시도 횟수를 초과하여 계정이 일시적으로 잠겼습니다.
            <div className="mt-2 text-lg font-semibold">{formatTime(lockState.retryAfterSeconds)} 후 다시 시도해주세요.</div>
          </AlertDescription>
        </Alert>
      );
    }

    // Dormant account
    if (loginError.error === 'account_dormant') {
      return (
        <Alert variant="destructive" className="mb-4">
          <User className="h-4 w-4" />
          <AlertTitle>휴면 계정</AlertTitle>
          <AlertDescription>{loginError.message}</AlertDescription>
        </Alert>
      );
    }

    // Disabled account
    if (loginError.error === 'account_disabled') {
      return (
        <Alert variant="destructive" className="mb-4">
          <User className="h-4 w-4" />
          <AlertTitle>비활성화 계정</AlertTitle>
          <AlertDescription>{loginError.message}</AlertDescription>
        </Alert>
      );
    }

    // Invalid credentials with remaining attempts warning
    if (loginError.error === 'invalid_grant') {
      const showWarning = loginError.remainingAttempts !== undefined && loginError.remainingAttempts <= 2;
      return (
        <Alert variant={showWarning ? 'destructive' : 'default'} className="mb-4">
          <Lock className="h-4 w-4" />
          <AlertTitle>로그인 실패</AlertTitle>
          <AlertDescription>
            {loginError.message}
            {loginError.remainingAttempts !== undefined && <div className={cn('mt-1', showWarning && 'font-semibold')}>남은 시도 횟수: {loginError.remainingAttempts}회</div>}
          </AlertDescription>
        </Alert>
      );
    }

    // Generic error
    if (loginError.message) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{loginError.message}</AlertDescription>
        </Alert>
      );
    }

    return null;
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
            <div className={cn('w-full', styles['login-wrapper'])}>
              {/* Error alerts */}
              {renderErrorAlert()}

              <Form form={form} layout="vertical" onFinish={onFinish} onFinishFailed={onFinishFailed} autoComplete="off" initialValues={{ userId: 'admin', password: 'admin1234' }}>
                <Form.Item name="userId" label="아이디" rules={[{ required: true, message: '아이디를 입력해주세요' }]} className="!mb-4">
                  <Input size="large" placeholder="아이디" prefix={<User className="h-4 w-4 text-gray-400" />} disabled={lockState.isLocked} />
                </Form.Item>

                <Form.Item name="password" label="비밀번호" rules={[{ required: true, message: '비밀번호를 입력해주세요' }]} className="!mb-4">
                  <Input.Password size="large" placeholder="비밀번호" prefix={<Lock className="h-4 w-4 text-gray-400" />} disabled={lockState.isLocked} />
                </Form.Item>

                <Form.Item label="테넌트명" className="!mb-4">
                  <Input size="large" placeholder="테넌트명" prefix={<Users className="h-4 w-4 text-gray-400" />} disabled={lockState.isLocked} />
                </Form.Item>

                <Form.Item className="!mb-5">
                  <Checkbox disabled={lockState.isLocked}>로그인 정보 저장</Checkbox>
                </Form.Item>

                <Form.Item className="!mb-0">
                  <Button type="primary" size="large" htmlType="submit" loading={isPending} disabled={lockState.isLocked} block className="!bg-[var(--color-bt-primary)]">
                    {lockState.isLocked ? `잠금 해제까지 ${formatTime(lockState.retryAfterSeconds)}` : '로그인'}
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
          // Handled in useChangePassword onSuccess
        }}
        onError={(error) => {
          Log.error('Password change failed:', error);
        }}
      />
    </div>
  );
}
