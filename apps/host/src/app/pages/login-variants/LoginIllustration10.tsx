/**
 * 로그인 페이지 - 일러스트 V10 (Desert Dunes)
 * 사막/모래 언덕 이미지 + 따뜻한 대지색 톤
 * 고요하고 웅장한 분위기
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { Compass, Lock, LockKeyhole, User, Users } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

export default function LoginIllustration10() {
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
            <User className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
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
        <div className="mb-6 p-4 rounded-xl bg-stone-100 border border-stone-200">
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
        <div className={cn('mb-6 p-4 rounded-xl border', showWarning ? 'bg-red-50 border-red-100' : 'bg-stone-100 border-stone-200')}>
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
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100">
          <p className="text-sm text-red-600">{loginError.message}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left side - Desert Dunes Image */}
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden">
        {/* Background Image - Desert sand dunes */}
        <img src="https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1400&q=80" alt="Desert Dunes" className="absolute inset-0 w-full h-full object-cover" />

        {/* Warm earth tone gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/75 via-orange-800/60 to-yellow-900/70" />

        {/* Warm sun glow effect */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(ellipse at 80% 20%, rgba(251, 191, 36, 0.4) 0%, transparent 50%)',
          }}
        />

        {/* Sand texture overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-between p-12 z-10">
          {/* Top */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center">
                <Compass className="w-6 h-6 text-amber-200" />
              </div>
              <div>
                <span className="text-white font-medium">NLU Bot Admin</span>
                <div className="text-amber-200/70 text-xs">Pathfinder Platform</div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-amber-100/80 text-sm">Guided</span>
            </div>
          </div>

          {/* Center */}
          <div className="max-w-lg">
            <h2 className="text-5xl font-extralight text-white leading-[1.15] tracking-tight">
              끝없는 여정
              <br />
              <span className="font-semibold text-amber-200">확실한 방향</span>
            </h2>

            <p className="mt-8 text-amber-100/70 text-lg leading-relaxed">
              광활한 데이터의 사막에서도 길을 잃지 않도록,
              <br />
              AI가 가장 확실한 방향을 제시합니다.
            </p>

            <div className="mt-10 flex items-center gap-8">
              <div className="flex flex-col">
                <div className="text-3xl font-extralight text-white">Horizon</div>
                <div className="text-amber-200/50 text-sm mt-1">Unlimited View</div>
              </div>
              <div className="w-px h-14 bg-white/20" />
              <div className="flex flex-col">
                <div className="text-3xl font-extralight text-white">Terra</div>
                <div className="text-amber-200/50 text-sm mt-1">Solid Foundation</div>
              </div>
              <div className="w-px h-14 bg-white/20" />
              <div className="flex flex-col">
                <div className="text-3xl font-extralight text-white">Meridian</div>
                <div className="text-amber-200/50 text-sm mt-1">True Direction</div>
              </div>
            </div>
          </div>

          {/* Bottom - Dune-like wave visualization */}
          <div className="relative">
            <svg className="w-full h-24" viewBox="0 0 400 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="duneGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(251, 191, 36, 0.4)" />
                  <stop offset="100%" stopColor="rgba(251, 191, 36, 0.1)" />
                </linearGradient>
                <linearGradient id="duneGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(245, 158, 11, 0.3)" />
                  <stop offset="100%" stopColor="rgba(245, 158, 11, 0.05)" />
                </linearGradient>
              </defs>
              <path d="M0,100 Q50,60 100,70 T200,50 T300,65 T400,55 L400,100 Z" fill="url(#duneGradient1)" />
              <path d="M0,100 Q75,75 150,80 T300,60 T400,70 L400,100 Z" fill="url(#duneGradient2)" />
            </svg>
            <div className="flex items-center justify-between text-amber-200/50 text-sm -mt-2">
              <span>Continuous discovery</span>
              <span className="flex items-center gap-2">
                <span className="inline-block w-8 h-0.5 bg-gradient-to-r from-amber-400/60 to-transparent" />
                Journey never ends
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-gradient-to-br from-orange-50 via-amber-50/50 to-stone-50">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-stone-900">NLU Bot Admin</span>
          </div>

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-light text-stone-900">시작하기</h1>
            <p className="text-stone-500 mt-3">관리자 계정으로 로그인하세요.</p>
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
                className="!h-12 !rounded-xl !border-stone-200 !bg-white hover:!border-amber-400 focus:!border-amber-500"
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
                className="!h-12 !rounded-xl !border-stone-200 !bg-white hover:!border-amber-400 focus:!border-amber-500"
              />
            </Form.Item>

            <Form.Item label={<span className="text-sm font-medium text-stone-600">테넌트</span>} className="!mb-5">
              <Input
                size="large"
                placeholder="테넌트명 (선택)"
                prefix={<Users className="h-4 w-4 text-stone-400" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-xl !border-stone-200 !bg-white hover:!border-amber-400 focus:!border-amber-500"
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
                className="!h-12 !rounded-xl !font-medium !border-0"
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
