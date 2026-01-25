/**
 * 로그인 페이지 - 오리지널 V5 (Corporate Blue)
 * 전문적인 기업용 블루 테마
 * 현대 오피스 빌딩 이미지 + 딥 블루 그라데이션
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { Building2, Lock, LockKeyhole, User, Users } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

export default function LoginOriginal5() {
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
        <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-slate-700">비활성화 계정</h4>
              <p className="text-sm text-slate-500 mt-1">{loginError.message}</p>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'invalid_grant') {
      const showWarning = loginError.remainingAttempts !== undefined && loginError.remainingAttempts <= 2;
      return (
        <div className={cn('mb-6 p-4 rounded-xl border', showWarning ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-200')}>
          <div className="flex items-start gap-3">
            <Lock className={cn('h-5 w-5 flex-shrink-0 mt-0.5', showWarning ? 'text-red-500' : 'text-slate-400')} />
            <div>
              <h4 className={cn('text-sm font-semibold', showWarning ? 'text-red-800' : 'text-slate-700')}>로그인 실패</h4>
              <p className={cn('text-sm mt-1', showWarning ? 'text-red-600' : 'text-slate-500')}>{loginError.message}</p>
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
      {/* Left side - Corporate Office Image */}
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden">
        {/* Background Image - Modern office building */}
        <img
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1400&q=80"
          alt="Corporate office building"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Deep blue gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/95 via-blue-900/85 to-blue-800/70" />

        {/* Subtle geometric pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-between p-12 z-10">
          {/* Top - Logo */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <span className="text-white font-semibold text-lg tracking-wide">NLU Bot Admin</span>
              <div className="text-blue-300/70 text-xs tracking-wider">Enterprise Solution</div>
            </div>
          </div>

          {/* Center - Main content */}
          <div className="max-w-lg">
            <div className="w-16 h-1 bg-blue-400 mb-8" />
            <h2 className="text-5xl font-light text-white leading-tight tracking-tight">
              비즈니스의
              <br />
              <span className="font-bold text-blue-300">핵심 파트너</span>
            </h2>

            <p className="mt-8 text-blue-100/70 text-lg leading-relaxed">
              기업 환경에 최적화된 AI 대화 플랫폼으로
              <br />
              업무 효율성을 극대화하세요.
            </p>

            <div className="mt-12 flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-4xl font-light text-white">99.9%</span>
                <span className="text-blue-300/60 text-sm mt-1">가동률</span>
              </div>
              <div className="w-px h-14 bg-white/20" />
              <div className="flex flex-col">
                <span className="text-4xl font-light text-white">500+</span>
                <span className="text-blue-300/60 text-sm mt-1">기업 고객</span>
              </div>
              <div className="w-px h-14 bg-white/20" />
              <div className="flex flex-col">
                <span className="text-4xl font-light text-white">ISO</span>
                <span className="text-blue-300/60 text-sm mt-1">인증</span>
              </div>
            </div>
          </div>

          {/* Bottom - Trust badges */}
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10">
              <span className="text-blue-200/80 text-sm">SOC 2 Certified</span>
            </div>
            <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10">
              <span className="text-blue-200/80 text-sm">GDPR Compliant</span>
            </div>
            <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10">
              <span className="text-blue-200/80 text-sm">24/7 Support</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-slate-900">NLU Bot Admin</span>
          </div>

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-semibold text-slate-900">로그인</h1>
            <p className="text-slate-500 mt-3">관리자 계정으로 접속하세요.</p>
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
              label={<span className="text-sm font-medium text-slate-600">아이디</span>}
              rules={[{ required: true, message: '아이디를 입력해주세요' }]}
              className="!mb-5"
            >
              <Input
                size="large"
                placeholder="아이디를 입력하세요"
                prefix={<User className="h-4 w-4 text-slate-400" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-xl !border-slate-200 hover:!border-blue-400 focus:!border-blue-500"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="text-sm font-medium text-slate-600">비밀번호</span>}
              rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
              className="!mb-5"
            >
              <Input.Password
                size="large"
                placeholder="비밀번호를 입력하세요"
                prefix={<Lock className="h-4 w-4 text-slate-400" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-xl !border-slate-200 hover:!border-blue-400 focus:!border-blue-500"
              />
            </Form.Item>

            <Form.Item label={<span className="text-sm font-medium text-slate-600">테넌트</span>} className="!mb-5">
              <Input
                size="large"
                placeholder="테넌트명 (선택)"
                prefix={<Users className="h-4 w-4 text-slate-400" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-xl !border-slate-200 hover:!border-blue-400 focus:!border-blue-500"
              />
            </Form.Item>

            <Form.Item className="!mb-8">
              <Checkbox disabled={lockState.isLocked} className="text-sm text-slate-500">
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
                  background: lockState.isLocked ? '#CBD5E1' : 'linear-gradient(135deg, #1E40AF 0%, #1D4ED8 100%)',
                  boxShadow: lockState.isLocked ? 'none' : '0 4px 14px rgba(30, 64, 175, 0.35)',
                }}
              >
                {lockState.isLocked ? `잠금 해제까지 ${formatTime(lockState.retryAfterSeconds)}` : '로그인'}
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-12 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center">© 2025 BridgeTec. All rights reserved.</p>
          </div>
        </div>
      </div>

      <style>{`
        .ant-checkbox-checked .ant-checkbox-inner {
          background-color: #1D4ED8 !important;
          border-color: #1D4ED8 !important;
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
