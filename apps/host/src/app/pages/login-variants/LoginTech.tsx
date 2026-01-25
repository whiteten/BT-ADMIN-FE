/**
 * 로그인 페이지 - 테크/AI 버전
 * Cyber-Neural / Futuristic AI Interface 스타일
 * 글래스모피즘, 네온 글로우, 뉴럴 네트워크 애니메이션
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { Bot, Brain, Lock, LockKeyhole, Sparkles, User, Users, Zap } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

export default function LoginTech() {
  const { form, lockState, loginError, isPending, passwordPolicy, changePasswordDialogRef, onFinish, onFinishFailed, handlePasswordChange, formatTime } = useLoginLogic();

  /**
   * Render login error alert - Tech style with glow effects
   */
  const renderErrorAlert = () => {
    if (lockState.isLocked) {
      return (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-red-400 font-medium text-sm">
            <LockKeyhole className="h-4 w-4 animate-pulse" />
            <span className="uppercase tracking-wider text-xs">System Locked</span>
          </div>
          <p className="mt-2 text-red-300/80 text-sm">로그인 시도 횟수를 초과했습니다.</p>
          <div className="mt-3 text-3xl font-mono text-red-400 tabular-nums tracking-wider">{formatTime(lockState.retryAfterSeconds)}</div>
        </div>
      );
    }

    if (loginError.error === 'account_dormant') {
      return (
        <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-amber-400 font-medium text-sm uppercase tracking-wider">
            <User className="h-4 w-4" />
            휴면 계정
          </div>
          <p className="mt-2 text-amber-300/80 text-sm">{loginError.message}</p>
        </div>
      );
    }

    if (loginError.error === 'account_disabled') {
      return (
        <div className="mb-6 p-4 rounded-lg bg-gray-500/10 border border-gray-500/30 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-gray-400 font-medium text-sm uppercase tracking-wider">
            <User className="h-4 w-4" />
            비활성화 계정
          </div>
          <p className="mt-2 text-gray-300/80 text-sm">{loginError.message}</p>
        </div>
      );
    }

    if (loginError.error === 'invalid_grant') {
      const showWarning = loginError.remainingAttempts !== undefined && loginError.remainingAttempts <= 2;
      return (
        <div className={cn('mb-6 p-4 rounded-lg backdrop-blur-sm border', showWarning ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10')}>
          <div className={cn('flex items-center gap-2 font-medium text-sm uppercase tracking-wider', showWarning ? 'text-red-400' : 'text-blue-300')}>
            <Lock className="h-4 w-4" />
            Access Denied
          </div>
          <p className={cn('mt-2 text-sm', showWarning ? 'text-red-300/80' : 'text-white/60')}>{loginError.message}</p>
          {loginError.remainingAttempts !== undefined && (
            <p className={cn('mt-2 text-xs font-mono', showWarning && 'text-red-400')}>Attempts remaining: {loginError.remainingAttempts}</p>
          )}
        </div>
      );
    }

    if (loginError.message) {
      return (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 backdrop-blur-sm">
          <p className="text-red-300/80 text-sm">{loginError.message}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Animated gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(14, 165, 233, 0.05) 0%, transparent 70%),
            linear-gradient(180deg, #0a0f1a 0%, #0d1525 50%, #0a1628 100%)
          `,
        }}
      />

      {/* Animated neural network nodes */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating nodes */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-blue-500/20 blur-sm"
            style={{
              width: `${8 + (i % 3) * 4}px`,
              height: `${8 + (i % 3) * 4}px`,
              left: `${10 + ((i * 7) % 80)}%`,
              top: `${15 + ((i * 11) % 70)}%`,
              animation: `float-node ${4 + (i % 3)}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
            }}
          />
        ))}

        {/* Connection lines (SVG) */}
        <svg className="absolute inset-0 w-full h-full opacity-20">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0)" />
              <stop offset="50%" stopColor="rgba(59, 130, 246, 0.5)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
            </linearGradient>
          </defs>
          {[...Array(8)].map((_, i) => (
            <line
              key={i}
              x1={`${15 + ((i * 10) % 70)}%`}
              y1={`${20 + ((i * 8) % 60)}%`}
              x2={`${35 + ((i * 12) % 60)}%`}
              y2={`${30 + ((i * 9) % 50)}%`}
              stroke="url(#lineGradient)"
              strokeWidth="1"
              className="animate-pulse"
              style={{ animationDelay: `${i * 0.5}s` }}
            />
          ))}
        </svg>
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(59, 130, 246, 0.5) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(59, 130, 246, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
        {/* Glassmorphism login card */}
        <div
          className="w-full max-w-md rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: `
              0 0 40px rgba(59, 130, 246, 0.1),
              0 25px 50px -12px rgba(0, 0, 0, 0.5),
              inset 0 1px 0 rgba(255, 255, 255, 0.1)
            `,
          }}
        >
          {/* Header */}
          <div className="px-8 pt-10 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, var(--color-bt-primary), #6366f1)',
                  boxShadow: '0 0 30px rgba(59, 130, 246, 0.4)',
                }}
              >
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white tracking-tight">NLU Admin</h1>
                <p className="text-xs text-blue-300/60 font-mono uppercase tracking-wider">Bot Management System</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-white/40 text-xs">
              <Sparkles className="w-3 h-3" />
              <span className="font-mono">AI-Powered Natural Language Understanding</span>
            </div>
          </div>

          {/* Divider with glow */}
          <div className="h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

          {/* Form */}
          <div className="px-8 py-8">
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
                label={<span className="text-xs font-mono text-blue-300/70 uppercase tracking-wider">User ID</span>}
                rules={[{ required: true, message: '아이디를 입력해주세요' }]}
                className="!mb-5"
              >
                <Input
                  size="large"
                  placeholder="Enter your ID"
                  prefix={<User className="h-4 w-4 text-blue-400/50" />}
                  disabled={lockState.isLocked}
                  className="!bg-white/5 !border-white/10 !text-white placeholder:!text-white/30 !rounded-lg hover:!border-blue-500/50 focus:!border-blue-500 !shadow-none"
                  style={{ backdropFilter: 'blur(10px)' }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span className="text-xs font-mono text-blue-300/70 uppercase tracking-wider">Password</span>}
                rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
                className="!mb-5"
              >
                <Input.Password
                  size="large"
                  placeholder="Enter your password"
                  prefix={<Lock className="h-4 w-4 text-blue-400/50" />}
                  disabled={lockState.isLocked}
                  className="!bg-white/5 !border-white/10 !text-white placeholder:!text-white/30 !rounded-lg hover:!border-blue-500/50 focus:!border-blue-500 !shadow-none [&_.ant-input]:!bg-transparent [&_.ant-input]:!text-white [&_.ant-input-password-icon]:!text-white/40"
                  style={{ backdropFilter: 'blur(10px)' }}
                />
              </Form.Item>

              <Form.Item label={<span className="text-xs font-mono text-blue-300/70 uppercase tracking-wider">Tenant</span>} className="!mb-5">
                <Input
                  size="large"
                  placeholder="Tenant name (optional)"
                  prefix={<Users className="h-4 w-4 text-blue-400/50" />}
                  disabled={lockState.isLocked}
                  className="!bg-white/5 !border-white/10 !text-white placeholder:!text-white/30 !rounded-lg hover:!border-blue-500/50 focus:!border-blue-500 !shadow-none"
                  style={{ backdropFilter: 'blur(10px)' }}
                />
              </Form.Item>

              <Form.Item className="!mb-6">
                <Checkbox disabled={lockState.isLocked} className="!text-white/50 text-sm [&_.ant-checkbox-inner]:!bg-white/5 [&_.ant-checkbox-inner]:!border-white/20">
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
                  className="!h-12 !rounded-lg !border-0 !font-medium !tracking-wide !text-sm"
                  style={{
                    background: lockState.isLocked ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, var(--color-bt-primary), #6366f1)',
                    boxShadow: lockState.isLocked ? 'none' : '0 0 30px rgba(59, 130, 246, 0.4), 0 10px 40px -10px rgba(59, 130, 246, 0.5)',
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    {lockState.isLocked ? (
                      <>
                        <LockKeyhole className="w-4 h-4" />
                        Locked · {formatTime(lockState.retryAfterSeconds)}
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Initialize Session
                      </>
                    )}
                  </span>
                </Button>
              </Form.Item>
            </Form>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 bg-white/[0.02] border-t border-white/5">
            <div className="flex items-center justify-between text-xs text-white/30">
              <span className="font-mono">v2.0.25</span>
              <span>© 2025 BridgeTec</span>
            </div>
          </div>
        </div>
      </div>

      {/* Corner decorations */}
      <div className="absolute top-8 left-8 flex items-center gap-2 text-blue-400/30">
        <Bot className="w-5 h-5" />
        <span className="text-xs font-mono uppercase tracking-widest">NLU System</span>
      </div>

      <div className="absolute bottom-8 right-8 text-right">
        <div className="text-xs font-mono text-blue-400/20 uppercase tracking-wider">Secure Connection</div>
        <div className="text-[10px] font-mono text-white/20 mt-1">TLS 1.3 · AES-256</div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes float-node {
          0%, 100% {
            transform: translateY(0) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-20px) scale(1.1);
            opacity: 1;
          }
        }

        .ant-input-affix-wrapper:focus-within {
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
        }

        .ant-btn-primary:not(:disabled):hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }
      `}</style>

      {/* Password change dialog */}
      <ChangePasswordDialog
        ref={changePasswordDialogRef}
        policy={passwordPolicy}
        onPasswordChange={handlePasswordChange}
        onSuccess={() => {
          // Handled in useLoginLogic
        }}
        onError={(error) => {
          Log.error('Password change failed:', error);
        }}
      />
    </div>
  );
}
