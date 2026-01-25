/**
 * 로그인 페이지 - 테크 V2 (매트릭스 코드 레인)
 * 흘러내리는 코드 애니메이션 + 터미널 느낌
 * 해커 영화 미학
 */

import { useEffect, useRef } from 'react';
import { Button, Checkbox, Form, Input } from 'antd';
import { LockKeyhole, Terminal } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

/**
 * Matrix rain effect component
 */
function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()アイウエオカキクケコサシスセソタチツテト';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops: number[] = [];

    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100;
    }

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#00FF41';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Gradient effect - brighter at the bottom
        const brightness = Math.min(1, (y / canvas.height) * 2);
        ctx.fillStyle = `rgba(0, 255, 65, ${0.1 + brightness * 0.9})`;

        ctx.fillText(char, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 50);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" />;
}

export default function LoginTech2() {
  const { form, lockState, loginError, isPending, passwordPolicy, changePasswordDialogRef, onFinish, onFinishFailed, handlePasswordChange, formatTime } = useLoginLogic();

  const renderErrorAlert = () => {
    if (lockState.isLocked) {
      return (
        <div className="mb-4 p-3 rounded border border-red-500/50 bg-red-500/10 font-mono text-sm">
          <div className="text-red-400 flex items-center gap-2">
            <LockKeyhole className="h-4 w-4" />
            [ERROR] ACCESS_DENIED
          </div>
          <div className="mt-2 text-red-300">
            Retry in: <span className="text-red-400">{formatTime(lockState.retryAfterSeconds)}</span>
          </div>
        </div>
      );
    }

    if (loginError.error === 'account_dormant') {
      return (
        <div className="mb-4 p-3 rounded border border-yellow-500/50 bg-yellow-500/10 font-mono text-sm">
          <div className="text-yellow-400">[WARN] ACCOUNT_DORMANT</div>
          <div className="mt-1 text-yellow-300/70">{loginError.message}</div>
        </div>
      );
    }

    if (loginError.error === 'account_disabled') {
      return (
        <div className="mb-4 p-3 rounded border border-gray-500/50 bg-gray-500/10 font-mono text-sm">
          <div className="text-gray-400">[INFO] ACCOUNT_DISABLED</div>
          <div className="mt-1 text-gray-500">{loginError.message}</div>
        </div>
      );
    }

    if (loginError.error === 'invalid_grant') {
      const showWarning = loginError.remainingAttempts !== undefined && loginError.remainingAttempts <= 2;
      return (
        <div className={cn('mb-4 p-3 rounded border font-mono text-sm', showWarning ? 'border-red-500/50 bg-red-500/10' : 'border-green-500/30 bg-green-500/5')}>
          <div className={showWarning ? 'text-red-400' : 'text-green-400'}>[FAIL] INVALID_CREDENTIALS</div>
          <div className={cn('mt-1', showWarning ? 'text-red-300/70' : 'text-green-300/70')}>{loginError.message}</div>
          {loginError.remainingAttempts !== undefined && (
            <div className={cn('mt-1', showWarning ? 'text-red-400' : 'text-green-500')}>Attempts remaining: {loginError.remainingAttempts}</div>
          )}
        </div>
      );
    }

    if (loginError.message) {
      return <div className="mb-4 p-3 rounded border border-red-500/50 bg-red-500/10 font-mono text-sm text-red-400">{loginError.message}</div>;
    }

    return null;
  };

  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Matrix rain */}
      <MatrixRain />

      {/* Scan lines */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.1) 2px, rgba(0,255,65,0.1) 4px)',
        }}
      />

      {/* Terminal window */}
      <div
        className="relative z-10 w-full max-w-lg rounded-lg overflow-hidden"
        style={{
          background: 'rgba(0, 0, 0, 0.85)',
          border: '1px solid #00FF41',
          boxShadow: '0 0 50px rgba(0, 255, 65, 0.2), inset 0 0 50px rgba(0, 255, 65, 0.03)',
        }}
      >
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-green-500/30 bg-green-500/5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <div className="flex-1 text-center text-xs text-green-500/70 font-mono">NLU-BOT-ADMIN -- login@secure</div>
        </div>

        {/* Terminal content */}
        <div className="p-6 font-mono">
          {/* Welcome message */}
          <div className="mb-6 text-green-400 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="h-4 w-4" />
              <span>NLU Bot Admin System v2.0.25</span>
            </div>
            <div className="text-green-500/60 text-xs">═══════════════════════════════════</div>
            <div className="mt-2 text-green-500/80 text-xs">&gt; Secure authentication required</div>
            <div className="text-green-500/80 text-xs">&gt; Enter credentials to proceed_</div>
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
            <Form.Item name="userId" label={<span className="text-xs text-green-500/70">USER_ID:</span>} rules={[{ required: true, message: '' }]} className="!mb-4">
              <Input
                size="large"
                placeholder="_"
                prefix={<span className="text-green-500/50">&gt;</span>}
                disabled={lockState.isLocked}
                className="!bg-transparent !border !border-green-500/30 !rounded-none !text-green-400 !font-mono placeholder:!text-green-500/30 focus:!border-green-500 !shadow-none !h-10"
              />
            </Form.Item>

            <Form.Item name="password" label={<span className="text-xs text-green-500/70">PASSWORD:</span>} rules={[{ required: true, message: '' }]} className="!mb-4">
              <Input.Password
                size="large"
                placeholder="_"
                prefix={<span className="text-green-500/50">&gt;</span>}
                disabled={lockState.isLocked}
                className="!bg-transparent !border !border-green-500/30 !rounded-none !text-green-400 !font-mono placeholder:!text-green-500/30 focus:!border-green-500 !shadow-none !h-10 [&_.ant-input]:!bg-transparent [&_.ant-input]:!text-green-400 [&_.ant-input-password-icon]:!text-green-500/50"
              />
            </Form.Item>

            <Form.Item label={<span className="text-xs text-green-500/70">TENANT (opt):</span>} className="!mb-4">
              <Input
                size="large"
                placeholder="_"
                prefix={<span className="text-green-500/50">&gt;</span>}
                disabled={lockState.isLocked}
                className="!bg-transparent !border !border-green-500/30 !rounded-none !text-green-400 !font-mono placeholder:!text-green-500/30 focus:!border-green-500 !shadow-none !h-10"
              />
            </Form.Item>

            <Form.Item className="!mb-6">
              <Checkbox disabled={lockState.isLocked} className="text-xs text-green-500/60 [&_.ant-checkbox-inner]:!bg-transparent [&_.ant-checkbox-inner]:!border-green-500/50">
                REMEMBER_SESSION=true
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
                className="!h-11 !rounded-none !font-mono !text-sm !bg-green-500/20 !border !border-green-500 !text-green-400 hover:!bg-green-500/30 hover:!text-green-300"
              >
                {lockState.isLocked ? `LOCKED [${formatTime(lockState.retryAfterSeconds)}]` : '[ AUTHENTICATE ]'}
              </Button>
            </Form.Item>
          </Form>

          {/* Status bar */}
          <div className="mt-6 pt-4 border-t border-green-500/20 flex justify-between text-xs text-green-500/50">
            <span>STATUS: {lockState.isLocked ? 'LOCKED' : 'READY'}</span>
            <span>ENCRYPTION: AES-256</span>
          </div>
        </div>
      </div>

      {/* Corner texts */}
      <div className="fixed top-4 left-4 text-xs text-green-500/30 font-mono">SYS_BOOT_2025</div>
      <div className="fixed bottom-4 right-4 text-xs text-green-500/30 font-mono">© BRIDGETEC</div>

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
