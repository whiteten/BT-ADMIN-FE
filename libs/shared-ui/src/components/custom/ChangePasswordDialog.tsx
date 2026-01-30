/**
 * 비밀번호 변경 Dialog 컴포넌트
 * - shadcn Dialog + forwardRef 패턴
 * - 메인 화면, 로그인 화면에서 재사용 가능
 * - 3가지 모드 지원: manual, first-login, expired
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Form, Input, Progress } from 'antd';
import { AlertCircle, Clock, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { type PasswordPolicy, PasswordStrengthMeter, isPasswordValid } from './PasswordStrengthMeter';
import { cn } from '../../lib/utils';
import { Alert, AlertDescription, AlertTitle } from '../shadcn/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog';

export type ChangePasswordMode = 'manual' | 'first-login' | 'expired';

export interface ChangePasswordData {
  currentPassword?: string;
  newPassword: string;
  passwordResetToken?: string;
}

export interface ChangePasswordDialogOpenParams {
  mode: ChangePasswordMode;
  userId?: string;
  passwordResetToken?: string;
  /** Password reset token 만료 시간 (epoch seconds) */
  tokenExpiresAt?: number;
}

export interface ChangePasswordDialogRef {
  open: (params: ChangePasswordDialogOpenParams) => void;
  close: () => void;
}

export interface ChangePasswordDialogProps {
  policy?: PasswordPolicy;
  onPasswordChange: (data: ChangePasswordData) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  className?: string;
}

interface FormData {
  currentPassword?: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * 기본 정책 값
 */
const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: false,
  requireLowercase: false,
  requireDigit: false,
  rejectConsecutiveChars: false,
  rejectRepeatedChars: false,
  rejectUserId: true,
};

/**
 * 모드별 설정
 */
const MODE_CONFIG = {
  manual: {
    title: '비밀번호 변경',
    description: '보안을 위해 정기적으로 비밀번호를 변경해주세요.',
    showCurrentPassword: true,
    showCancelButton: true,
    alertType: null as 'warning' | 'info' | null,
    alertMessage: '',
  },
  'first-login': {
    title: '최초 로그인 비밀번호 설정',
    description: '보안을 위해 비밀번호를 변경해야 합니다.',
    showCurrentPassword: false,
    showCancelButton: false,
    alertType: 'info' as const,
    alertMessage: '최초 로그인 시 비밀번호 변경이 필요합니다.',
  },
  expired: {
    title: '비밀번호 만료',
    description: '비밀번호가 만료되어 새로운 비밀번호로 변경해야 합니다.',
    showCurrentPassword: true,
    showCancelButton: false,
    alertType: 'warning' as const,
    alertMessage: '비밀번호가 만료되었습니다. 새 비밀번호를 설정해주세요.',
  },
};

/** 토큰 만료 상수 (초) */
const TOKEN_TTL_SECONDS = 300; // 5분

