/**
 * 로그인 페이지 - 다크 V3 (우주/별)
 * 깊은 우주 배경, 반짝이는 별, 성운
 * 광활하고 신비로운 우주 테마
 */

import { useEffect, useRef } from 'react';
import { Button, Checkbox, Form, Input } from 'antd';
import { Lock, LockKeyhole, Sparkles, User, Users } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

/**
 * Starfield background component
 */
function Starfield() {
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

    // Create stars
    const stars: { x: number; y: number; size: number; speed: number; opacity: number }[] = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2,
        speed: 0.05 + Math.random() * 0.1,
        opacity: 0.3 + Math.random() * 0.7,
      });
    }

    // Create shooting stars
    let shootingStars: { x: number; y: number; length: number; speed: number; opacity: number }[] = [];

    const createShootingStar = () => {
      if (shootingStars.length < 3 && Math.random() < 0.02) {
        shootingStars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height * 0.5,
          length: 50 + Math.random() * 100,
          speed: 8 + Math.random() * 5,
          opacity: 1,
        });
      }
    };

    const draw = () => {
      // Clear with deep space gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0a0a1a');
      gradient.addColorStop(0.5, '#0d1025');
      gradient.addColorStop(1, '#0a0a15');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw nebula clouds
      const time = Date.now() * 0.0001;
      ctx.globalAlpha = 0.03;
      for (let i = 0; i < 3; i++) {
        const x = canvas.width * (0.3 + i * 0.2 + Math.sin(time + i) * 0.05);
        const y = canvas.height * (0.4 + Math.cos(time + i * 2) * 0.1);
        const nebula = ctx.createRadialGradient(x, y, 0, x, y, 300);
        nebula.addColorStop(0, i % 2 === 0 ? '#4F46E5' : '#7C3AED');
        nebula.addColorStop(1, 'transparent');
        ctx.fillStyle = nebula;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.globalAlpha = 1;

      // Draw stars with twinkling
      const twinkleTime = Date.now() * 0.003;
      stars.forEach((star, i) => {
        const twinkle = Math.sin(twinkleTime + i * 0.5) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * twinkle})`;
        ctx.fill();

        // Add glow for larger stars
        if (star.size > 1.5) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
          const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 3);
          glow.addColorStop(0, `rgba(200, 220, 255, ${0.2 * twinkle})`);
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.fill();
        }

        // Slow movement
        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
      });

      // Create and draw shooting stars
      createShootingStar();
      shootingStars = shootingStars.filter((ss) => {
        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(ss.x - ss.length, ss.y + ss.length * 0.3);
        const gradient = ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.length, ss.y + ss.length * 0.3);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${ss.opacity})`);
        gradient.addColorStop(1, 'transparent');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.stroke();

        ss.x += ss.speed;
        ss.y += ss.speed * 0.3;
        ss.opacity -= 0.02;

        return ss.opacity > 0 && ss.x < canvas.width + ss.length;
      });

      requestAnimationFrame(draw);
    };

    const animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" />;
}

