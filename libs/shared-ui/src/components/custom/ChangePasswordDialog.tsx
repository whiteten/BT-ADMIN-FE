/**
 * 비밀번호 변경 Dialog 컴포넌트
 * - shadcn Dialog + forwardRef 패턴
 * - 메인 화면, 로그인 화면에서 재사용 가능
 * - 3가지 모드 지원: manual, first-login, expired
 */

import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { Button, Form, Input } from 'antd';
import { AlertCircle, KeyRound, Lock, ShieldCheck } from 'lucide-react';
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

export const ChangePasswordDialog = forwardRef<ChangePasswordDialogRef, ChangePasswordDialogProps>(function ChangePasswordDialog(
  { policy = DEFAULT_POLICY, onPasswordChange, onSuccess, onError, onClose, className },
  ref,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ChangePasswordMode>('manual');
  const [userId, setUserId] = useState<string | undefined>();
  const [passwordResetToken, setPasswordResetToken] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [form] = Form.useForm<FormData>();

  const config = MODE_CONFIG[mode];

  // ref 인터페이스 노출
  useImperativeHandle(
    ref,
    () => ({
      open: (params: ChangePasswordDialogOpenParams) => {
        // DEBUG: 전달받은 passwordResetToken 확인
        console.log('[ChangePasswordDialog] open - params.passwordResetToken:', params.passwordResetToken);

        setMode(params.mode);
        setUserId(params.userId);
        setPasswordResetToken(params.passwordResetToken);
        setNewPassword('');
        form.resetFields();
        setIsOpen(true);
      },
      close: () => {
        setIsOpen(false);
        setNewPassword('');
        setPasswordResetToken(undefined);
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
          {/* 알림 메시지 */}
          {config.alertType && (
            <Alert variant={config.alertType === 'warning' ? 'destructive' : 'default'} className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{config.alertType === 'warning' ? '주의' : '안내'}</AlertTitle>
              <AlertDescription>{config.alertMessage}</AlertDescription>
            </Alert>
          )}

          <Form form={form} layout="vertical" autoComplete="off" requiredMark={false}>
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
          </Form>
        </div>

        <DialogFooter className="gap-2">
          {config.showCancelButton && (
            <Button size="large" onClick={handleClose} disabled={isLoading}>
              취소
            </Button>
          )}
          <Button type="primary" size="large" onClick={handleSubmit} loading={isLoading}>
            비밀번호 변경
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
