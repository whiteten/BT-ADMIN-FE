/**
 * 로그인 페이지 - 미니멀 V2 (Zen / 일본 미니멀)
 * 극도로 절제된 여백, 선 하나의 강조
 * 차분하고 명상적인 분위기
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { Lock, LockKeyhole, User, Users } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

export default function LoginMinimal2() {
  const { form, lockState, loginError, isPending, passwordPolicy, changePasswordDialogRef, onFinish, onFinishFailed, handlePasswordChange, formatTime } = useLoginLogic();

  const renderErrorAlert = () => {
    if (lockState.isLocked) {
      return (
        <div className="mb-8 py-4 border-t border-b border-red-200">
          <div className="flex items-center gap-2 text-red-600 text-xs tracking-widest uppercase">
            <LockKeyhole className="h-3 w-3" />
            일시 정지
          </div>
          <div className="mt-3 text-4xl font-extralight text-red-500 tabular-nums tracking-wider">{formatTime(lockState.retryAfterSeconds)}</div>
        </div>
      );
    }

    if (loginError.error === 'account_dormant') {
      return (
        <div className="mb-8 py-4 border-t border-b border-amber-200">
          <p className="text-amber-600 text-sm">{loginError.message}</p>
        </div>
      );
    }

    if (loginError.error === 'account_disabled') {
      return (
        <div className="mb-8 py-4 border-t border-b border-gray-200">
          <p className="text-gray-500 text-sm">{loginError.message}</p>
        </div>
      );
    }

    if (loginError.error === 'invalid_grant') {
      const showWarning = loginError.remainingAttempts !== undefined && loginError.remainingAttempts <= 2;
      return (
        <div className={cn('mb-8 py-4 border-t border-b', showWarning ? 'border-red-200' : 'border-gray-200')}>
          <p className={cn('text-sm', showWarning ? 'text-red-500' : 'text-gray-600')}>{loginError.message}</p>
          {loginError.remainingAttempts !== undefined && <p className={cn('mt-2 text-xs', showWarning && 'text-red-500')}>{loginError.remainingAttempts}회 남음</p>}
        </div>
      );
    }

    if (loginError.message) {
      return (
        <div className="mb-8 py-4 border-t border-b border-red-200">
          <p className="text-red-500 text-sm">{loginError.message}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-8" style={{ background: '#FAFAF9' }}>
      {/* Subtle paper texture */}
      <div
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          opacity: 0.03,
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Single accent line */}
        <div className="absolute -left-16 top-0 w-px h-full hidden md:block" style={{ background: 'linear-gradient(180deg, transparent, var(--color-bt-primary), transparent)' }} />

        {/* Header - extremely minimal */}
        <div className="mb-16">
          <div className="text-[10px] tracking-[0.4em] uppercase text-gray-400 mb-2">NLU Bot Admin</div>
          <h1 className="text-4xl font-extralight text-gray-800 tracking-tight">ようこそ</h1>
          <p className="mt-2 text-sm text-gray-400 font-light">Welcome</p>
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
          <Form.Item name="userId" rules={[{ required: true, message: '' }]} className="!mb-8">
            <Input
              size="large"
              placeholder="ID"
              prefix={<User className="h-4 w-4 text-gray-300" />}
              disabled={lockState.isLocked}
              variant="borderless"
              className="!text-lg !font-light !text-gray-700 !border-b !border-gray-200 !rounded-none !px-0 focus:!border-gray-400 hover:!border-gray-300"
            />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: '' }]} className="!mb-8">
            <Input.Password
              size="large"
              placeholder="Password"
              prefix={<Lock className="h-4 w-4 text-gray-300" />}
              disabled={lockState.isLocked}
              variant="borderless"
              className="!text-lg !font-light !text-gray-700 !border-b !border-gray-200 !rounded-none !px-0 focus:!border-gray-400 hover:!border-gray-300 [&_.ant-input]:!bg-transparent"
            />
          </Form.Item>

          <Form.Item className="!mb-8">
            <Input
              size="large"
              placeholder="Tenant (optional)"
              prefix={<Users className="h-4 w-4 text-gray-300" />}
              disabled={lockState.isLocked}
              variant="borderless"
              className="!text-lg !font-light !text-gray-700 !border-b !border-gray-200 !rounded-none !px-0 focus:!border-gray-400 hover:!border-gray-300"
            />
          </Form.Item>

          <Form.Item className="!mb-12">
            <Checkbox disabled={lockState.isLocked} className="text-xs text-gray-400 tracking-wide">
              Remember
            </Checkbox>
          </Form.Item>

          <Form.Item className="!mb-0">
            <Button
              type="text"
              size="large"
              htmlType="submit"
              loading={isPending}
              disabled={lockState.isLocked}
              block
              className="!h-14 !text-sm !font-light !tracking-widest !uppercase !border !border-gray-300 hover:!border-gray-900 hover:!text-gray-900 !text-gray-600 !rounded-none !transition-all !duration-300"
            >
              {lockState.isLocked ? formatTime(lockState.retryAfterSeconds) : 'Enter'}
            </Button>
          </Form.Item>
        </Form>

        {/* Footer */}
        <div className="mt-20 text-center">
          <div className="text-[10px] tracking-[0.3em] text-gray-300 uppercase">BridgeTec · 2025</div>
        </div>
      </div>

      {/* Corner mark */}
      <div className="fixed bottom-8 right-8 text-xs text-gray-300 tracking-widest uppercase hidden md:block">禅</div>

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
