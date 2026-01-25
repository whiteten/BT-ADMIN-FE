/**
 * 로그인 페이지 - 일러스트 V7 (Golden Hour)
 * 빛/보케 추상 이미지 + 앰버/골드 톤
 * 따뜻하고 고급스러운 분위기
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { Lock, LockKeyhole, Sun, User, Users } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

export default function LoginIllustration7() {
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
        <div className="mb-6 p-4 rounded-2xl bg-stone-100 border border-stone-200">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-stone-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-stone-700">비활성화 계정</h4>
              <p className="text-sm text-stone-500 mt-1">{loginError.message}</p>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'invalid_grant') {
      const showWarning = loginError.remainingAttempts !== undefined && loginError.remainingAttempts <= 2;
      return (
        <div className={cn('mb-6 p-4 rounded-2xl border', showWarning ? 'bg-red-50 border-red-100' : 'bg-stone-100 border-stone-200')}>
          <div className="flex items-start gap-3">
            <Lock className={cn('h-5 w-5 flex-shrink-0 mt-0.5', showWarning ? 'text-red-500' : 'text-stone-400')} />
            <div>
              <h4 className={cn('text-sm font-semibold', showWarning ? 'text-red-800' : 'text-stone-700')}>로그인 실패</h4>
              <p className={cn('text-sm mt-1', showWarning ? 'text-red-600' : 'text-stone-500')}>{loginError.message}</p>
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
      {/* Left side - Light/Bokeh Image */}
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden">
        {/* Background Image - Abstract light/bokeh */}
        <img src="https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=1400&q=80" alt="Golden light" className="absolute inset-0 w-full h-full object-cover" />

        {/* Warm gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/80 via-orange-800/70 to-yellow-900/75" />

        {/* Light rays effect */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(ellipse at 30% 20%, rgba(255,200,100,0.4) 0%, transparent 50%)',
          }}
        />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-between p-12 z-10">
          {/* Top */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center">
              <Sun className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <span className="text-white font-medium">NLU Bot Admin</span>
              <div className="text-amber-200/70 text-xs">Premium Experience</div>
            </div>
          </div>

          {/* Center */}
          <div className="max-w-lg">
            <h2 className="text-5xl font-extralight text-white leading-[1.15]">
              빛나는 순간을
              <br />
              <span className="font-semibold text-amber-200">가치있는 경험</span>으로
            </h2>

            <p className="mt-8 text-amber-100/70 text-lg leading-relaxed">
              모든 대화의 순간이 고객에게 특별한 경험이 되도록,
              <br />
              AI가 빛나는 인사이트를 제공합니다.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15">
                <div className="text-2xl font-light text-white">Premium</div>
                <div className="text-amber-200/60 text-sm mt-1">Service</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15">
                <div className="text-2xl font-light text-white">24/7</div>
                <div className="text-amber-200/60 text-sm mt-1">Support</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15">
                <div className="text-2xl font-light text-white">VIP</div>
                <div className="text-amber-200/60 text-sm mt-1">Care</div>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="flex items-center gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400/30 to-orange-500/30 border border-white/20 backdrop-blur-sm" />
            ))}
            <span className="text-amber-100/80 text-sm ml-2">
              <span className="font-semibold text-white">500+</span> 프리미엄 고객
            </span>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-gradient-to-br from-amber-50 via-orange-50/50 to-white">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Sun className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-stone-900">NLU Bot Admin</span>
          </div>

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-light text-stone-900">반갑습니다</h1>
            <p className="text-stone-500 mt-3">프리미엄 서비스에 로그인하세요.</p>
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
              label={<span className="text-sm font-medium text-stone-600">아이디</span>}
              rules={[{ required: true, message: '아이디를 입력해주세요' }]}
              className="!mb-5"
            >
              <Input
                size="large"
                placeholder="아이디를 입력하세요"
                prefix={<User className="h-4 w-4 text-stone-400" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-2xl !border-stone-200 hover:!border-amber-400 focus:!border-amber-500"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="text-sm font-medium text-stone-600">비밀번호</span>}
              rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
              className="!mb-5"
            >
              <Input.Password
                size="large"
                placeholder="비밀번호를 입력하세요"
                prefix={<Lock className="h-4 w-4 text-stone-400" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-2xl !border-stone-200 hover:!border-amber-400 focus:!border-amber-500"
              />
            </Form.Item>

            <Form.Item label={<span className="text-sm font-medium text-stone-600">테넌트</span>} className="!mb-5">
              <Input
                size="large"
                placeholder="테넌트명 (선택)"
                prefix={<Users className="h-4 w-4 text-stone-400" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-2xl !border-stone-200 hover:!border-amber-400 focus:!border-amber-500"
              />
            </Form.Item>

            <Form.Item className="!mb-8">
              <Checkbox disabled={lockState.isLocked} className="text-sm text-stone-500">
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
                  background: lockState.isLocked ? '#D6D3D1' : 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                  boxShadow: lockState.isLocked ? 'none' : '0 4px 14px rgba(217, 119, 6, 0.35)',
                }}
              >
                {lockState.isLocked ? `잠금 해제까지 ${formatTime(lockState.retryAfterSeconds)}` : '로그인'}
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-12 pt-6 border-t border-stone-200">
            <p className="text-xs text-stone-400 text-center">© 2025 BridgeTec. All rights reserved.</p>
          </div>
        </div>
      </div>

      <style>{`
        .ant-checkbox-checked .ant-checkbox-inner {
          background: linear-gradient(135deg, #D97706 0%, #B45309 100%) !important;
          border-color: #D97706 !important;
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
