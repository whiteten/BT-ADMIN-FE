/**
 * 로그인 페이지 - 다크모드 버전
 * Luxury Dark / Premium Noir 스타일
 * 깊은 다크 테마, 블루 글로우 액센트, 프리미엄 느낌
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { KeyRound, Lock, LockKeyhole, Shield, User, Users } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

export default function LoginDark() {
  const { form, lockState, loginError, isPending, passwordPolicy, changePasswordDialogRef, onFinish, onFinishFailed, handlePasswordChange, formatTime } = useLoginLogic();

  /**
   * Render login error alert - Dark luxury style
   */
  const renderErrorAlert = () => {
    if (lockState.isLocked) {
      return (
        <div className="mb-6 p-5 rounded-xl bg-red-950/50 border border-red-800/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-900/50 flex items-center justify-center">
              <LockKeyhole className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <div className="text-red-300 font-medium text-sm">계정 잠금</div>
              <div className="text-red-400/70 text-xs mt-0.5">보안을 위해 일시적으로 잠겼습니다</div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <div className="text-4xl font-light text-red-400 tabular-nums tracking-wider font-mono">{formatTime(lockState.retryAfterSeconds)}</div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'account_dormant') {
      return (
        <div className="mb-6 p-4 rounded-xl bg-amber-950/30 border border-amber-800/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-900/30 flex items-center justify-center">
              <User className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <div className="text-amber-400 font-medium text-sm">휴면 계정</div>
              <div className="text-amber-500/60 text-xs mt-0.5">{loginError.message}</div>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'account_disabled') {
      return (
        <div className="mb-6 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-700/50 flex items-center justify-center">
              <User className="h-4 w-4 text-zinc-400" />
            </div>
            <div>
              <div className="text-zinc-300 font-medium text-sm">비활성화 계정</div>
              <div className="text-zinc-500 text-xs mt-0.5">{loginError.message}</div>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'invalid_grant') {
      const showWarning = loginError.remainingAttempts !== undefined && loginError.remainingAttempts <= 2;
      return (
        <div className={cn('mb-6 p-4 rounded-xl border', showWarning ? 'bg-red-950/30 border-red-800/30' : 'bg-zinc-800/30 border-zinc-700/30')}>
          <div className="flex items-center gap-3">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', showWarning ? 'bg-red-900/30' : 'bg-zinc-700/30')}>
              <Lock className={cn('h-4 w-4', showWarning ? 'text-red-400' : 'text-zinc-400')} />
            </div>
            <div className="flex-1">
              <div className={cn('font-medium text-sm', showWarning ? 'text-red-300' : 'text-zinc-300')}>로그인 실패</div>
              <div className={cn('text-xs mt-0.5', showWarning ? 'text-red-400/60' : 'text-zinc-500')}>{loginError.message}</div>
            </div>
            {loginError.remainingAttempts !== undefined && (
              <div className={cn('px-3 py-1.5 rounded-lg text-xs font-medium', showWarning ? 'bg-red-900/50 text-red-300' : 'bg-zinc-700/50 text-zinc-400')}>
                {loginError.remainingAttempts}회 남음
              </div>
            )}
          </div>
        </div>
      );
    }

    if (loginError.message) {
      return (
        <div className="mb-6 p-4 rounded-xl bg-red-950/30 border border-red-800/30">
          <p className="text-red-400/80 text-sm">{loginError.message}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        {/* Gradient orbs */}
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />

        {/* Subtle noise texture */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Top glow line */}
        <div
          className="absolute -top-px left-8 right-8 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--color-bt-primary), transparent)',
          }}
        />

        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(24, 24, 27, 0.9) 0%, rgba(9, 9, 11, 0.95) 100%)',
            border: '1px solid rgba(63, 63, 70, 0.4)',
            boxShadow: `
              0 0 0 1px rgba(0, 0, 0, 0.5),
              0 25px 50px -12px rgba(0, 0, 0, 0.8),
              0 0 100px -20px rgba(59, 130, 246, 0.15)
            `,
          }}
        >
          {/* Header */}
          <div className="px-8 pt-10 pb-8">
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center relative"
                style={{
                  background: 'linear-gradient(135deg, var(--color-bt-primary), #4F46E5)',
                  boxShadow: '0 0 40px rgba(59, 130, 246, 0.3)',
                }}
              >
                <Shield className="w-7 h-7 text-white" />
                {/* Subtle inner glow */}
                <div className="absolute inset-0 rounded-xl bg-white/10" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-white tracking-tight">Welcome back</h1>
                <p className="text-zinc-500 text-sm mt-1">NLU Bot Admin Portal</p>
              </div>
            </div>

            {/* Security badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/30 border border-emerald-800/30">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400 text-xs font-medium">Secure Connection</span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />

          {/* Form */}
          <div className="px-8 py-8">
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
                label={<span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">아이디</span>}
                rules={[{ required: true, message: '아이디를 입력해주세요' }]}
                className="!mb-5"
              >
                <Input
                  size="large"
                  placeholder="Enter your ID"
                  prefix={<User className="h-4 w-4 text-zinc-600" />}
                  disabled={lockState.isLocked}
                  className="!bg-zinc-900/50 !border-zinc-800 !text-white placeholder:!text-zinc-600 !rounded-xl hover:!border-zinc-700 focus:!border-blue-500/50 !shadow-none !h-12"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">비밀번호</span>}
                rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
                className="!mb-5"
              >
                <Input.Password
                  size="large"
                  placeholder="Enter your password"
                  prefix={<KeyRound className="h-4 w-4 text-zinc-600" />}
                  disabled={lockState.isLocked}
                  className="!bg-zinc-900/50 !border-zinc-800 !text-white placeholder:!text-zinc-600 !rounded-xl hover:!border-zinc-700 focus:!border-blue-500/50 !shadow-none !h-12 [&_.ant-input]:!bg-transparent [&_.ant-input]:!text-white [&_.ant-input-password-icon]:!text-zinc-500"
                />
              </Form.Item>

              <Form.Item label={<span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">테넌트</span>} className="!mb-5">
                <Input
                  size="large"
                  placeholder="Tenant (optional)"
                  prefix={<Users className="h-4 w-4 text-zinc-600" />}
                  disabled={lockState.isLocked}
                  className="!bg-zinc-900/50 !border-zinc-800 !text-white placeholder:!text-zinc-600 !rounded-xl hover:!border-zinc-700 focus:!border-blue-500/50 !shadow-none !h-12"
                />
              </Form.Item>

              <Form.Item className="!mb-6">
                <Checkbox
                  disabled={lockState.isLocked}
                  className="!text-zinc-500 text-sm [&_.ant-checkbox-inner]:!bg-zinc-900 [&_.ant-checkbox-inner]:!border-zinc-700 [&_.ant-checkbox-checked_.ant-checkbox-inner]:!bg-blue-600 [&_.ant-checkbox-checked_.ant-checkbox-inner]:!border-blue-600"
                >
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
                  className="!h-13 !rounded-xl !border-0 !font-semibold !text-sm !shadow-lg"
                  style={{
                    height: '52px',
                    background: lockState.isLocked ? 'rgba(63, 63, 70, 0.5)' : 'linear-gradient(135deg, var(--color-bt-primary), #4F46E5)',
                    boxShadow: lockState.isLocked ? 'none' : '0 10px 40px -10px rgba(59, 130, 246, 0.5)',
                  }}
                >
                  {lockState.isLocked ? (
                    <span className="flex items-center justify-center gap-2 text-zinc-400">
                      <LockKeyhole className="w-4 h-4" />
                      잠금 해제까지 {formatTime(lockState.retryAfterSeconds)}
                    </span>
                  ) : (
                    '로그인'
                  )}
                </Button>
              </Form.Item>
            </Form>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 bg-zinc-950/50 border-t border-zinc-800/50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600">© 2025 BridgeTec</span>
              <div className="flex items-center gap-4 text-xs text-zinc-600">
                <span className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                  Online
                </span>
                <span>v2.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom glow line */}
        <div
          className="absolute -bottom-px left-12 right-12 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.3), transparent)',
          }}
        />
      </div>

      {/* Corner decorations */}
      <div className="fixed top-6 left-6 text-zinc-700 text-xs font-mono uppercase tracking-widest">NLU Admin</div>
      <div className="fixed bottom-6 right-6 text-zinc-800 text-xs font-mono">Secured by BridgeTec</div>

      {/* CSS overrides for dark theme */}
      <style>{`
        .ant-input-affix-wrapper:focus-within {
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15) !important;
        }

        .ant-form-item-explain-error {
          color: #f87171 !important;
          font-size: 12px !important;
        }

        .ant-btn-primary:not(:disabled):hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }

        .ant-checkbox-wrapper:hover .ant-checkbox-inner {
          border-color: var(--color-bt-primary) !important;
        }
      `}</style>

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
