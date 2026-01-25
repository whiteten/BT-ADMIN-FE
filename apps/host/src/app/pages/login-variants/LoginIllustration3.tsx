/**
 * 로그인 페이지 - 일러스트 V3 (Circuit Data Flow)
 * 데이터 플로우 회로 그래픽
 * 기술적 정밀함, 데이터 처리 시각화
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { Lock, LockKeyhole, User, Users } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

/**
 * Circuit board / Data flow visualization - static
 */
function CircuitPattern() {
  return (
    <svg viewBox="0 0 500 650" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="circuitGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0D9488" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0F766E" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="circuitGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0D9488" stopOpacity="0.5" />
        </linearGradient>
        <filter id="circuitGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Dark background */}
      <rect width="500" height="650" fill="#0A0F1A" />

      {/* Grid lines - subtle */}
      <g stroke="#134E4A" strokeWidth="0.3" opacity="0.4">
        {[...Array(27)].map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 25} x2="500" y2={i * 25} />
        ))}
        {[...Array(21)].map((_, i) => (
          <line key={`v${i}`} x1={i * 25} y1="0" x2={i * 25} y2="650" />
        ))}
      </g>

      {/* Main circuit paths - horizontal */}
      <g stroke="#14B8A6" strokeWidth="2" fill="none" opacity="0.6">
        <path d="M0 150 H120 L140 170 H220 L240 150 H320 L340 170 H500" />
        <path d="M0 300 H80 L100 280 H180 L200 300 H280 L300 280 H380 L400 300 H500" />
        <path d="M0 450 H160 L180 430 H260 L280 450 H360 L380 430 H500" />
      </g>

      {/* Main circuit paths - vertical */}
      <g stroke="#0D9488" strokeWidth="2" fill="none" opacity="0.5">
        <path d="M120 0 V100 L140 120 V200 L120 220 V320 L140 340 V650" />
        <path d="M250 0 V80 L270 100 V180 L250 200 V280 L270 300 V380 L250 400 V650" />
        <path d="M380 0 V120 L360 140 V240 L380 260 V360 L360 380 V480 L380 500 V650" />
      </g>

      {/* Junction nodes */}
      <g fill="#14B8A6" filter="url(#circuitGlow)">
        <circle cx="120" cy="150" r="6" />
        <circle cx="250" cy="150" r="5" />
        <circle cx="380" cy="150" r="5" />
        <circle cx="100" cy="300" r="5" />
        <circle cx="200" cy="300" r="6" />
        <circle cx="300" cy="300" r="5" />
        <circle cx="400" cy="300" r="5" />
        <circle cx="180" cy="450" r="5" />
        <circle cx="280" cy="450" r="6" />
        <circle cx="380" cy="450" r="5" />
      </g>

      {/* Data processors - rectangles */}
      <g fill="none" stroke="#2DD4BF" strokeWidth="1.5">
        <rect x="190" y="190" width="60" height="40" rx="4" />
        <rect x="70" y="340" width="50" height="35" rx="4" />
        <rect x="310" y="380" width="55" height="38" rx="4" />
        <rect x="180" y="520" width="65" height="42" rx="4" />
      </g>

      {/* Processor inner details */}
      <g fill="#14B8A6" opacity="0.5">
        <rect x="200" y="200" width="40" height="4" />
        <rect x="200" y="210" width="30" height="4" />
        <rect x="200" y="220" width="35" height="4" />
        <rect x="80" y="350" width="30" height="3" />
        <rect x="80" y="358" width="25" height="3" />
        <rect x="320" y="392" width="35" height="3" />
        <rect x="320" y="400" width="28" height="3" />
        <rect x="190" y="532" width="45" height="4" />
        <rect x="190" y="542" width="38" height="4" />
      </g>

      {/* Central processing unit */}
      <g transform="translate(200, 270)">
        <rect x="0" y="0" width="100" height="60" rx="6" fill="url(#circuitGrad1)" />
        <rect x="10" y="10" width="80" height="40" rx="4" fill="none" stroke="#2DD4BF" strokeWidth="1" />
        <g fill="#5EEAD4" opacity="0.8">
          <rect x="20" y="22" width="12" height="6" />
          <rect x="38" y="22" width="12" height="6" />
          <rect x="56" y="22" width="12" height="6" />
          <rect x="74" y="22" width="12" height="6" />
          <rect x="20" y="32" width="12" height="6" />
          <rect x="38" y="32" width="12" height="6" />
          <rect x="56" y="32" width="12" height="6" />
          <rect x="74" y="32" width="12" height="6" />
        </g>
      </g>

      {/* Data flow dots on paths */}
      <g fill="#5EEAD4">
        <circle cx="60" cy="150" r="3" opacity="0.8" />
        <circle cx="180" cy="150" r="2.5" opacity="0.6" />
        <circle cx="300" cy="150" r="2.5" opacity="0.6" />
        <circle cx="440" cy="150" r="3" opacity="0.8" />
        <circle cx="40" cy="300" r="2.5" opacity="0.7" />
        <circle cx="140" cy="300" r="3" opacity="0.8" />
        <circle cx="340" cy="300" r="2.5" opacity="0.6" />
        <circle cx="460" cy="300" r="3" opacity="0.8" />
        <circle cx="80" cy="450" r="2.5" opacity="0.6" />
        <circle cx="220" cy="450" r="3" opacity="0.8" />
        <circle cx="320" cy="450" r="2.5" opacity="0.6" />
        <circle cx="450" cy="450" r="3" opacity="0.8" />
      </g>

      {/* Corner brackets */}
      <g stroke="#0D9488" strokeWidth="2" fill="none">
        <path d="M20 20 L20 50 M20 20 L50 20" />
        <path d="M480 20 L480 50 M480 20 L450 20" />
        <path d="M20 630 L20 600 M20 630 L50 630" />
        <path d="M480 630 L480 600 M480 630 L450 630" />
      </g>

      {/* Decorative elements */}
      <g fill="none" stroke="#14B8A6" strokeWidth="0.5" opacity="0.3">
        <circle cx="70" cy="80" r="20" />
        <circle cx="70" cy="80" r="12" />
        <circle cx="430" cy="580" r="25" />
        <circle cx="430" cy="580" r="15" />
      </g>

      {/* Small connection points */}
      <g fill="#2DD4BF" opacity="0.4">
        {[50, 150, 250, 350, 450].map((x) => [75, 225, 375, 525].map((y) => <rect key={`${x}-${y}`} x={x - 2} y={y - 2} width="4" height="4" />))}
      </g>
    </svg>
  );
}

