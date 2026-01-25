/**
 * 로그인 페이지 - 일러스트 V9 (Northern Lights)
 * 오로라/북극광 이미지 + 보라/녹색 신비로운 톤
 * 몽환적이고 고급스러운 분위기
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { Lock, LockKeyhole, Sparkles, User, Users } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

export default function LoginIllustration9() {
  const { form, lockState, loginError, isPending, passwordPolicy, changePasswordDialogRef, onFinish, onFinishFailed, handlePasswordChange, formatTime } = useLoginLogic();

  const renderErrorAlert = () => {
    if (lockState.isLocked) {
      return (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-start gap-3">
            <LockKeyhole className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-300">계정 잠금</h4>
              <p className="text-sm text-red-400/80 mt-1">보안을 위해 일시적으로 잠겼습니다.</p>
              <div className="mt-2 text-2xl font-light text-red-400 tabular-nums">{formatTime(lockState.retryAfterSeconds)}</div>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'account_dormant') {
      return (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
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
        <div className="mb-6 p-4 rounded-xl bg-slate-500/10 border border-slate-500/20">
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
        <div className={cn('mb-6 p-4 rounded-xl border', showWarning ? 'bg-red-500/10 border-red-500/20' : 'bg-slate-500/10 border-slate-500/20')}>
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
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{loginError.message}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen w-full flex bg-[#0a0a1a]">
      {/* Left side - Aurora Borealis Image */}
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden">
        {/* Background Image - Northern Lights */}
        <img src="https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1400&q=80" alt="Northern Lights" className="absolute inset-0 w-full h-full object-cover" />

        {/* Purple/Green ethereal gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/70 via-emerald-950/50 to-[#0a0a1a]/90" />

        {/* Aurora light effect */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse at 50% 30%, rgba(139, 92, 246, 0.3) 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, rgba(16, 185, 129, 0.25) 0%, transparent 40%)',
          }}
        />

        {/* Subtle stars effect */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: `radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.8), transparent),
                              radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.6), transparent),
                              radial-gradient(1px 1px at 50px 160px, rgba(255,255,255,0.7), transparent),
                              radial-gradient(1.5px 1.5px at 90px 40px, rgba(255,255,255,0.9), transparent),
                              radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.5), transparent),
                              radial-gradient(1px 1px at 160px 120px, rgba(255,255,255,0.7), transparent)`,
            backgroundSize: '200px 200px',
          }}
        />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-between p-12 z-10">
          {/* Top */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/20 backdrop-blur-md border border-violet-400/30 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-violet-300" />
              </div>
              <div>
                <span className="text-white font-medium">NLU Bot Admin</span>
                <div className="text-violet-300/60 text-xs">Ethereal Intelligence</div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-400/20">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300/80 text-sm">Active</span>
            </div>
          </div>

          {/* Center */}
          <div className="max-w-lg">
            <h2 className="text-5xl font-extralight text-white leading-[1.15] tracking-tight">
              무한한
              <br />
              <span className="font-semibold bg-gradient-to-r from-violet-300 via-emerald-300 to-violet-300 bg-clip-text text-transparent">가능성</span>의
              <br />
              빛을 따라
            </h2>

            <p className="mt-8 text-violet-100/60 text-lg leading-relaxed">
              자연이 만들어낸 가장 아름다운 빛처럼,
              <br />
              AI가 비즈니스의 새로운 가능성을 밝힙니다.
            </p>

            <div className="mt-10 flex items-center gap-6">
              <div className="flex flex-col items-center p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <span className="text-2xl font-extralight text-white">Aurora</span>
                <span className="text-violet-300/50 text-sm mt-1">Analytics</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <span className="text-2xl font-extralight text-white">Stellar</span>
                <span className="text-emerald-300/50 text-sm mt-1">Insights</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <span className="text-2xl font-extralight text-white">Cosmic</span>
                <span className="text-violet-300/50 text-sm mt-1">Scale</span>
              </div>
            </div>
          </div>

          {/* Bottom - Aurora wave visualization */}
          <div className="relative">
            <div className="flex items-end gap-0.5 h-20">
              {[...Array(40)].map((_, i) => {
                const height = 30 + Math.sin(i * 0.3) * 20 + Math.cos(i * 0.5) * 15;
                const isGreen = i % 3 === 0;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t transition-all duration-500"
                    style={{
                      height: `${height}%`,
                      background: isGreen
                        ? 'linear-gradient(to top, rgba(16, 185, 129, 0.6), rgba(16, 185, 129, 0.1))'
                        : 'linear-gradient(to top, rgba(139, 92, 246, 0.6), rgba(139, 92, 246, 0.1))',
                    }}
                  />
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between text-violet-300/50 text-sm">
              <span>Real-time intelligence flow</span>
              <span>8,432 insights/min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-gradient-to-b from-[#12122a] to-[#0a0a1a]">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-2xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-400" />
            </div>
            <span className="text-lg font-medium text-white">NLU Bot Admin</span>
          </div>

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-light text-white">환영합니다</h1>
            <p className="text-slate-400 mt-3">관리자 계정으로 접속하세요.</p>
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
                className="!h-12 !rounded-xl !bg-white/5 !border-violet-900/50 !text-white placeholder:!text-slate-500 hover:!border-violet-500/50 focus:!border-violet-500"
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
                className="!h-12 !rounded-xl !bg-white/5 !border-violet-900/50 !text-white placeholder:!text-slate-500 hover:!border-violet-500/50 focus:!border-violet-500 [&_.ant-input]:!bg-transparent [&_.ant-input]:!text-white [&_.ant-input-password-icon]:!text-slate-500"
              />
            </Form.Item>

            <Form.Item label={<span className="text-sm font-medium text-slate-400">테넌트</span>} className="!mb-5">
              <Input
                size="large"
                placeholder="테넌트명 (선택)"
                prefix={<Users className="h-4 w-4 text-slate-500" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-xl !bg-white/5 !border-violet-900/50 !text-white placeholder:!text-slate-500 hover:!border-violet-500/50 focus:!border-violet-500"
              />
            </Form.Item>

            <Form.Item className="!mb-8">
              <Checkbox disabled={lockState.isLocked} className="text-sm text-slate-400 [&_.ant-checkbox-inner]:!bg-white/5 [&_.ant-checkbox-inner]:!border-violet-900/50">
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
                  background: lockState.isLocked ? 'rgba(100, 116, 139, 0.3)' : 'linear-gradient(135deg, #8B5CF6 0%, #10B981 100%)',
                  boxShadow: lockState.isLocked ? 'none' : '0 4px 20px rgba(139, 92, 246, 0.4)',
                }}
              >
                {lockState.isLocked ? `잠금 해제까지 ${formatTime(lockState.retryAfterSeconds)}` : '로그인'}
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-12 pt-6 border-t border-violet-900/30">
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
          background: linear-gradient(135deg, #8B5CF6 0%, #10B981 100%) !important;
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
