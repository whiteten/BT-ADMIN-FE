/**
 * 로그인 페이지 - 모던 미니멀 버전
 * Swiss Design / Neo-Brutalist Minimal 스타일
 * 극도로 절제된 디자인, 타이포그래피 중심, 블루 포인트 컬러
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { Lock, LockKeyhole, User, Users } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

export default function LoginMinimal() {
  const { form, lockState, loginError, isPending, passwordPolicy, changePasswordDialogRef, onFinish, onFinishFailed, handlePasswordChange, formatTime } = useLoginLogic();

  /**
   * Render login error alert - Minimal style
   */
  const renderErrorAlert = () => {
    if (lockState.isLocked) {
      return (
        <div className="mb-6 p-4 border-l-2 border-red-500 bg-red-50/50">
          <div className="flex items-center gap-2 text-red-600 font-medium text-sm tracking-wide uppercase">
            <LockKeyhole className="h-4 w-4" />
            Account Locked
          </div>
          <p className="mt-1 text-red-600/80 text-sm">로그인 시도 횟수를 초과했습니다.</p>
          <div className="mt-2 text-2xl font-light text-red-600 tabular-nums">{formatTime(lockState.retryAfterSeconds)}</div>
        </div>
      );
    }

    if (loginError.error === 'account_dormant') {
      return (
        <div className="mb-6 p-4 border-l-2 border-amber-500 bg-amber-50/50">
          <div className="flex items-center gap-2 text-amber-700 font-medium text-sm tracking-wide uppercase">
            <User className="h-4 w-4" />
            휴면 계정
          </div>
          <p className="mt-1 text-amber-600/80 text-sm">{loginError.message}</p>
        </div>
      );
    }

    if (loginError.error === 'account_disabled') {
      return (
        <div className="mb-6 p-4 border-l-2 border-gray-400 bg-gray-50">
          <div className="flex items-center gap-2 text-gray-600 font-medium text-sm tracking-wide uppercase">
            <User className="h-4 w-4" />
            비활성화 계정
          </div>
          <p className="mt-1 text-gray-500 text-sm">{loginError.message}</p>
        </div>
      );
    }

    if (loginError.error === 'invalid_grant') {
      const showWarning = loginError.remainingAttempts !== undefined && loginError.remainingAttempts <= 2;
      return (
        <div className={cn('mb-6 p-4 border-l-2', showWarning ? 'border-red-500 bg-red-50/50' : 'border-gray-300 bg-gray-50/50')}>
          <div className={cn('flex items-center gap-2 font-medium text-sm tracking-wide uppercase', showWarning ? 'text-red-600' : 'text-gray-600')}>
            <Lock className="h-4 w-4" />
            Login Failed
          </div>
          <p className={cn('mt-1 text-sm', showWarning ? 'text-red-600/80' : 'text-gray-500')}>{loginError.message}</p>
          {loginError.remainingAttempts !== undefined && (
            <p className={cn('mt-2 text-xs font-medium', showWarning && 'text-red-600')}>남은 시도: {loginError.remainingAttempts}회</p>
          )}
        </div>
      );
    }

    if (loginError.message) {
      return (
        <div className="mb-6 p-4 border-l-2 border-red-500 bg-red-50/50">
          <p className="text-red-600/80 text-sm">{loginError.message}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] flex items-center justify-center p-8">
      {/* Subtle grid background */}
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #000 1px, transparent 1px),
            linear-gradient(to bottom, #000 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Main container */}
      <div className="relative z-10 flex items-stretch">
        {/* Left decorative bar */}
        <div className="hidden md:flex flex-col items-center justify-between py-8 px-6 bg-[var(--color-bt-primary)]">
          {/* Vertical text */}
          <div className="text-white text-xs font-medium tracking-[0.3em] uppercase" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>
            NLU Bot Admin
          </div>

          {/* Geometric decoration */}
          <div className="flex flex-col gap-2">
            <div className="w-2 h-2 bg-white/30" />
            <div className="w-2 h-8 bg-white/50" />
            <div className="w-2 h-2 bg-white" />
          </div>

          {/* Year */}
          <div className="text-white/60 text-xs font-light tracking-wider">2025</div>
        </div>

        {/* Login card */}
        <div className="w-full max-w-md bg-white border border-gray-200 shadow-sm">
          {/* Header */}
          <div className="px-10 pt-12 pb-8 border-b border-gray-100">
            <h1 className="text-3xl font-light text-gray-900 tracking-tight">Welcome</h1>
            <p className="mt-2 text-sm text-gray-400 font-light">Sign in to your account</p>
          </div>

          {/* Form */}
          <div className="px-10 py-10">
            {renderErrorAlert()}

            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              onFinishFailed={onFinishFailed}
              autoComplete="off"
              initialValues={{ userId: 'admin', password: 'admin1234' }}
              requiredMark={false}
            >
              <Form.Item
                name="userId"
                label={<span className="text-xs font-medium text-gray-500 tracking-wider uppercase">아이디</span>}
                rules={[{ required: true, message: '아이디를 입력해주세요' }]}
                className="!mb-6"
              >
                <Input
                  size="large"
                  placeholder="Enter your ID"
                  prefix={<User className="h-4 w-4 text-gray-300" />}
                  disabled={lockState.isLocked}
                  className="!rounded-none !border-gray-200 hover:!border-[var(--color-bt-primary)] focus:!border-[var(--color-bt-primary)] !shadow-none"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span className="text-xs font-medium text-gray-500 tracking-wider uppercase">비밀번호</span>}
                rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
                className="!mb-6"
              >
                <Input.Password
                  size="large"
                  placeholder="Enter your password"
                  prefix={<Lock className="h-4 w-4 text-gray-300" />}
                  disabled={lockState.isLocked}
                  className="!rounded-none !border-gray-200 hover:!border-[var(--color-bt-primary)] focus:!border-[var(--color-bt-primary)] !shadow-none"
                />
              </Form.Item>

              <Form.Item label={<span className="text-xs font-medium text-gray-500 tracking-wider uppercase">테넌트</span>} className="!mb-6">
                <Input
                  size="large"
                  placeholder="Tenant name (optional)"
                  prefix={<Users className="h-4 w-4 text-gray-300" />}
                  disabled={lockState.isLocked}
                  className="!rounded-none !border-gray-200 hover:!border-[var(--color-bt-primary)] focus:!border-[var(--color-bt-primary)] !shadow-none"
                />
              </Form.Item>

              <Form.Item className="!mb-8">
                <Checkbox disabled={lockState.isLocked} className="text-sm text-gray-500">
                  로그인 정보 저장
                </Checkbox>
              </Form.Item>

              <Form.Item className="!mb-0">
                <Button
                  type="primary"
                  size="large"
                  htmlType="submit"
                  loading={isPending}
                  disabled={lockState.isLocked}
                  block
                  className="!h-12 !rounded-none !bg-[var(--color-bt-primary)] hover:!bg-[var(--color-bt-primary)]/90 !border-0 !font-medium !tracking-wider !uppercase !text-sm"
                >
                  {lockState.isLocked ? `Locked · ${formatTime(lockState.retryAfterSeconds)}` : 'Sign In'}
                </Button>
              </Form.Item>
            </Form>
          </div>

          {/* Footer */}
          <div className="px-10 py-6 bg-gray-50/50 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">© 2025 BridgeTec. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Corner decoration */}
      <div className="fixed bottom-0 right-0 w-32 h-32 opacity-5">
        <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
          <rect x="0" y="0" width="100" height="100" fill="var(--color-bt-primary)" />
          <rect x="20" y="20" width="60" height="60" fill="white" />
          <rect x="40" y="40" width="20" height="20" fill="var(--color-bt-primary)" />
        </svg>
      </div>

      {/* Password change dialog */}
      <ChangePasswordDialog
        ref={changePasswordDialogRef}
        policy={passwordPolicy}
        onPasswordChange={handlePasswordChange}
        onSuccess={() => {
          // Handled in useLoginLogic
        }}
        onError={(error) => {
          Log.error('Password change failed:', error);
        }}
      />
    </div>
  );
}
