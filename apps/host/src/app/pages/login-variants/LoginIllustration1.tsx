/**
 * 로그인 페이지 - 일러스트 V1 (Geometric Abstract)
 * 기하학적 추상 그래픽
 * 건축적 라인아트, 정적이고 모던한 비주얼
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { Lock, LockKeyhole, User, Users } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

/**
 * Geometric abstract pattern - static, no animations
 */
function GeometricPattern() {
  return (
    <svg viewBox="0 0 500 600" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="grad2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="grad3" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="500" height="600" fill="#0F172A" />

      {/* Large geometric shapes */}
      <polygon points="0,0 250,150 0,300" fill="url(#grad1)" />
      <polygon points="500,200 250,350 500,500" fill="url(#grad2)" />
      <polygon points="150,400 350,400 250,600" fill="url(#grad3)" />

      {/* Overlapping rectangles */}
      <rect x="50" y="180" width="180" height="180" fill="none" stroke="#60A5FA" strokeWidth="1" opacity="0.5" transform="rotate(15 140 270)" />
      <rect x="280" y="80" width="150" height="150" fill="none" stroke="#93C5FD" strokeWidth="1" opacity="0.4" transform="rotate(-10 355 155)" />
      <rect x="320" y="380" width="120" height="120" fill="none" stroke="#60A5FA" strokeWidth="1" opacity="0.3" transform="rotate(25 380 440)" />

      {/* Circles */}
      <circle cx="400" cy="120" r="60" fill="none" stroke="#3B82F6" strokeWidth="2" opacity="0.5" />
      <circle cx="400" cy="120" r="40" fill="none" stroke="#60A5FA" strokeWidth="1" opacity="0.4" />
      <circle cx="100" cy="480" r="80" fill="none" stroke="#93C5FD" strokeWidth="1.5" opacity="0.3" />
      <circle cx="100" cy="480" r="50" fill="#3B82F6" opacity="0.15" />

      {/* Connecting lines */}
      <line x1="0" y1="150" x2="250" y2="150" stroke="#60A5FA" strokeWidth="1" opacity="0.3" />
      <line x1="250" y1="150" x2="500" y2="350" stroke="#60A5FA" strokeWidth="1" opacity="0.3" />
      <line x1="150" y1="0" x2="350" y2="600" stroke="#93C5FD" strokeWidth="0.5" opacity="0.2" />
      <line x1="350" y1="0" x2="150" y2="600" stroke="#93C5FD" strokeWidth="0.5" opacity="0.2" />

      {/* Dot grid pattern */}
      <g fill="#60A5FA" opacity="0.3">
        {[...Array(8)].map((_, row) => [...Array(6)].map((_, col) => <circle key={`${row}-${col}`} cx={80 + col * 70} cy={50 + row * 70} r="2" />))}
      </g>

      {/* Accent shapes */}
      <polygon points="250,280 280,320 250,360 220,320" fill="#60A5FA" opacity="0.6" />
      <polygon points="420,450 450,480 420,510 390,480" fill="#3B82F6" opacity="0.4" />

      {/* Horizontal lines */}
      <g stroke="#93C5FD" strokeWidth="0.5" opacity="0.2">
        <line x1="0" y1="100" x2="500" y2="100" />
        <line x1="0" y1="250" x2="500" y2="250" />
        <line x1="0" y1="400" x2="500" y2="400" />
        <line x1="0" y1="550" x2="500" y2="550" />
      </g>
    </svg>
  );
}

