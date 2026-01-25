/**
 * 로그인 페이지 - 일러스트 V4 (Digital Cosmos)
 * 우주/기술 추상 이미지 + 딥 블루/퍼플 오버레이
 * 미래지향적이고 세련된 비주얼
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { Lock, LockKeyhole, Sparkles, User, Users } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

export default function LoginIllustration4() {
  const { form, lockState, loginError, isPending, passwordPolicy, changePasswordDialogRef, onFinish, onFinishFailed, handlePasswordChange, formatTime } = useLoginLogic();

  const renderErrorAlert = () => {
    if (lockState.isLocked) {
      return (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <LockKeyhole className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-300">계정 잠금</h4>
              <p className="text-sm text-red-400/80 mt-1">보안을 위해 일시적으로 잠겼습니다.</p>
              <div className="mt-2 text-2xl font-light text-red-400 tabular-nums tracking-wider">{formatTime(lockState.retryAfterSeconds)}</div>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'account_dormant') {
      return (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-300">휴면 계정</h4>
              <p className="text-sm text-amber-400/80 mt-1">{loginError.message}</p>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'account_disabled') {
      return (
        <div className="mb-6 p-4 rounded-xl bg-slate-500/10 border border-slate-500/20 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-slate-300">비활성화 계정</h4>
              <p className="text-sm text-slate-400/80 mt-1">{loginError.message}</p>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'invalid_grant') {
      const showWarning = loginError.remainingAttempts !== undefined && loginError.remainingAttempts <= 2;
      return (
        <div className={cn('mb-6 p-4 rounded-xl border backdrop-blur-sm', showWarning ? 'bg-red-500/10 border-red-500/20' : 'bg-slate-500/10 border-slate-500/20')}>
          <div className="flex items-start gap-3">
            <Lock className={cn('h-5 w-5 flex-shrink-0 mt-0.5', showWarning ? 'text-red-400' : 'text-slate-400')} />
            <div>
              <h4 className={cn('text-sm font-semibold', showWarning ? 'text-red-300' : 'text-slate-300')}>로그인 실패</h4>
              <p className={cn('text-sm mt-1', showWarning ? 'text-red-400/80' : 'text-slate-400/80')}>{loginError.message}</p>
              {loginError.remainingAttempts !== undefined && (
                <p className={cn('text-sm mt-2 font-medium', showWarning ? 'text-red-400' : 'text-slate-400')}>남은 시도: {loginError.remainingAttempts}회</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (loginError.message) {
      return (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm">
          <p className="text-sm text-red-400">{loginError.message}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen w-full flex bg-[#0a0a1a]">
      {/* Left side - Image */}
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden">
        {/* Background Image - Abstract technology/cosmos */}
        <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1400&q=80" alt="Digital cosmos" className="absolute inset-0 w-full h-full object-cover" />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/95 via-purple-900/80 to-blue-900/70" />

        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(139, 92, 246, 0.3) 0%, transparent 50%),
                             radial-gradient(circle at 75% 75%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)`,
          }}
        />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-between p-12 z-10">
          {/* Top */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-300" />
              </div>
              <div>
                <span className="text-white/90 font-medium tracking-wide">NLU Bot Admin</span>
                <div className="text-purple-300/60 text-xs">Conversational AI Platform</div>
              </div>
            </div>
          </div>

          {/* Center */}
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-purple-200/80 text-sm">AI System Online</span>
            </div>

            <h2 className="text-5xl font-extralight text-white leading-[1.15] tracking-tight">
              미래의 대화를
              <br />
              <span className="font-semibold bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">오늘 경험하세요</span>
            </h2>

            <p className="mt-8 text-lg text-purple-100/60 leading-relaxed max-w-md">차세대 자연어 처리 기술로 더 스마트한 고객 경험을 제공합니다.</p>
          </div>

          {/* Bottom */}
          <div className="flex items-center gap-10">
            <div className="text-center">
              <div className="text-3xl font-extralight text-white">AI</div>
              <div className="text-purple-300/50 text-xs mt-1 tracking-wider">POWERED</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="text-3xl font-extralight text-white">24/7</div>
              <div className="text-purple-300/50 text-xs mt-1 tracking-wider">AVAILABLE</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="text-3xl font-extralight text-white">99.9%</div>
              <div className="text-purple-300/50 text-xs mt-1 tracking-wider">UPTIME</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-gradient-to-b from-[#0f0f23] to-[#0a0a1a]">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-lg font-medium text-white">NLU Bot Admin</span>
          </div>

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-light text-white tracking-tight">Welcome back</h1>
            <p className="text-slate-400 mt-3">관리자 계정으로 로그인하세요.</p>
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
            <Form.Item
              name="userId"
              label={<span className="text-sm font-medium text-slate-400">아이디</span>}
              rules={[{ required: true, message: '아이디를 입력해주세요' }]}
              className="!mb-5"
            >
              <Input
                size="large"
                placeholder="아이디를 입력하세요"
                prefix={<User className="h-4 w-4 text-slate-500" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-xl !bg-white/5 !border-white/10 !text-white placeholder:!text-slate-500 hover:!border-purple-500/50 focus:!border-purple-500"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="text-sm font-medium text-slate-400">비밀번호</span>}
              rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
              className="!mb-5"
            >
              <Input.Password
                size="large"
                placeholder="비밀번호를 입력하세요"
                prefix={<Lock className="h-4 w-4 text-slate-500" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-xl !bg-white/5 !border-white/10 !text-white placeholder:!text-slate-500 hover:!border-purple-500/50 focus:!border-purple-500 [&_.ant-input]:!bg-transparent [&_.ant-input]:!text-white [&_.ant-input-password-icon]:!text-slate-500"
              />
            </Form.Item>

            <Form.Item label={<span className="text-sm font-medium text-slate-400">테넌트</span>} className="!mb-5">
              <Input
                size="large"
                placeholder="테넌트명 (선택)"
                prefix={<Users className="h-4 w-4 text-slate-500" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-xl !bg-white/5 !border-white/10 !text-white placeholder:!text-slate-500 hover:!border-purple-500/50 focus:!border-purple-500"
              />
            </Form.Item>

            <Form.Item className="!mb-8">
              <Checkbox disabled={lockState.isLocked} className="text-sm text-slate-400 [&_.ant-checkbox-inner]:!bg-white/5 [&_.ant-checkbox-inner]:!border-white/20">
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
                  background: lockState.isLocked ? 'rgba(100, 116, 139, 0.3)' : 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 50%, #3B82F6 100%)',
                  boxShadow: lockState.isLocked ? 'none' : '0 4px 20px rgba(139, 92, 246, 0.4)',
                }}
              >
                {lockState.isLocked ? `잠금 해제까지 ${formatTime(lockState.retryAfterSeconds)}` : '로그인'}
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-12 pt-6 border-t border-white/5">
            <p className="text-xs text-slate-600 text-center">© 2025 BridgeTec. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Global dark theme overrides */}
      <style>{`
        .ant-input-affix-wrapper:focus-within {
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2) !important;
        }
        .ant-form-item-explain-error {
          color: #f87171 !important;
        }
        .ant-checkbox-checked .ant-checkbox-inner {
          background-color: #8B5CF6 !important;
          border-color: #8B5CF6 !important;
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
