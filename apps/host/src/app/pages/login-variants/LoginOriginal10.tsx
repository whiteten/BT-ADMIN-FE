/**
 * 로그인 페이지 - 오리지널 V10 (Violet Innovation)
 * 혁신적인 바이올렛/퍼플 테마
 * 기술/우주 이미지 + 바이올렛 그라데이션
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { Lock, LockKeyhole, User, Users, Zap } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

export default function LoginOriginal10() {
  const { form, lockState, loginError, isPending, passwordPolicy, changePasswordDialogRef, onFinish, onFinishFailed, handlePasswordChange, formatTime } = useLoginLogic();

  const renderErrorAlert = () => {
    if (lockState.isLocked) {
      return (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100">
          <div className="flex items-start gap-3">
            <LockKeyhole className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-800">계정 잠금</h4>
              <p className="text-sm text-red-600 mt-1">보안을 위해 일시적으로 잠겼습니다.</p>
              <div className="mt-2 text-2xl font-light text-red-700 tabular-nums">{formatTime(lockState.retryAfterSeconds)}</div>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'account_dormant') {
      return (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-100">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-800">휴면 계정</h4>
              <p className="text-sm text-amber-600 mt-1">{loginError.message}</p>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'account_disabled') {
      return (
        <div className="mb-6 p-4 rounded-2xl bg-violet-50 border border-violet-100">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-violet-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-violet-700">비활성화 계정</h4>
              <p className="text-sm text-violet-500 mt-1">{loginError.message}</p>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'invalid_grant') {
      const showWarning = loginError.remainingAttempts !== undefined && loginError.remainingAttempts <= 2;
      return (
        <div className={cn('mb-6 p-4 rounded-2xl border', showWarning ? 'bg-red-50 border-red-100' : 'bg-violet-50 border-violet-100')}>
          <div className="flex items-start gap-3">
            <Lock className={cn('h-5 w-5 flex-shrink-0 mt-0.5', showWarning ? 'text-red-500' : 'text-violet-400')} />
            <div>
              <h4 className={cn('text-sm font-semibold', showWarning ? 'text-red-800' : 'text-violet-700')}>로그인 실패</h4>
              <p className={cn('text-sm mt-1', showWarning ? 'text-red-600' : 'text-violet-500')}>{loginError.message}</p>
              {loginError.remainingAttempts !== undefined && (
                <p className={cn('text-sm mt-2 font-medium', showWarning && 'text-red-700')}>남은 시도: {loginError.remainingAttempts}회</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (loginError.message) {
      return (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100">
          <p className="text-sm text-red-600">{loginError.message}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left side - Tech/Space Image */}
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden">
        {/* Background Image - Space/Technology */}
        <img src="https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1400&q=80" alt="Technology abstract" className="absolute inset-0 w-full h-full object-cover" />

        {/* Violet gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/95 via-purple-900/85 to-indigo-800/75" />

        {/* Glowing orb effect */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background: 'radial-gradient(ellipse at 70% 30%, rgba(167,139,250,0.4) 0%, transparent 40%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(ellipse at 20% 80%, rgba(192,132,252,0.3) 0%, transparent 40%)',
          }}
        />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-between p-12 z-10">
          {/* Top - Logo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-violet-300" />
              </div>
              <div>
                <span className="text-white font-semibold text-lg">NLU Bot Admin</span>
                <div className="text-violet-300/70 text-xs">Innovation Platform</div>
              </div>
            </div>
            <div className="px-4 py-1.5 rounded-full bg-violet-500/20 border border-violet-400/30">
              <span className="text-violet-200 text-xs font-medium tracking-wider">NEXT GEN</span>
            </div>
          </div>

          {/* Center - Main content */}
          <div className="max-w-lg">
            <h2 className="text-5xl font-extralight text-white leading-tight">
              미래를
              <br />
              <span className="font-bold text-violet-300">앞당기는</span>
              <br />
              혁신의 시작
            </h2>

            <p className="mt-8 text-violet-100/70 text-lg leading-relaxed">
              최첨단 AI 기술로 대화의 새로운 패러다임을 열고
              <br />
              비즈니스의 미래를 설계합니다.
            </p>

            <div className="mt-10 flex items-center gap-4">
              <div className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="text-xs text-violet-300/60 mb-1">Processing</div>
                <div className="text-xl font-light text-white">Real-time</div>
              </div>
              <div className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="text-xs text-violet-300/60 mb-1">AI Model</div>
                <div className="text-xl font-light text-white">GPT-4</div>
              </div>
              <div className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="text-xs text-violet-300/60 mb-1">Languages</div>
                <div className="text-xl font-light text-white">100+</div>
              </div>
            </div>
          </div>

          {/* Bottom - Innovation badges */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-violet-200/80 text-sm">AI-Powered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-violet-200/80 text-sm">Cloud Native</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-violet-200/80 text-sm">Auto Scaling</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
              <span className="text-violet-200/80 text-sm">Zero Latency</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-gradient-to-br from-violet-50/30 via-purple-50/20 to-white">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-violet-900">NLU Bot Admin</span>
          </div>

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-light text-violet-900">시작하기</h1>
            <p className="text-violet-600/60 mt-3">혁신의 여정을 시작하세요.</p>
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
              label={<span className="text-sm font-medium text-violet-700">아이디</span>}
              rules={[{ required: true, message: '아이디를 입력해주세요' }]}
              className="!mb-5"
            >
              <Input
                size="large"
                placeholder="아이디를 입력하세요"
                prefix={<User className="h-4 w-4 text-violet-400" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-2xl !border-violet-200 hover:!border-violet-400 focus:!border-violet-500"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="text-sm font-medium text-violet-700">비밀번호</span>}
              rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
              className="!mb-5"
            >
              <Input.Password
                size="large"
                placeholder="비밀번호를 입력하세요"
                prefix={<Lock className="h-4 w-4 text-violet-400" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-2xl !border-violet-200 hover:!border-violet-400 focus:!border-violet-500"
              />
            </Form.Item>

            <Form.Item label={<span className="text-sm font-medium text-violet-700">테넌트</span>} className="!mb-5">
              <Input
                size="large"
                placeholder="테넌트명 (선택)"
                prefix={<Users className="h-4 w-4 text-violet-400" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-2xl !border-violet-200 hover:!border-violet-400 focus:!border-violet-500"
              />
            </Form.Item>

            <Form.Item className="!mb-8">
              <Checkbox disabled={lockState.isLocked} className="text-sm text-violet-600">
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
                className="!h-12 !rounded-2xl !font-medium !border-0"
                style={{
                  background: lockState.isLocked ? '#E5E5E5' : 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%)',
                  boxShadow: lockState.isLocked ? 'none' : '0 4px 14px rgba(124, 58, 237, 0.4)',
                }}
              >
                {lockState.isLocked ? `잠금 해제까지 ${formatTime(lockState.retryAfterSeconds)}` : '로그인'}
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-12 pt-6 border-t border-violet-100">
            <p className="text-xs text-violet-400 text-center">© 2025 BridgeTec. All rights reserved.</p>
          </div>
        </div>
      </div>

      <style>{`
        .ant-checkbox-checked .ant-checkbox-inner {
          background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%) !important;
          border-color: #7C3AED !important;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
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