export default function LoginIllustration1() {
  const { form, lockState, loginError, isPending, passwordPolicy, changePasswordDialogRef, onFinish, onFinishFailed, handlePasswordChange, formatTime } = useLoginLogic();

  const renderErrorAlert = () => {
    if (lockState.isLocked) {
      return (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-100">
          <div className="flex items-start gap-3">
            <LockKeyhole className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-800">계정 잠금</h4>
              <p className="text-sm text-red-600 mt-1">보안을 위해 일시적으로 잠겼습니다.</p>
              <div className="mt-2 text-2xl font-semibold text-red-700 tabular-nums">{formatTime(lockState.retryAfterSeconds)}</div>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'account_dormant') {
      return (
        <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-100">
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
        <div className="mb-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-gray-700">비활성화 계정</h4>
              <p className="text-sm text-gray-500 mt-1">{loginError.message}</p>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'invalid_grant') {
      const showWarning = loginError.remainingAttempts !== undefined && loginError.remainingAttempts <= 2;
      return (
        <div className={cn('mb-6 p-4 rounded-lg border', showWarning ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-200')}>
          <div className="flex items-start gap-3">
            <Lock className={cn('h-5 w-5 flex-shrink-0 mt-0.5', showWarning ? 'text-red-500' : 'text-gray-400')} />
            <div>
              <h4 className={cn('text-sm font-semibold', showWarning ? 'text-red-800' : 'text-gray-700')}>로그인 실패</h4>
              <p className={cn('text-sm mt-1', showWarning ? 'text-red-600' : 'text-gray-500')}>{loginError.message}</p>
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
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-100">
          <p className="text-sm text-red-600">{loginError.message}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left side - Geometric pattern */}
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden">
        <GeometricPattern />

        {/* Overlay content */}
        <div className="absolute inset-0 flex flex-col justify-between p-12">
          {/* Top */}
          <div>
            <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Center text */}
          <div className="max-w-md">
            <h2 className="text-4xl font-light text-white leading-tight tracking-tight">
              Intelligent
              <br />
              <span className="font-semibold">Conversation</span>
              <br />
              Platform
            </h2>
            <p className="mt-6 text-blue-200/80 text-lg leading-relaxed">자연어 이해 기반의 차세대 대화형 AI 관리 시스템</p>
          </div>

          {/* Bottom */}
          <div className="flex items-center gap-8 text-blue-200/60 text-sm">
            <span>Enterprise Ready</span>
            <span className="w-1 h-1 rounded-full bg-blue-200/40" />
            <span>Secure</span>
            <span className="w-1 h-1 rounded-full bg-blue-200/40" />
            <span>Scalable</span>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-slate-900">NLU Bot Admin</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-slate-900">로그인</h1>
            <p className="text-slate-500 mt-2">관리자 계정으로 로그인하세요.</p>
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
              label={<span className="text-sm font-medium text-slate-700">아이디</span>}
              rules={[{ required: true, message: '아이디를 입력해주세요' }]}
              className="!mb-5"
            >
              <Input
                size="large"
                placeholder="아이디를 입력하세요"
                prefix={<User className="h-4 w-4 text-slate-400" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-lg !border-slate-200 hover:!border-blue-400 focus:!border-blue-500"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="text-sm font-medium text-slate-700">비밀번호</span>}
              rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
              className="!mb-5"
            >
              <Input.Password
                size="large"
                placeholder="비밀번호를 입력하세요"
                prefix={<Lock className="h-4 w-4 text-slate-400" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-lg !border-slate-200 hover:!border-blue-400 focus:!border-blue-500"
              />
            </Form.Item>

            <Form.Item label={<span className="text-sm font-medium text-slate-700">테넌트</span>} className="!mb-5">
              <Input
                size="large"
                placeholder="테넌트명 (선택)"
                prefix={<Users className="h-4 w-4 text-slate-400" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-lg !border-slate-200 hover:!border-blue-400 focus:!border-blue-500"
              />
            </Form.Item>

            <Form.Item className="!mb-6">
              <Checkbox disabled={lockState.isLocked} className="text-sm text-slate-600">
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
                className="!h-12 !rounded-lg !font-medium !border-0"
                style={{
                  background: lockState.isLocked ? '#CBD5E1' : 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
                  boxShadow: lockState.isLocked ? 'none' : '0 4px 14px rgba(59, 130, 246, 0.35)',
                }}
              >
                {lockState.isLocked ? `잠금 해제까지 ${formatTime(lockState.retryAfterSeconds)}` : '로그인'}
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-10 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center">© 2025 BridgeTec. All rights reserved.</p>
          </div>
        </div>
      </div>

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