export default function LoginIllustration3() {
  const { form, lockState, loginError, isPending, passwordPolicy, changePasswordDialogRef, onFinish, onFinishFailed, handlePasswordChange, formatTime } = useLoginLogic();

  const renderErrorAlert = () => {
    if (lockState.isLocked) {
      return (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-start gap-3">
            <LockKeyhole className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-300">계정 잠금</h4>
              <p className="text-sm text-red-400/80 mt-1">보안을 위해 일시적으로 잠겼습니다.</p>
              <div className="mt-2 text-2xl font-semibold text-red-400 tabular-nums">{formatTime(lockState.retryAfterSeconds)}</div>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'account_dormant') {
      return (
        <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
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
        <div className="mb-6 p-4 rounded-lg bg-slate-500/10 border border-slate-500/20">
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
        <div className={cn('mb-6 p-4 rounded-lg border', showWarning ? 'bg-red-500/10 border-red-500/20' : 'bg-slate-500/10 border-slate-500/20')}>
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
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{loginError.message}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen w-full flex bg-[#0A0F1A]">
      {/* Left side - Circuit pattern */}
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden">
        <CircuitPattern />

        {/* Overlay content */}
        <div className="absolute inset-0 flex flex-col justify-between p-12">
          {/* Top */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500/20 backdrop-blur-sm border border-teal-500/30 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <path d="M9 9h6v6H9z" />
                  <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
                </svg>
              </div>
              <span className="text-teal-300/80 font-medium tracking-wide">DATA FLOW</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30">
              <span className="text-teal-400 text-xs font-medium tracking-wider">PROCESSING</span>
            </div>
          </div>

          {/* Center */}
          <div className="max-w-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 rounded-full bg-teal-400" />
              <div className="h-px flex-1 bg-gradient-to-r from-teal-400/50 to-transparent" />
            </div>
            <h2 className="text-4xl font-light text-white leading-tight tracking-tight">
              Process.
              <br />
              <span className="text-teal-400 font-medium">Analyze.</span>
              <br />
              Optimize.
            </h2>
            <p className="mt-8 text-slate-400 leading-relaxed">
              실시간 데이터 처리와 인텔리전트 분석으로
              <br />
              대화형 AI의 성능을 극대화합니다.
            </p>
          </div>

          {/* Bottom */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-400" />
              <span className="text-slate-400 text-sm">Real-time Processing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-400/60" />
              <span className="text-slate-400 text-sm">Smart Analytics</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-400/40" />
              <span className="text-slate-400 text-sm">Auto Scaling</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-[#0F1520]">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <path d="M9 9h6v6H9z" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-white">NLU Bot Admin</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-white">로그인</h1>
            <p className="text-slate-400 mt-2">관리자 계정으로 로그인하세요.</p>
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
              label={<span className="text-sm font-medium text-slate-300">아이디</span>}
              rules={[{ required: true, message: '아이디를 입력해주세요' }]}
              className="!mb-5"
            >
              <Input
                size="large"
                placeholder="아이디를 입력하세요"
                prefix={<User className="h-4 w-4 text-slate-500" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-lg !bg-slate-800/50 !border-slate-700 !text-white placeholder:!text-slate-500 hover:!border-teal-500/50 focus:!border-teal-500"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="text-sm font-medium text-slate-300">비밀번호</span>}
              rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
              className="!mb-5"
            >
              <Input.Password
                size="large"
                placeholder="비밀번호를 입력하세요"
                prefix={<Lock className="h-4 w-4 text-slate-500" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-lg !bg-slate-800/50 !border-slate-700 !text-white placeholder:!text-slate-500 hover:!border-teal-500/50 focus:!border-teal-500 [&_.ant-input]:!bg-transparent [&_.ant-input]:!text-white [&_.ant-input-password-icon]:!text-slate-500"
              />
            </Form.Item>

            <Form.Item label={<span className="text-sm font-medium text-slate-300">테넌트</span>} className="!mb-5">
              <Input
                size="large"
                placeholder="테넌트명 (선택)"
                prefix={<Users className="h-4 w-4 text-slate-500" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-lg !bg-slate-800/50 !border-slate-700 !text-white placeholder:!text-slate-500 hover:!border-teal-500/50 focus:!border-teal-500"
              />
            </Form.Item>

            <Form.Item className="!mb-6">
              <Checkbox disabled={lockState.isLocked} className="text-sm text-slate-400 [&_.ant-checkbox-inner]:!bg-slate-800 [&_.ant-checkbox-inner]:!border-slate-600">
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
                  background: lockState.isLocked ? 'rgba(100, 116, 139, 0.3)' : 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
                  boxShadow: lockState.isLocked ? 'none' : '0 4px 14px rgba(20, 184, 166, 0.35)',
                }}
              >
                {lockState.isLocked ? `잠금 해제까지 ${formatTime(lockState.retryAfterSeconds)}` : '로그인'}
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-10 pt-6 border-t border-slate-800">
            <p className="text-xs text-slate-600 text-center">© 2025 BridgeTec. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Global dark theme overrides */}
      <style>{`
        .ant-input-affix-wrapper:focus-within {
          box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.2) !important;
        }
        .ant-form-item-explain-error {
          color: #f87171 !important;
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
