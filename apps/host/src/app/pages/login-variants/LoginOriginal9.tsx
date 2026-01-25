/**
 * 로그인 페이지 - 오리지널 V9 (Amber Commerce)
 * 따뜻한 앰버/오렌지 비즈니스 테마
 * 커피/카페 이미지 + 앰버 그라데이션
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { Coffee, Lock, LockKeyhole, User, Users } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

export default function LoginOriginal9() {
  const { form, lockState, loginError, isPending, passwordPolicy, changePasswordDialogRef, onFinish, onFinishFailed, handlePasswordChange, formatTime } = useLoginLogic();

  const renderErrorAlert = () => {
    if (lockState.isLocked) {
      return (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100">
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
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-100">
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
        <div className="mb-6 p-4 rounded-xl bg-orange-50 border border-orange-100">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-orange-800">비활성화 계정</h4>
              <p className="text-sm text-orange-600 mt-1">{loginError.message}</p>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'invalid_grant') {
      const showWarning = loginError.remainingAttempts !== undefined && loginError.remainingAttempts <= 2;
      return (
        <div className={cn('mb-6 p-4 rounded-xl border', showWarning ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100')}>
          <div className="flex items-start gap-3">
            <Lock className={cn('h-5 w-5 flex-shrink-0 mt-0.5', showWarning ? 'text-red-500' : 'text-orange-400')} />
            <div>
              <h4 className={cn('text-sm font-semibold', showWarning ? 'text-red-800' : 'text-orange-800')}>로그인 실패</h4>
              <p className={cn('text-sm mt-1', showWarning ? 'text-red-600' : 'text-orange-600')}>{loginError.message}</p>
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
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100">
          <p className="text-sm text-red-600">{loginError.message}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left side - Coffee/Warm Image */}
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden">
        {/* Background Image - Coffee/Cafe atmosphere */}
        <img src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1400&q=80" alt="Coffee atmosphere" className="absolute inset-0 w-full h-full object-cover" />

        {/* Warm amber gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950/90 via-orange-900/80 to-yellow-800/70" />

        {/* Warm light effect */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            background: 'radial-gradient(ellipse at 30% 40%, rgba(255,180,100,0.4) 0%, transparent 50%)',
          }}
        />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-between p-12 z-10">
          {/* Top - Logo */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <Coffee className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <span className="text-white font-semibold text-lg">NLU Bot Admin</span>
              <div className="text-amber-200/70 text-xs">Warm & Reliable</div>
            </div>
          </div>

          {/* Center - Main content */}
          <div className="max-w-lg">
            <h2 className="text-5xl font-extralight text-white leading-tight">
              따뜻한 대화가
              <br />
              <span className="font-semibold text-amber-200">비즈니스를</span>
              <br />
              성장시킵니다
            </h2>

            <p className="mt-8 text-amber-100/70 text-lg leading-relaxed">
              고객과의 모든 대화를 의미있는 연결로 바꾸고
              <br />
              지속가능한 관계를 구축하세요.
            </p>

            <div className="mt-12 flex items-center gap-8">
              <div className="flex flex-col">
                <span className="text-4xl font-light text-white">1M+</span>
                <span className="text-amber-200/60 text-sm mt-1">일일 대화</span>
              </div>
              <div className="w-px h-14 bg-white/20" />
              <div className="flex flex-col">
                <span className="text-4xl font-light text-white">98%</span>
                <span className="text-amber-200/60 text-sm mt-1">만족도</span>
              </div>
              <div className="w-px h-14 bg-white/20" />
              <div className="flex flex-col">
                <span className="text-4xl font-light text-white">300+</span>
                <span className="text-amber-200/60 text-sm mt-1">파트너사</span>
              </div>
            </div>
          </div>

          {/* Bottom - Trust indicators */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/15">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-amber-100/80 text-sm">안정적 운영</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/15">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-amber-100/80 text-sm">실시간 지원</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/15">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-amber-100/80 text-sm">맞춤형 솔루션</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-gradient-to-b from-amber-50/50 to-white">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Coffee className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-amber-900">NLU Bot Admin</span>
          </div>

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-light text-amber-900">반갑습니다</h1>
            <p className="text-amber-700/60 mt-3">계정에 로그인하세요.</p>
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
              label={<span className="text-sm font-medium text-amber-800">아이디</span>}
              rules={[{ required: true, message: '아이디를 입력해주세요' }]}
              className="!mb-5"
            >
              <Input
                size="large"
                placeholder="아이디를 입력하세요"
                prefix={<User className="h-4 w-4 text-amber-500" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-xl !border-amber-200 hover:!border-amber-400 focus:!border-amber-500"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="text-sm font-medium text-amber-800">비밀번호</span>}
              rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
              className="!mb-5"
            >
              <Input.Password
                size="large"
                placeholder="비밀번호를 입력하세요"
                prefix={<Lock className="h-4 w-4 text-amber-500" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-xl !border-amber-200 hover:!border-amber-400 focus:!border-amber-500"
              />
            </Form.Item>

            <Form.Item label={<span className="text-sm font-medium text-amber-800">테넌트</span>} className="!mb-5">
              <Input
                size="large"
                placeholder="테넌트명 (선택)"
                prefix={<Users className="h-4 w-4 text-amber-500" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-xl !border-amber-200 hover:!border-amber-400 focus:!border-amber-500"
              />
            </Form.Item>

            <Form.Item className="!mb-8">
              <Checkbox disabled={lockState.isLocked} className="text-sm text-amber-700">
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
                  background: lockState.isLocked ? '#E5E5E5' : 'linear-gradient(135deg, #D97706 0%, #C2410C 100%)',
                  boxShadow: lockState.isLocked ? 'none' : '0 4px 14px rgba(217, 119, 6, 0.35)',
                }}
              >
                {lockState.isLocked ? `잠금 해제까지 ${formatTime(lockState.retryAfterSeconds)}` : '로그인'}
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-12 pt-6 border-t border-amber-100">
            <p className="text-xs text-amber-500 text-center">© 2025 BridgeTec. All rights reserved.</p>
          </div>
        </div>
      </div>

      <style>{`
        .ant-checkbox-checked .ant-checkbox-inner {
          background: linear-gradient(135deg, #D97706 0%, #C2410C 100%) !important;
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
