/**
 * 로그인 페이지 - 일러스트 V2 (Network Topology)
 * 네트워크 노드 그래픽
 * 기술적 신뢰감, 데이터 연결성 시각화
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { Lock, LockKeyhole, User, Users } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

/**
 * Network topology visualization - static, professional
 */
function NetworkGraph() {
  // Node positions
  const nodes = [
    { x: 250, y: 300, r: 24, primary: true },
    { x: 120, y: 180, r: 16 },
    { x: 380, y: 160, r: 18 },
    { x: 80, y: 340, r: 14 },
    { x: 420, y: 320, r: 15 },
    { x: 180, y: 450, r: 12 },
    { x: 350, y: 470, r: 14 },
    { x: 60, y: 500, r: 10 },
    { x: 450, y: 480, r: 11 },
    { x: 160, y: 80, r: 12 },
    { x: 340, y: 60, r: 10 },
    { x: 480, y: 220, r: 8 },
    { x: 20, y: 240, r: 9 },
    { x: 300, y: 550, r: 10 },
    { x: 100, y: 580, r: 8 },
  ];

  // Connections between nodes
  const connections = [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 5],
    [0, 6],
    [1, 9],
    [1, 12],
    [2, 10],
    [2, 11],
    [3, 7],
    [4, 8],
    [5, 7],
    [5, 13],
    [6, 8],
    [6, 13],
    [9, 10],
    [13, 14],
    [1, 3],
    [2, 4],
    [5, 6],
  ];

  return (
    <svg viewBox="0 0 500 650" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="nodeGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#3B82F6" />
        </radialGradient>
        <radialGradient id="primaryNodeGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="100%" stopColor="#2563EB" />
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Background */}
      <rect width="500" height="650" fill="#0C1222" />

      {/* Subtle grid */}
      <g stroke="#1E3A5F" strokeWidth="0.5" opacity="0.3">
        {[...Array(14)].map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 50} x2="500" y2={i * 50} />
        ))}
        {[...Array(11)].map((_, i) => (
          <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="650" />
        ))}
      </g>

      {/* Connection lines */}
      <g stroke="#3B82F6" strokeWidth="1" opacity="0.4">
        {connections.map(([from, to], i) => (
          <line key={i} x1={nodes[from].x} y1={nodes[from].y} x2={nodes[to].x} y2={nodes[to].y} />
        ))}
      </g>

      {/* Data flow indicators on some lines */}
      <g fill="#60A5FA" opacity="0.6">
        {[
          [0, 1],
          [0, 2],
          [0, 4],
          [1, 9],
          [2, 10],
        ].map(([from, to], i) => {
          const midX = (nodes[from].x + nodes[to].x) / 2;
          const midY = (nodes[from].y + nodes[to].y) / 2;
          return <circle key={i} cx={midX} cy={midY} r="3" />;
        })}
      </g>

      {/* Nodes */}
      {nodes.map((node, i) => (
        <g key={i}>
          {/* Outer ring for primary node */}
          {node.primary && (
            <>
              <circle cx={node.x} cy={node.y} r={node.r + 12} fill="none" stroke="#3B82F6" strokeWidth="1" opacity="0.3" />
              <circle cx={node.x} cy={node.y} r={node.r + 6} fill="none" stroke="#60A5FA" strokeWidth="1" opacity="0.5" />
            </>
          )}
          {/* Node body */}
          <circle cx={node.x} cy={node.y} r={node.r} fill={node.primary ? 'url(#primaryNodeGrad)' : 'url(#nodeGrad)'} filter={node.primary ? 'url(#glow)' : undefined} />
          {/* Inner highlight */}
          <circle cx={node.x - node.r * 0.25} cy={node.y - node.r * 0.25} r={node.r * 0.35} fill="white" opacity="0.3" />
        </g>
      ))}

      {/* Central node icon */}
      <g transform={`translate(${nodes[0].x - 10}, ${nodes[0].y - 10})`}>
        <path d="M10 2L2 6l8 4 8-4-8-4zM2 14l8 4 8-4M2 10l8 4 8-4" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Decorative hexagons */}
      <g fill="none" stroke="#3B82F6" strokeWidth="0.5" opacity="0.2">
        <polygon points="40,100 60,90 80,100 80,120 60,130 40,120" />
        <polygon points="420,550 440,540 460,550 460,570 440,580 420,570" />
      </g>

      {/* Corner accents */}
      <path d="M0 0 L40 0 L40 5 L5 5 L5 40 L0 40 Z" fill="#3B82F6" opacity="0.3" />
      <path d="M500 650 L460 650 L460 645 L495 645 L495 610 L500 610 Z" fill="#3B82F6" opacity="0.3" />
    </svg>
  );
}

export default function LoginIllustration2() {
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
    <div className="min-h-screen w-full flex bg-[#0C1222]">
      {/* Left side - Network visualization */}
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden">
        <NetworkGraph />

        {/* Overlay content */}
        <div className="absolute inset-0 flex flex-col justify-between p-12">
          {/* Top */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-blue-300/80 font-medium">NLU Bot Admin</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-emerald-400/80 text-sm">System Online</span>
            </div>
          </div>

          {/* Center */}
          <div className="max-w-md">
            <div className="text-blue-400/60 text-sm font-medium tracking-wider uppercase mb-4">Conversational AI Platform</div>
            <h2 className="text-4xl font-light text-white leading-tight">
              Connect.
              <br />
              <span className="text-blue-400">Understand.</span>
              <br />
              Respond.
            </h2>
            <p className="mt-6 text-slate-400 leading-relaxed">
              실시간 대화 분석과 지능형 응답 시스템으로
              <br />
              고객 경험을 혁신합니다.
            </p>
          </div>

          {/* Bottom stats */}
          <div className="flex gap-12">
            <div>
              <div className="text-3xl font-light text-white">99.9%</div>
              <div className="text-slate-500 text-sm mt-1">Uptime</div>
            </div>
            <div>
              <div className="text-3xl font-light text-white">50ms</div>
              <div className="text-slate-500 text-sm mt-1">Response</div>
            </div>
            <div>
              <div className="text-3xl font-light text-white">24/7</div>
              <div className="text-slate-500 text-sm mt-1">Support</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-[#0F172A]">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
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
                className="!h-12 !rounded-lg !bg-slate-800/50 !border-slate-700 !text-white placeholder:!text-slate-500 hover:!border-blue-500/50 focus:!border-blue-500"
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
                className="!h-12 !rounded-lg !bg-slate-800/50 !border-slate-700 !text-white placeholder:!text-slate-500 hover:!border-blue-500/50 focus:!border-blue-500 [&_.ant-input]:!bg-transparent [&_.ant-input]:!text-white [&_.ant-input-password-icon]:!text-slate-500"
              />
            </Form.Item>

            <Form.Item label={<span className="text-sm font-medium text-slate-300">테넌트</span>} className="!mb-5">
              <Input
                size="large"
                placeholder="테넌트명 (선택)"
                prefix={<Users className="h-4 w-4 text-slate-500" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-lg !bg-slate-800/50 !border-slate-700 !text-white placeholder:!text-slate-500 hover:!border-blue-500/50 focus:!border-blue-500"
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
                  background: lockState.isLocked ? 'rgba(100, 116, 139, 0.3)' : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                  boxShadow: lockState.isLocked ? 'none' : '0 4px 14px rgba(59, 130, 246, 0.4)',
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
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
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