export default function LoginDark3() {
  const { form, lockState, loginError, isPending, passwordPolicy, changePasswordDialogRef, onFinish, onFinishFailed, handlePasswordChange, formatTime } = useLoginLogic();

  const renderErrorAlert = () => {
    if (lockState.isLocked) {
      return (
        <div className="mb-6 p-5 rounded-xl bg-red-950/30 border border-red-500/30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <LockKeyhole className="h-5 w-5 text-red-400 animate-pulse" />
            <div>
              <div className="text-red-300 font-medium text-sm">Orbital Lock Engaged</div>
              <div className="text-red-400/60 text-xs mt-0.5">Awaiting cooldown sequence</div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <div className="text-4xl font-light tabular-nums tracking-wider text-red-400" style={{ textShadow: '0 0 20px rgba(239, 68, 68, 0.5)' }}>
              {formatTime(lockState.retryAfterSeconds)}
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'account_dormant') {
      return (
        <div className="mb-6 p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 backdrop-blur-md">
          <div className="text-amber-400 text-sm">{loginError.message}</div>
        </div>
      );
    }

    if (loginError.error === 'account_disabled') {
      return (
        <div className="mb-6 p-4 rounded-xl bg-zinc-800/30 border border-zinc-600/30 backdrop-blur-md">
          <div className="text-zinc-400 text-sm">{loginError.message}</div>
        </div>
      );
    }

    if (loginError.error === 'invalid_grant') {
      const showWarning = loginError.remainingAttempts !== undefined && loginError.remainingAttempts <= 2;
      return (
        <div className={cn('mb-6 p-4 rounded-xl border backdrop-blur-md', showWarning ? 'bg-red-950/20 border-red-500/30' : 'bg-indigo-950/20 border-indigo-500/30')}>
          <div className={cn('text-sm', showWarning ? 'text-red-400' : 'text-indigo-300')}>{loginError.message}</div>
          {loginError.remainingAttempts !== undefined && (
            <div className={cn('mt-2 text-xs', showWarning ? 'text-red-400/70' : 'text-indigo-400/70')}>{loginError.remainingAttempts} attempts remaining before lockout</div>
          )}
        </div>
      );
    }

    if (loginError.message) {
      return (
        <div className="mb-6 p-4 rounded-xl bg-red-950/20 border border-red-500/30 backdrop-blur-md">
          <div className="text-red-400 text-sm">{loginError.message}</div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden bg-[#0a0a15]">
      {/* Starfield background */}
      <Starfield />

      {/* Lens flare effect */}
      <div
        className="fixed top-10 right-20 w-4 h-4 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)',
          boxShadow: '0 0 60px 30px rgba(200, 220, 255, 0.1)',
        }}
      />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md">
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(15, 15, 35, 0.9) 0%, rgba(10, 10, 25, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            boxShadow: `
              0 0 0 1px rgba(0, 0, 0, 0.5),
              0 25px 60px -15px rgba(0, 0, 0, 0.8),
              0 0 80px -20px rgba(99, 102, 241, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.03)
            `,
          }}
        >
          {/* Header */}
          <div className="px-8 pt-10 pb-6 text-center">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 relative"
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                boxShadow: '0 0 40px rgba(99, 102, 241, 0.2)',
              }}
            >
              <Sparkles className="w-8 h-8 text-indigo-400" />
              {/* Orbiting dot */}
              <div
                className="absolute w-2 h-2 rounded-full bg-indigo-400"
                style={{
                  animation: 'orbit 4s linear infinite',
                  transformOrigin: 'center',
                  top: '-4px',
                  left: '50%',
                  marginLeft: '-4px',
                  boxShadow: '0 0 10px rgba(99, 102, 241, 0.8)',
                }}
              />
            </div>

            <h1 className="text-2xl font-light text-white tracking-wide" style={{ textShadow: '0 0 30px rgba(99, 102, 241, 0.3)' }}>
              NLU Bot Admin
            </h1>
            <p className="text-indigo-300/50 text-sm mt-2">Command Center Access</p>

            {/* Connection status */}
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/30 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400/80 text-xs">Quantum Link Active</span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

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
                label={<span className="text-xs text-indigo-300/70 uppercase tracking-wider">Pilot ID</span>}
                rules={[{ required: true, message: '' }]}
                className="!mb-5"
              >
                <Input
                  size="large"
                  placeholder="Enter your ID"
                  prefix={<User className="h-4 w-4 text-indigo-500/50" />}
                  disabled={lockState.isLocked}
                  className="!bg-indigo-950/30 !border !border-indigo-500/20 !rounded-xl !text-white placeholder:!text-indigo-400/30 focus:!border-indigo-500/50 hover:!border-indigo-500/30 !shadow-none !h-12"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span className="text-xs text-indigo-300/70 uppercase tracking-wider">Access Key</span>}
                rules={[{ required: true, message: '' }]}
                className="!mb-5"
              >
                <Input.Password
                  size="large"
                  placeholder="Enter your password"
                  prefix={<Lock className="h-4 w-4 text-indigo-500/50" />}
                  disabled={lockState.isLocked}
                  className="!bg-indigo-950/30 !border !border-indigo-500/20 !rounded-xl !text-white placeholder:!text-indigo-400/30 focus:!border-indigo-500/50 hover:!border-indigo-500/30 !shadow-none !h-12 [&_.ant-input]:!bg-transparent [&_.ant-input]:!text-white [&_.ant-input-password-icon]:!text-indigo-400/50"
                />
              </Form.Item>

              <Form.Item label={<span className="text-xs text-indigo-300/70 uppercase tracking-wider">Sector</span>} className="!mb-5">
                <Input
                  size="large"
                  placeholder="Tenant (optional)"
                  prefix={<Users className="h-4 w-4 text-indigo-500/50" />}
                  disabled={lockState.isLocked}
                  className="!bg-indigo-950/30 !border !border-indigo-500/20 !rounded-xl !text-white placeholder:!text-indigo-400/30 focus:!border-indigo-500/50 hover:!border-indigo-500/30 !shadow-none !h-12"
                />
              </Form.Item>

              <Form.Item className="!mb-6">
                <Checkbox
                  disabled={lockState.isLocked}
                  className="text-sm text-indigo-300/50 [&_.ant-checkbox-inner]:!bg-transparent [&_.ant-checkbox-inner]:!border-indigo-500/40"
                >
                  Maintain orbital connection
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
                  className="!h-13 !rounded-xl !border-0 !font-medium"
                  style={{
                    height: '52px',
                    background: lockState.isLocked ? 'rgba(63, 63, 70, 0.5)' : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                    boxShadow: lockState.isLocked ? 'none' : '0 10px 40px -10px rgba(99, 102, 241, 0.5), 0 0 20px rgba(124, 58, 237, 0.2)',
                  }}
                >
                  {lockState.isLocked ? `Locked ${formatTime(lockState.retryAfterSeconds)}` : 'Initiate Connection'}
                </Button>
              </Form.Item>
            </Form>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-indigo-500/10 bg-indigo-950/20">
            <div className="flex items-center justify-between text-xs text-indigo-400/40">
              <span>BridgeTec Stellar Division</span>
              <span>v2.0.25</span>
            </div>
          </div>
        </div>
      </div>

      {/* Corner coordinates */}
      <div className="fixed top-6 left-6 text-xs text-indigo-400/30 font-mono">RA 12h 42m 30s</div>
      <div className="fixed bottom-6 right-6 text-xs text-indigo-400/30 font-mono">DEC +41° 16&apos; 9&quot;</div>

      <style>{`
        @keyframes orbit {
          0% { transform: rotate(0deg) translateX(40px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(40px) rotate(-360deg); }
        }

        .ant-input-affix-wrapper:focus-within {
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.15) !important;
        }

        .ant-form-item-explain-error {
          color: #a78bfa !important;
          font-size: 12px !important;
        }

        .ant-btn-primary:not(:disabled):hover {
          filter: brightness(1.15);
          transform: translateY(-1px);
          box-shadow: 0 15px 50px -10px rgba(99, 102, 241, 0.6), 0 0 30px rgba(124, 58, 237, 0.3) !important;
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