export const ChangePasswordDialog = forwardRef<ChangePasswordDialogRef, ChangePasswordDialogProps>(function ChangePasswordDialog(
  { policy = DEFAULT_POLICY, onPasswordChange, onSuccess, onError, onClose, className },
  ref,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ChangePasswordMode>('manual');
  const [userId, setUserId] = useState<string | undefined>();
  const [passwordResetToken, setPasswordResetToken] = useState<string | undefined>();
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | undefined>();
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isTokenExpired, setIsTokenExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [form] = Form.useForm<FormData>();

  const config = MODE_CONFIG[mode];

  // 토큰 만료 카운트다운 타이머
  useEffect(() => {
    if (!isOpen || !tokenExpiresAt || mode === 'manual') {
      return;
    }

    const updateRemainingTime = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = tokenExpiresAt - now;

      if (remaining <= 0) {
        setRemainingSeconds(0);
        setIsTokenExpired(true);
      } else {
        setRemainingSeconds(remaining);
        setIsTokenExpired(false);
      }
    };

    // 초기 계산
    updateRemainingTime();

    // 1초마다 업데이트
    const timer = setInterval(updateRemainingTime, 1000);

    return () => clearInterval(timer);
  }, [isOpen, tokenExpiresAt, mode]);

  /**
   * 남은 시간을 mm:ss 형식으로 포맷
   */
  const formatRemainingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * 토큰 만료 진행률 계산 (100% → 0%)
   */
  const getTokenProgressPercent = (): number => {
    if (!tokenExpiresAt) return 100;
    return Math.max(0, Math.round((remainingSeconds / TOKEN_TTL_SECONDS) * 100));
  };

  /**
   * 진행률에 따른 색상 결정
   */
  const getProgressStatus = (): 'success' | 'normal' | 'exception' => {
    const percent = getTokenProgressPercent();
    if (percent <= 20) return 'exception'; // 빨간색 (1분 미만)
    if (percent <= 40) return 'normal'; // 파란색 (2분 미만)
    return 'success'; // 초록색
  };

  // ref 인터페이스 노출
  useImperativeHandle(
    ref,
    () => ({
      open: (params: ChangePasswordDialogOpenParams) => {
        // DEBUG: 전달받은 passwordResetToken 확인
        console.log('[ChangePasswordDialog] open - params.passwordResetToken:', params.passwordResetToken);
        console.log('[ChangePasswordDialog] open - params.tokenExpiresAt:', params.tokenExpiresAt);

        setMode(params.mode);
        setUserId(params.userId);
        setPasswordResetToken(params.passwordResetToken);
        setTokenExpiresAt(params.tokenExpiresAt);
        setIsTokenExpired(false);
        setNewPassword('');
        form.resetFields();
        setIsOpen(true);
      },
      close: () => {
        setIsOpen(false);
        setNewPassword('');
        setPasswordResetToken(undefined);
        setTokenExpiresAt(undefined);
        setIsTokenExpired(false);
        setRemainingSeconds(0);
        form.resetFields();
      },
    }),
    [form],
  );

  // Dialog 닫기 핸들러
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setNewPassword('');
    setPasswordResetToken(undefined);
    setTokenExpiresAt(undefined);
    setIsTokenExpired(false);
    setRemainingSeconds(0);
    form.resetFields();

    // 강제 변경 모드에서는 onClose 콜백 호출 (로그인 페이지로 돌아가기 등)
    if (!config.showCancelButton) {
      onClose?.();
    }
  }, [config.showCancelButton, form, onClose]);

  // 폼 제출 핸들러
  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setIsLoading(true);

      // DEBUG: passwordResetToken 값 확인
      console.log('[ChangePasswordDialog] handleSubmit - passwordResetToken:', passwordResetToken);

      await onPasswordChange({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        passwordResetToken,
      });

      setIsOpen(false);
      setNewPassword('');
      setPasswordResetToken(undefined);
      setTokenExpiresAt(undefined);
      setIsTokenExpired(false);
      setRemainingSeconds(0);
      form.resetFields();
      onSuccess?.();
    } catch (error) {
      if (error instanceof Error) {
        onError?.(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [form, onPasswordChange, onSuccess, onError, passwordResetToken]);

  // 새 비밀번호 변경 감지
  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPassword(e.target.value);
  };

  // 백드롭 클릭 시 닫기 방지
  const handlePointerDownOutside = useCallback((e: CustomEvent) => {
    e.preventDefault();
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className={cn('sm:max-w-[480px]', className)} showCloseButton={true} onPointerDownOutside={handlePointerDownOutside}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-blue-600" />
            {config.title}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {/* 토큰 만료 시 안내 메시지 */}
          {isTokenExpired && mode !== 'manual' && (
            <Alert variant="destructive" className="mb-4">
              <Clock className="h-4 w-4" />
              <AlertTitle>세션 만료</AlertTitle>
              <AlertDescription>
                비밀번호 변경 시간이 만료되었습니다.
                <br />
                보안을 위해 처음부터 다시 로그인해 주세요.
              </AlertDescription>
            </Alert>
          )}

          {/* 토큰 만료 카운트다운 (만료 전) */}
          {!isTokenExpired && tokenExpiresAt && mode !== 'manual' && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>남은 시간</span>
                </div>
                <span
                  className={cn('text-lg font-semibold tabular-nums', remainingSeconds <= 60 ? 'text-red-600' : remainingSeconds <= 120 ? 'text-yellow-600' : 'text-green-600')}
                >
                  {formatRemainingTime(remainingSeconds)}
                </span>
              </div>
              <Progress percent={getTokenProgressPercent()} status={getProgressStatus()} showInfo={false} size="small" />
            </div>
          )}

          {/* 알림 메시지 */}
          {config.alertType && !isTokenExpired && (
            <Alert variant={config.alertType === 'warning' ? 'destructive' : 'default'} className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{config.alertType === 'warning' ? '주의' : '안내'}</AlertTitle>
              <AlertDescription>{config.alertMessage}</AlertDescription>
            </Alert>
          )}

          <Form form={form} layout="vertical" autoComplete="off" requiredMark={false}>
            {/* 토큰 만료 시 폼 숨김 */}
            {isTokenExpired && mode !== 'manual' ? null : (
              <>
                {/* 현재 비밀번호 (manual, expired 모드) */}
                {config.showCurrentPassword && (
                  <Form.Item name="currentPassword" label="현재 비밀번호" rules={[{ required: true, message: '현재 비밀번호를 입력해주세요' }]} className="!mb-4">
                    <Input.Password
                      size="large"
                      placeholder="현재 비밀번호 입력"
                      prefix={<Lock className="h-4 w-4 text-gray-400" />}
                      autoComplete="current-password"
                      disabled={isLoading}
                    />
                  </Form.Item>
                )}

                {/* 새 비밀번호 */}
                <Form.Item
                  name="newPassword"
                  label="새 비밀번호"
                  rules={[
                    { required: true, message: '새 비밀번호를 입력해주세요' },
                    { min: policy.minLength, message: `최소 ${policy.minLength}자 이상 입력해주세요` },
                    { max: policy.maxLength, message: `최대 ${policy.maxLength}자까지 입력 가능합니다` },
                    {
                      validator: (_, value) => {
                        if (!value) return Promise.resolve();
                        if (!isPasswordValid(value, policy, userId)) {
                          return Promise.reject(new Error('비밀번호가 정책을 충족하지 않습니다'));
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                  className="!mb-2"
                >
                  <Input.Password
                    size="large"
                    placeholder="새 비밀번호 입력"
                    prefix={<KeyRound className="h-4 w-4 text-gray-400" />}
                    autoComplete="new-password"
                    disabled={isLoading}
                    onChange={handleNewPasswordChange}
                  />
                </Form.Item>

                {/* 비밀번호 강도 표시 */}
                <div className="mb-4">
                  <PasswordStrengthMeter password={newPassword} policy={policy} userId={userId} showChecklist={true} />
                </div>

                {/* 비밀번호 확인 */}
                <Form.Item
                  name="confirmPassword"
                  label="비밀번호 확인"
                  dependencies={['newPassword']}
                  rules={[
                    { required: true, message: '비밀번호를 다시 입력해주세요' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('newPassword') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('비밀번호가 일치하지 않습니다'));
                      },
                    }),
                  ]}
                  className="!mb-0"
                >
                  <Input.Password
                    size="large"
                    placeholder="새 비밀번호 다시 입력"
                    prefix={<ShieldCheck className="h-4 w-4 text-gray-400" />}
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                </Form.Item>
              </>
            )}
          </Form>
        </div>

        <DialogFooter className="gap-2">
          {/* 토큰 만료 시: 로그인으로 돌아가기 버튼만 표시 */}
          {isTokenExpired && mode !== 'manual' ? (
            <Button type="primary" size="large" onClick={handleClose}>
              로그인으로 돌아가기
            </Button>
          ) : (
            <>
              {config.showCancelButton && (
                <Button size="large" onClick={handleClose} disabled={isLoading}>
                  취소
                </Button>
              )}
              <Button type="primary" size="large" onClick={handleSubmit} loading={isLoading}>
                비밀번호 변경
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
