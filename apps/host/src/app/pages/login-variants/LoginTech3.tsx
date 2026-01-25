/**
 * 로그인 페이지 - 테크 V3 (홀로그램 UI)
 * 투명한 홀로그램 카드 + 빛나는 에지
 * 미래적인 AR/VR 인터페이스 느낌
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { Lock, LockKeyhole, Scan, User, Users, Wifi } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

export default function LoginTech3() {
  const { form, lockState, loginError, isPending, passwordPolicy, changePasswordDialogRef, onFinish, onFinishFailed, handlePasswordChange, formatTime } = useLoginLogic();

  const renderErrorAlert = () => {
    if (lockState.isLocked) {
      return (
        <div className="mb-5 p-4 rounded-lg border border-red-400/50 bg-red-500/10 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
            <LockKeyhole className="h-4 w-4 animate-pulse" />
            SECURITY LOCKOUT
          </div>
          <div className="mt-2 text-3xl font-mono text-red-400 tabular-nums">{formatTime(lockState.retryAfterSeconds)}</div>
        </div>
      );
    }

    if (loginError.error === 'account_dormant') {
      return (
        <div className="mb-5 p-4 rounded-lg border border-amber-400/50 bg-amber-500/10 backdrop-blur-sm">
          <div className="text-amber-400 text-sm">{loginError.message}</div>
        </div>
      );
    }

    if (loginError.error === 'account_disabled') {
      return (
        <div className="mb-5 p-4 rounded-lg border border-gray-400/50 bg-gray-500/10 backdrop-blur-sm">
          <div className="text-gray-400 text-sm">{loginError.message}</div>
        </div>
      );
    }

    if (loginError.error === 'invalid_grant') {
      const showWarning = loginError.remainingAttempts !== undefined && loginError.remainingAttempts <= 2;
      return (
        <div className={cn('mb-5 p-4 rounded-lg border backdrop-blur-sm', showWarning ? 'border-red-400/50 bg-red-500/10' : 'border-cyan-400/30 bg-cyan-500/5')}>
          <div className={cn('text-sm', showWarning ? 'text-red-400' : 'text-cyan-400')}>{loginError.message}</div>
          {loginError.remainingAttempts !== undefined && (
            <div className={cn('mt-1 text-xs', showWarning ? 'text-red-400' : 'text-cyan-400/70')}>{loginError.remainingAttempts} attempts remaining</div>
          )}
        </div>
      );
    }

    if (loginError.message) {
      return (
        <div className="mb-5 p-4 rounded-lg border border-red-400/50 bg-red-500/10 backdrop-blur-sm">
          <div className="text-red-400 text-sm">{loginError.message}</div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden bg-slate-950">
      {/* Background grid */}
      <div
        className="fixed inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          perspective: '500px',
          transform: 'rotateX(60deg)',
          transformOrigin: 'center 120%',
        }}
      />

      {/* Ambient light effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #06B6D4 0%, transparent 70%)',
            top: '-10%',
            right: '-10%',
            filter: 'blur(100px)',
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)',
            bottom: '-20%',
            left: '-10%',
            filter: 'blur(80px)',
          }}
        />
      </div>

      {/* Floating hologram particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-cyan-400"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.2 + Math.random() * 0.3,
              animation: `float-particle ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Main hologram card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Hologram scan line */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none" style={{ animation: 'scan 4s linear infinite' }}>
          <div
            className="absolute left-0 right-0 h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.8), transparent)',
              boxShadow: '0 0 20px rgba(6, 182, 212, 0.5)',
            }}
          />
        </div>

        {/* Card */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            boxShadow: `
              0 0 0 1px rgba(6, 182, 212, 0.1),
              0 0 40px rgba(6, 182, 212, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.05)
            `,
          }}
        >
          {/* Corner decorations */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400/50 rounded-tl-2xl" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400/50 rounded-tr-2xl" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400/50 rounded-bl-2xl" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400/50 rounded-br-2xl" />

          {/* Header */}
          <div className="px-8 pt-8 pb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                  }}
                >
                  <Scan className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h1 className="text-lg font-medium text-white">NLU Admin</h1>
                  <p className="text-xs text-cyan-400/60">Holographic Interface</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-cyan-400/60">
                <Wifi className="w-4 h-4" />
                <span className="text-xs">CONNECTED</span>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
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
                label={<span className="text-xs text-cyan-400/70 uppercase tracking-wider">User ID</span>}
                rules={[{ required: true, message: '' }]}
                className="!mb-4"
              >
                <Input
                  size="large"
                  placeholder="Enter ID"
                  prefix={<User className="h-4 w-4 text-cyan-400/50" />}
                  disabled={lockState.isLocked}
                  className="!bg-cyan-400/5 !border !border-cyan-400/20 !rounded-lg !text-white placeholder:!text-cyan-400/30 focus:!border-cyan-400/50 !shadow-none !h-11 hover:!border-cyan-400/40"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span className="text-xs text-cyan-400/70 uppercase tracking-wider">Password</span>}
                rules={[{ required: true, message: '' }]}
                className="!mb-4"
              >
                <Input.Password
                  size="large"
                  placeholder="Enter Password"
                  prefix={<Lock className="h-4 w-4 text-cyan-400/50" />}
                  disabled={lockState.isLocked}
                  className="!bg-cyan-400/5 !border !border-cyan-400/20 !rounded-lg !text-white placeholder:!text-cyan-400/30 focus:!border-cyan-400/50 !shadow-none !h-11 hover:!border-cyan-400/40 [&_.ant-input]:!bg-transparent [&_.ant-input]:!text-white [&_.ant-input-password-icon]:!text-cyan-400/50"
                />
              </Form.Item>

              <Form.Item label={<span className="text-xs text-cyan-400/70 uppercase tracking-wider">Tenant</span>} className="!mb-4">
                <Input
                  size="large"
                  placeholder="Optional"
                  prefix={<Users className="h-4 w-4 text-cyan-400/50" />}
                  disabled={lockState.isLocked}
                  className="!bg-cyan-400/5 !border !border-cyan-400/20 !rounded-lg !text-white placeholder:!text-cyan-400/30 focus:!border-cyan-400/50 !shadow-none !h-11 hover:!border-cyan-400/40"
                />
              </Form.Item>

              <Form.Item className="!mb-6">
                <Checkbox disabled={lockState.isLocked} className="text-sm text-cyan-400/60 [&_.ant-checkbox-inner]:!bg-transparent [&_.ant-checkbox-inner]:!border-cyan-400/40">
                  Remember session
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
                    background: lockState.isLocked ? 'rgba(100, 116, 139, 0.3)' : 'linear-gradient(135deg, rgba(6, 182, 212, 0.8) 0%, rgba(139, 92, 246, 0.8) 100%)',
                    boxShadow: lockState.isLocked ? 'none' : '0 0 30px rgba(6, 182, 212, 0.3)',
                  }}
                >
                  {lockState.isLocked ? `LOCKED ${formatTime(lockState.retryAfterSeconds)}` : 'AUTHENTICATE'}
                </Button>
              </Form.Item>
            </Form>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-cyan-400/10">
            <div className="flex justify-between text-xs text-cyan-400/40">
              <span>© 2025 BridgeTec</span>
              <span>v2.0.25-holo</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float-particle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; }
          50% { transform: translateY(-20px) translateX(10px); opacity: 0.5; }
        }

        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(500px); }
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
