/**
 * 로그인 페이지 - 오리지널 V8 (Rose Enterprise)
 * 우아한 로즈/핑크 엔터프라이즈 테마
 * 꽃/로즈 이미지 + 로즈 그라데이션
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { Lock, LockKeyhole, Sparkles, User, Users } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

export default function LoginOriginal8() {
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
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-rose-300 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-rose-700">비활성화 계정</h4>
              <p className="text-sm text-rose-500 mt-1">{loginError.message}</p>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'invalid_grant') {
      const showWarning = loginError.remainingAttempts !== undefined && loginError.remainingAttempts <= 2;
      return (
        <div className={cn('mb-6 p-4 rounded-2xl border', showWarning ? 'bg-red-50 border-red-100' : 'bg-rose-50 border-rose-100')}>
          <div className="flex items-start gap-3">
            <Lock className={cn('h-5 w-5 flex-shrink-0 mt-0.5', showWarning ? 'text-red-500' : 'text-rose-400')} />
            <div>
              <h4 className={cn('text-sm font-semibold', showWarning ? 'text-red-800' : 'text-rose-700')}>로그인 실패</h4>
              <p className={cn('text-sm mt-1', showWarning ? 'text-red-600' : 'text-rose-500')}>{loginError.message}</p>
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
      {/* Left side - Rose/Flower Image */}
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden">
        {/* Background Image - Rose petals/flowers */}
        <img src="https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1400&q=80" alt="Rose petals" className="absolute inset-0 w-full h-full object-cover" />

        {/* Rose gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-950/90 via-rose-900/80 to-pink-800/70" />

        {/* Soft light effect */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(ellipse at 70% 30%, rgba(255,200,220,0.3) 0%, transparent 50%)',
          }}
        />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-between p-12 z-10">
          {/* Top - Logo */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-rose-200" />
            </div>
            <div>
              <span className="text-white font-medium">NLU Bot Admin</span>
              <div className="text-rose-200/70 text-xs">Elegant Experience</div>
            </div>
          </div>

          {/* Center - Main content */}
          <div className="max-w-lg">
            <h2 className="text-5xl font-extralight text-white leading-tight">
              우아함이
              <br />
              빚어내는
              <br />
              <span className="font-semibold text-rose-200">차별화된 경험</span>
            </h2>

            <p className="mt-8 text-rose-100/70 text-lg leading-relaxed">
              세심한 배려와 정교한 기술이 만나
              <br />
              고객에게 특별한 순간을 선사합니다.
            </p>

            <div className="mt-10 flex items-center gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400/20 to-pink-400/20 border border-white/15 backdrop-blur-sm" />
              ))}
              <span className="text-rose-100/80 text-sm ml-2">
                <span className="font-semibold text-white">200+</span> Premium Partners
              </span>
            </div>
          </div>

          {/* Bottom - Features */}
          <div className="flex items-center gap-6">
            <div className="px-5 py-3 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm">
              <span className="text-rose-100/90 text-sm">Premium Support</span>
            </div>
            <div className="px-5 py-3 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm">
              <span className="text-rose-100/90 text-sm">Personalized Care</span>
            </div>
            <div className="px-5 py-3 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm">
              <span className="text-rose-100/90 text-sm">Exclusive Features</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-gradient-to-br from-rose-50/50 via-pink-50/30 to-white">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-rose-900">NLU Bot Admin</span>
          </div>

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-light text-rose-900">환영합니다</h1>
            <p className="text-rose-500/70 mt-3">프리미엄 서비스에 로그인하세요.</p>
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
              label={<span className="text-sm font-medium text-rose-700">아이디</span>}
              rules={[{ required: true, message: '아이디를 입력해주세요' }]}
              className="!mb-5"
            >
              <Input
                size="large"
                placeholder="아이디를 입력하세요"
                prefix={<User className="h-4 w-4 text-rose-400" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-2xl !border-rose-200 hover:!border-rose-400 focus:!border-rose-500"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="text-sm font-medium text-rose-700">비밀번호</span>}
              rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
              className="!mb-5"
            >
              <Input.Password
                size="large"
                placeholder="비밀번호를 입력하세요"
                prefix={<Lock className="h-4 w-4 text-rose-400" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-2xl !border-rose-200 hover:!border-rose-400 focus:!border-rose-500"
              />
            </Form.Item>

            <Form.Item label={<span className="text-sm font-medium text-rose-700">테넌트</span>} className="!mb-5">
              <Input
                size="large"
                placeholder="테넌트명 (선택)"
                prefix={<Users className="h-4 w-4 text-rose-400" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-2xl !border-rose-200 hover:!border-rose-400 focus:!border-rose-500"
              />
            </Form.Item>

            <Form.Item className="!mb-8">
              <Checkbox disabled={lockState.isLocked} className="text-sm text-rose-600">
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
                  background: lockState.isLocked ? '#E5E5E5' : 'linear-gradient(135deg, #E11D48 0%, #BE185D 100%)',
                  boxShadow: lockState.isLocked ? 'none' : '0 4px 14px rgba(225, 29, 72, 0.35)',
                }}
              >
                {lockState.isLocked ? `잠금 해제까지 ${formatTime(lockState.retryAfterSeconds)}` : '로그인'}
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-12 pt-6 border-t border-rose-100">
            <p className="text-xs text-rose-400 text-center">© 2025 BridgeTec. All rights reserved.</p>
          </div>
        </div>
      </div>

      <style>{`
        .ant-checkbox-checked .ant-checkbox-inner {
          background: linear-gradient(135deg, #E11D48 0%, #BE185D 100%) !important;
          border-color: #E11D48 !important;
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
