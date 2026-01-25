/**
 * 로그인 페이지 - 다크 V2 (네온 사이버펑크)
 * 강렬한 네온 글로우, 글리치 효과
 * 80년대 레트로퓨처리즘 + 사이버펑크 미학
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { Lock, LockKeyhole, User, Users, Zap } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

export default function LoginDark2() {
  const { form, lockState, loginError, isPending, passwordPolicy, changePasswordDialogRef, onFinish, onFinishFailed, handlePasswordChange, formatTime } = useLoginLogic();

  const renderErrorAlert = () => {
    if (lockState.isLocked) {
      return (
        <div className="mb-6 p-4 rounded border-2 border-red-500 bg-red-500/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
          <div className="relative flex items-center gap-3">
            <LockKeyhole className="h-5 w-5 text-red-500 animate-pulse" />
            <div>
              <div className="text-red-400 font-bold uppercase tracking-wider text-sm">SYSTEM LOCKED</div>
              <div className="text-red-500/70 text-xs mt-1">Security protocol engaged</div>
            </div>
          </div>
          <div className="relative mt-4 text-center">
            <div
              className="text-5xl font-bold tabular-nums tracking-widest"
              style={{
                color: '#ef4444',
                textShadow: '0 0 20px #ef4444, 0 0 40px #ef4444, 0 0 60px #ef4444',
              }}
            >
              {formatTime(lockState.retryAfterSeconds)}
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'account_dormant') {
      return (
        <div className="mb-6 p-4 rounded border-2 border-yellow-500/50 bg-yellow-500/5">
          <div className="text-yellow-400 text-sm font-medium">[DORMANT] {loginError.message}</div>
        </div>
      );
    }

    if (loginError.error === 'account_disabled') {
      return (
        <div className="mb-6 p-4 rounded border-2 border-gray-500/50 bg-gray-500/5">
          <div className="text-gray-400 text-sm">[DISABLED] {loginError.message}</div>
        </div>
      );
    }

    if (loginError.error === 'invalid_grant') {
      const showWarning = loginError.remainingAttempts !== undefined && loginError.remainingAttempts <= 2;
      return (
        <div className={cn('mb-6 p-4 rounded border-2', showWarning ? 'border-red-500/50 bg-red-500/5' : 'border-cyan-500/30 bg-cyan-500/5')}>
          <div className={cn('text-sm font-medium', showWarning ? 'text-red-400' : 'text-cyan-400')}>[ACCESS DENIED] {loginError.message}</div>
          {loginError.remainingAttempts !== undefined && (
            <div className={cn('mt-2 text-xs', showWarning ? 'text-red-500' : 'text-cyan-500')}>Attempts remaining: {loginError.remainingAttempts}</div>
          )}
        </div>
      );
    }

    if (loginError.message) {
      return (
        <div className="mb-6 p-4 rounded border-2 border-red-500/50 bg-red-500/5">
          <div className="text-red-400 text-sm">{loginError.message}</div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Cyberpunk grid floor */}
      <div
        className="fixed inset-0"
        style={{
          background: `
            linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.8) 50%, black 100%),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 100px,
              rgba(0, 255, 255, 0.03) 100px,
              rgba(0, 255, 255, 0.03) 101px
            ),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 100px,
              rgba(255, 0, 255, 0.02) 100px,
              rgba(255, 0, 255, 0.02) 101px
            )
          `,
          transform: 'perspective(500px) rotateX(60deg)',
          transformOrigin: 'center 200%',
        }}
      />

      {/* Neon glow orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255, 0, 255, 0.3) 0%, transparent 70%)',
            top: '-20%',
            left: '-10%',
            filter: 'blur(80px)',
            animation: 'pulse 4s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0, 255, 255, 0.3) 0%, transparent 70%)',
            bottom: '-10%',
            right: '-5%',
            filter: 'blur(60px)',
            animation: 'pulse 4s ease-in-out infinite 2s',
          }}
        />
      </div>

      {/* Scan lines overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Glitch effect container */}
        <div
          className="relative rounded-lg overflow-hidden"
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            border: '2px solid',
            borderImage: 'linear-gradient(135deg, #ff00ff, #00ffff) 1',
            boxShadow: `
              0 0 30px rgba(255, 0, 255, 0.3),
              0 0 60px rgba(0, 255, 255, 0.2),
              inset 0 0 30px rgba(255, 0, 255, 0.05)
            `,
          }}
        >
          {/* Animated border glow */}
          <div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.1), transparent)',
              animation: 'borderSweep 3s linear infinite',
            }}
          />

          {/* Header */}
          <div className="px-8 pt-8 pb-6 relative">
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-14 h-14 rounded flex items-center justify-center relative"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 0, 255, 0.2), rgba(0, 255, 255, 0.2))',
                  border: '1px solid rgba(255, 0, 255, 0.5)',
                  boxShadow: '0 0 20px rgba(255, 0, 255, 0.3)',
                }}
              >
                <Zap className="w-7 h-7" style={{ color: '#00ffff' }} />
              </div>
              <div>
                <h1
                  className="text-2xl font-black uppercase tracking-wider"
                  style={{
                    background: 'linear-gradient(90deg, #ff00ff, #00ffff)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 0 30px rgba(255, 0, 255, 0.5)',
                  }}
                >
                  NLU ADMIN
                </h1>
                <p className="text-cyan-500/60 text-xs uppercase tracking-widest mt-1">Neural Access Terminal</p>
              </div>
            </div>

            <div
              className="h-px"
              style={{
                background: 'linear-gradient(90deg, #ff00ff, transparent 50%, #00ffff)',
              }}
            />
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
                label={<span className="text-xs text-cyan-400 uppercase tracking-widest font-mono">&gt; USER_ID</span>}
                rules={[{ required: true, message: '' }]}
                className="!mb-5"
              >
                <Input
                  size="large"
                  placeholder="_"
                  prefix={<User className="h-4 w-4 text-cyan-500/50" />}
                  disabled={lockState.isLocked}
                  className="!bg-black/50 !border-2 !border-cyan-500/30 !rounded !text-cyan-400 !font-mono placeholder:!text-cyan-500/30 focus:!border-cyan-500 hover:!border-cyan-500/50 !shadow-none !h-12"
                  style={{ boxShadow: 'inset 0 0 20px rgba(0, 255, 255, 0.05)' }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={
                  <span className="text-xs text-magenta-400 uppercase tracking-widest font-mono" style={{ color: '#ff00ff' }}>
                    &gt; PASSWORD
                  </span>
                }
                rules={[{ required: true, message: '' }]}
                className="!mb-5"
              >
                <Input.Password
                  size="large"
                  placeholder="_"
                  prefix={<Lock className="h-4 w-4" style={{ color: 'rgba(255, 0, 255, 0.5)' }} />}
                  disabled={lockState.isLocked}
                  className="!bg-black/50 !border-2 !rounded !text-white !font-mono placeholder:!text-pink-500/30 focus:!border-pink-500 hover:!border-pink-500/50 !shadow-none !h-12 [&_.ant-input]:!bg-transparent [&_.ant-input]:!text-pink-300 [&_.ant-input-password-icon]:!text-pink-500/50"
                  style={{
                    borderColor: 'rgba(255, 0, 255, 0.3)',
                    boxShadow: 'inset 0 0 20px rgba(255, 0, 255, 0.05)',
                  }}
                />
              </Form.Item>

              <Form.Item label={<span className="text-xs text-purple-400 uppercase tracking-widest font-mono">&gt; TENANT</span>} className="!mb-5">
                <Input
                  size="large"
                  placeholder="OPTIONAL"
                  prefix={<Users className="h-4 w-4 text-purple-500/50" />}
                  disabled={lockState.isLocked}
                  className="!bg-black/50 !border-2 !border-purple-500/30 !rounded !text-purple-300 !font-mono placeholder:!text-purple-500/30 focus:!border-purple-500 hover:!border-purple-500/50 !shadow-none !h-12"
                  style={{ boxShadow: 'inset 0 0 20px rgba(139, 92, 246, 0.05)' }}
                />
              </Form.Item>

              <Form.Item className="!mb-6">
                <Checkbox
                  disabled={lockState.isLocked}
                  className="text-xs text-cyan-500/60 uppercase tracking-wide [&_.ant-checkbox-inner]:!bg-transparent [&_.ant-checkbox-inner]:!border-cyan-500/50"
                >
                  PERSIST_SESSION=TRUE
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
                  className="!h-14 !rounded !font-bold !uppercase !tracking-widest !border-0"
                  style={{
                    background: lockState.isLocked ? 'rgba(100, 100, 100, 0.3)' : 'linear-gradient(90deg, #ff00ff, #00ffff)',
                    boxShadow: lockState.isLocked ? 'none' : '0 0 30px rgba(255, 0, 255, 0.5), 0 0 60px rgba(0, 255, 255, 0.3)',
                  }}
                >
                  {lockState.isLocked ? `LOCKED [${formatTime(lockState.retryAfterSeconds)}]` : '[ INITIALIZE CONNECTION ]'}
                </Button>
              </Form.Item>
            </Form>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t" style={{ borderColor: 'rgba(255, 0, 255, 0.2)' }}>
            <div className="flex justify-between text-xs font-mono">
              <span style={{ color: 'rgba(0, 255, 255, 0.4)' }}>BRIDGETEC.CORP</span>
              <span style={{ color: 'rgba(255, 0, 255, 0.4)' }}>v2.0.25.CYBER</span>
            </div>
          </div>
        </div>
      </div>

      {/* Corner decorations */}
      <div
        className="fixed top-6 left-6 text-xs font-mono uppercase tracking-widest"
        style={{
          color: '#ff00ff',
          textShadow: '0 0 10px #ff00ff',
        }}
      >
        SECTOR_7G
      </div>
      <div
        className="fixed bottom-6 right-6 text-xs font-mono uppercase tracking-widest"
        style={{
          color: '#00ffff',
          textShadow: '0 0 10px #00ffff',
        }}
      >
        2025.01.24
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }

        @keyframes borderSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .ant-input-affix-wrapper:focus-within {
          box-shadow: 0 0 20px rgba(0, 255, 255, 0.2) !important;
        }

        .ant-form-item-explain-error {
          color: #ff00ff !important;
          font-family: monospace !important;
          font-size: 11px !important;
        }

        .ant-btn-primary:not(:disabled):hover {
          filter: brightness(1.2) !important;
          transform: translateY(-2px);
          box-shadow: 0 0 50px rgba(255, 0, 255, 0.6), 0 0 80px rgba(0, 255, 255, 0.4) !important;
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
