/**
 * 로그인 페이지 - 오리지널 변형 2 (Glassmorphism)
 * 기존 블루 테마 + 글래스모피즘 카드
 * 플로팅 효과, 미묘한 블러
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { Lock, LockKeyhole, User, Users } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

export default function LoginOriginal2() {
  const { form, lockState, loginError, isPending, passwordPolicy, changePasswordDialogRef, onFinish, onFinishFailed, handlePasswordChange, formatTime } = useLoginLogic();

  const renderErrorAlert = () => {
    if (lockState.isLocked) {
      return (
        <div className="mb-5 p-4 rounded-xl bg-red-500/20 backdrop-blur-sm border border-red-400/30">
          <div className="flex items-start gap-3">
            <LockKeyhole className="h-5 w-5 text-red-300 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-200">계정 잠금</h4>
              <p className="text-sm text-red-300/80 mt-1">보안을 위해 일시적으로 잠겼습니다.</p>
              <div className="mt-2 text-2xl font-semibold text-red-200 tabular-nums">{formatTime(lockState.retryAfterSeconds)}</div>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'account_dormant') {
      return (
        <div className="mb-5 p-4 rounded-xl bg-amber-500/20 backdrop-blur-sm border border-amber-400/30">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-amber-300 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-200">휴면 계정</h4>
              <p className="text-sm text-amber-300/80 mt-1">{loginError.message}</p>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'account_disabled') {
      return (
        <div className="mb-5 p-4 rounded-xl bg-slate-500/20 backdrop-blur-sm border border-slate-400/30">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-slate-300 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-slate-200">비활성화 계정</h4>
              <p className="text-sm text-slate-300/80 mt-1">{loginError.message}</p>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'invalid_grant') {
      const showWarning = loginError.remainingAttempts !== undefined && loginError.remainingAttempts <= 2;
      return (
        <div className={cn('mb-5 p-4 rounded-xl backdrop-blur-sm border', showWarning ? 'bg-red-500/20 border-red-400/30' : 'bg-white/10 border-white/20')}>
          <div className="flex items-start gap-3">
            <Lock className={cn('h-5 w-5 flex-shrink-0 mt-0.5', showWarning ? 'text-red-300' : 'text-white/60')} />
            <div>
              <h4 className={cn('text-sm font-semibold', showWarning ? 'text-red-200' : 'text-white/90')}>로그인 실패</h4>
              <p className={cn('text-sm mt-1', showWarning ? 'text-red-300/80' : 'text-white/60')}>{loginError.message}</p>
              {loginError.remainingAttempts !== undefined && (
                <p className={cn('text-sm mt-2 font-medium', showWarning ? 'text-red-200' : 'text-white/70')}>남은 시도: {loginError.remainingAttempts}회</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (loginError.message) {
      return (
        <div className="mb-5 p-4 rounded-xl bg-red-500/20 backdrop-blur-sm border border-red-400/30">
          <p className="text-sm text-red-200">{loginError.message}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 50%, #60A5FA 100%)',
        }}
      />

      {/* Decorative shapes */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large circle top-right */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
          }}
        />
        {/* Medium circle bottom-left */}
        <div
          className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          }}
        />
        {/* Small accent circles */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute bottom-1/3 right-1/4 w-24 h-24 rounded-full bg-white/5" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Glassmorphism login card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Floating effect shadow */}
        <div
          className="absolute inset-0 rounded-3xl"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%)',
            transform: 'translateY(20px) scale(0.95)',
            filter: 'blur(30px)',
          }}
        />

        {/* Glass card */}
        <div
          className="relative rounded-3xl p-8 md:p-10"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-white">NLU Bot Admin</h1>
            <p className="text-blue-100/70 mt-2">관리자 계정으로 로그인하세요</p>
          </div>

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
            <Form.Item name="userId" rules={[{ required: true, message: '아이디를 입력해주세요' }]} className="!mb-4">
              <Input
                size="large"
                placeholder="아이디"
                prefix={<User className="h-4 w-4 text-white/50" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-xl !bg-white/10 !border-white/20 !text-white placeholder:!text-white/40 hover:!border-white/40 focus:!border-white/60 focus:!bg-white/15"
              />
            </Form.Item>

            <Form.Item name="password" rules={[{ required: true, message: '비밀번호를 입력해주세요' }]} className="!mb-4">
              <Input.Password
                size="large"
                placeholder="비밀번호"
                prefix={<Lock className="h-4 w-4 text-white/50" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-xl !bg-white/10 !border-white/20 !text-white placeholder:!text-white/40 hover:!border-white/40 focus:!border-white/60 focus:!bg-white/15 [&_.ant-input]:!bg-transparent [&_.ant-input]:!text-white [&_.ant-input-password-icon]:!text-white/50"
              />
            </Form.Item>

            <Form.Item className="!mb-4">
              <Input
                size="large"
                placeholder="테넌트명 (선택)"
                prefix={<Users className="h-4 w-4 text-white/50" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-xl !bg-white/10 !border-white/20 !text-white placeholder:!text-white/40 hover:!border-white/40 focus:!border-white/60 focus:!bg-white/15"
              />
            </Form.Item>

            <Form.Item className="!mb-6">
              <Checkbox disabled={lockState.isLocked} className="text-sm text-white/70 [&_.ant-checkbox-inner]:!bg-white/10 [&_.ant-checkbox-inner]:!border-white/30">
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
                className="!h-12 !rounded-xl !font-medium !border-0"
                style={{
                  background: lockState.isLocked ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.95)',
                  color: lockState.isLocked ? 'rgba(255,255,255,0.5)' : '#1E40AF',
                  boxShadow: lockState.isLocked ? 'none' : '0 10px 40px rgba(0, 0, 0, 0.2)',
                }}
              >
                {lockState.isLocked ? `잠금 해제까지 ${formatTime(lockState.retryAfterSeconds)}` : '로그인'}
              </Button>
            </Form.Item>
          </Form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-blue-100/50">© 2025 BridgeTec. All rights reserved.</p>
        </div>
      </div>

      {/* Global style overrides */}
      <style>{`
        .ant-input-affix-wrapper:focus-within {
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.15) !important;
        }
        .ant-form-item-explain-error {
          color: #fecaca !important;
        }
        .ant-checkbox-checked .ant-checkbox-inner {
          background-color: rgba(255, 255, 255, 0.9) !important;
          border-color: rgba(255, 255, 255, 0.9) !important;
        }
        .ant-checkbox-checked .ant-checkbox-inner::after {
          border-color: #1E40AF !important;
        }
      `}</style>

      <ChangePasswordDialog
        ref={changePasswordDialogRef}
        policy={passwordPolicy}
        onPasswordChange={handlePasswordChange}
        onSuccess={() => {
          /* noop */
        }}
        onError={(error) => Log.error('Password change failed:', error)}
      />
    </div>
  );
}
