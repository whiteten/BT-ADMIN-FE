/**
 * 로그인 페이지 - 일러스트 V8 (Deep Ocean)
 * 바다/수중 이미지 + 딥 블루/청록 톤
 * 깊이감 있고 신비로운 분위기
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { Lock, LockKeyhole, User, Users, Waves } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

export default function LoginIllustration8() {
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
    <div className="min-h-screen w-full flex bg-[#051525]">
      {/* Left side - Ocean/Water Image */}
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden">
        {/* Background Image - Ocean/underwater */}
        <img src="https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1400&q=80" alt="Deep ocean" className="absolute inset-0 w-full h-full object-cover" />

        {/* Deep blue gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/85 via-blue-950/80 to-[#051525]/95" />

        {/* Underwater light rays effect */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(56, 189, 248, 0.3) 0%, transparent 60%)',
          }}
        />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-between p-12 z-10">
          {/* Top */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 backdrop-blur-md border border-cyan-400/30 flex items-center justify-center">
                <Waves className="w-6 h-6 text-cyan-300" />
              </div>
              <div>
                <span className="text-white font-medium">NLU Bot Admin</span>
                <div className="text-cyan-300/60 text-xs">Deep Analytics</div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-400/20">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-cyan-300/80 text-sm">Live Data</span>
            </div>
          </div>

          {/* Center */}
          <div className="max-w-lg">
            <h2 className="text-5xl font-extralight text-white leading-[1.15] tracking-tight">
              깊이 있는
              <br />
              <span className="font-semibold text-cyan-300">인사이트</span>의
              <br />
              바다로
            </h2>

            <p className="mt-8 text-cyan-100/60 text-lg leading-relaxed">
              데이터의 심층에서 발견하는 숨겨진 패턴과 인사이트.
              <br />
              AI가 비즈니스의 깊은 곳까지 분석합니다.
            </p>

            <div className="mt-10 flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-3xl font-extralight text-white">∞</span>
                <span className="text-cyan-300/50 text-sm mt-1">Depth</span>
              </div>
              <div className="w-px h-12 bg-cyan-500/20" />
              <div className="flex flex-col">
                <span className="text-3xl font-extralight text-white">360°</span>
                <span className="text-cyan-300/50 text-sm mt-1">Analysis</span>
              </div>
              <div className="w-px h-12 bg-cyan-500/20" />
              <div className="flex flex-col">
                <span className="text-3xl font-extralight text-white">Real</span>
                <span className="text-cyan-300/50 text-sm mt-1">Time</span>
              </div>
            </div>
          </div>

          {/* Bottom - Wave-like metrics */}
          <div className="relative">
            <div className="flex items-end gap-1 h-16">
              {[40, 55, 35, 70, 45, 80, 50, 65, 40, 75, 55, 90, 60, 45, 70, 50, 85, 55, 65, 45].map((h, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-cyan-500/60 to-cyan-400/20 rounded-t" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-cyan-300/50 text-sm">
              <span>Real-time data flow</span>
              <span>10,847 queries/sec</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-gradient-to-b from-[#0a1f35] to-[#051525]">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
              <Waves className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-lg font-medium text-white">NLU Bot Admin</span>
          </div>

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-light text-white">로그인</h1>
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
                className="!h-12 !rounded-xl !bg-white/5 !border-cyan-900/50 !text-white placeholder:!text-slate-500 hover:!border-cyan-500/50 focus:!border-cyan-500"
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
                className="!h-12 !rounded-xl !bg-white/5 !border-cyan-900/50 !text-white placeholder:!text-slate-500 hover:!border-cyan-500/50 focus:!border-cyan-500 [&_.ant-input]:!bg-transparent [&_.ant-input]:!text-white [&_.ant-input-password-icon]:!text-slate-500"
              />
            </Form.Item>

            <Form.Item label={<span className="text-sm font-medium text-slate-400">테넌트</span>} className="!mb-5">
              <Input
                size="large"
                placeholder="테넌트명 (선택)"
                prefix={<Users className="h-4 w-4 text-slate-500" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-xl !bg-white/5 !border-cyan-900/50 !text-white placeholder:!text-slate-500 hover:!border-cyan-500/50 focus:!border-cyan-500"
              />
            </Form.Item>

            <Form.Item className="!mb-8">
              <Checkbox disabled={lockState.isLocked} className="text-sm text-slate-400 [&_.ant-checkbox-inner]:!bg-white/5 [&_.ant-checkbox-inner]:!border-cyan-900/50">
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
                  background: lockState.isLocked ? 'rgba(100, 116, 139, 0.3)' : 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
                  boxShadow: lockState.isLocked ? 'none' : '0 4px 20px rgba(6, 182, 212, 0.4)',
                }}
              >
                {lockState.isLocked ? `잠금 해제까지 ${formatTime(lockState.retryAfterSeconds)}` : '로그인'}
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-12 pt-6 border-t border-cyan-900/30">
            <p className="text-xs text-slate-600 text-center">© 2025 BridgeTec. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Global dark theme overrides */}
      <style>{`
        .ant-input-affix-wrapper:focus-within {
          box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.2) !important;
        }
        .ant-form-item-explain-error {
          color: #f87171 !important;
        }
        .ant-checkbox-checked .ant-checkbox-inner {
          background-color: #06B6D4 !important;
          border-color: #06B6D4 !important;
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
