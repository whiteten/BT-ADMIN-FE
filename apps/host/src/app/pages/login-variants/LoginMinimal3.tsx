/**
 * 로그인 페이지 - 미니멀 V3 (스칸디나비안)
 * 따뜻한 중성 톤, 부드러운 곡선, 자연스러운 여백
 * 북유럽 인테리어 느낌의 편안한 디자인
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { Lock, LockKeyhole, User, Users } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

export default function LoginMinimal3() {
  const { form, lockState, loginError, isPending, passwordPolicy, changePasswordDialogRef, onFinish, onFinishFailed, handlePasswordChange, formatTime } = useLoginLogic();

  const renderErrorAlert = () => {
    if (lockState.isLocked) {
      return (
        <div className="mb-6 p-5 rounded-2xl bg-rose-50/50">
          <div className="flex items-center gap-2 text-rose-600 text-sm font-medium">
            <LockKeyhole className="h-4 w-4" />
            잠시 기다려 주세요
          </div>
          <div className="mt-2 text-3xl font-light text-rose-500 tabular-nums">{formatTime(lockState.retryAfterSeconds)}</div>
        </div>
      );
    }

    if (loginError.error === 'account_dormant') {
      return (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50/50">
          <p className="text-amber-700 text-sm">{loginError.message}</p>
        </div>
      );
    }

    if (loginError.error === 'account_disabled') {
      return (
        <div className="mb-6 p-4 rounded-2xl bg-stone-100">
          <p className="text-stone-600 text-sm">{loginError.message}</p>
        </div>
      );
    }

    if (loginError.error === 'invalid_grant') {
      const showWarning = loginError.remainingAttempts !== undefined && loginError.remainingAttempts <= 2;
      return (
        <div className={cn('mb-6 p-4 rounded-2xl', showWarning ? 'bg-rose-50/50' : 'bg-stone-100')}>
          <p className={cn('text-sm', showWarning ? 'text-rose-600' : 'text-stone-600')}>{loginError.message}</p>
          {loginError.remainingAttempts !== undefined && <p className={cn('mt-2 text-xs', showWarning && 'text-rose-500')}>{loginError.remainingAttempts}번의 기회가 남았어요</p>}
        </div>
      );
    }

    if (loginError.message) {
      return (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50/50">
          <p className="text-rose-600 text-sm">{loginError.message}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: '#F5F3EF' }}>
      {/* Decorative shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Warm organic shapes */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #E7DDD4 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 -left-20 w-96 h-96 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #D4C4B5 0%, transparent 70%)' }} />
      </div>

      {/* Main card */}
      <div
        className="relative z-10 w-full max-w-md p-10 rounded-3xl"
        style={{
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Header */}
        <div className="mb-10 text-center">
          {/* Simple logo */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-stone-100 mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-stone-500" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
            </svg>
          </div>

          <h1 className="text-2xl font-medium text-stone-800">안녕하세요</h1>
          <p className="mt-2 text-stone-500 text-sm">NLU Bot Admin에 로그인</p>
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
          <Form.Item name="userId" label={<span className="text-sm text-stone-600">아이디</span>} rules={[{ required: true, message: '아이디를 입력해주세요' }]} className="!mb-5">
            <Input
              size="large"
              placeholder="아이디를 입력하세요"
              prefix={<User className="h-4 w-4 text-stone-400" />}
              disabled={lockState.isLocked}
              className="!rounded-xl !border-stone-200 !bg-stone-50/50 !h-12 hover:!border-stone-300 focus:!border-stone-400 !shadow-none placeholder:!text-stone-400"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span className="text-sm text-stone-600">비밀번호</span>}
            rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
            className="!mb-5"
          >
            <Input.Password
              size="large"
              placeholder="비밀번호를 입력하세요"
              prefix={<Lock className="h-4 w-4 text-stone-400" />}
              disabled={lockState.isLocked}
              className="!rounded-xl !border-stone-200 !bg-stone-50/50 !h-12 hover:!border-stone-300 focus:!border-stone-400 !shadow-none placeholder:!text-stone-400 [&_.ant-input]:!bg-transparent"
            />
          </Form.Item>

          <Form.Item label={<span className="text-sm text-stone-600">테넌트</span>} className="!mb-5">
            <Input
              size="large"
              placeholder="테넌트명 (선택사항)"
              prefix={<Users className="h-4 w-4 text-stone-400" />}
              disabled={lockState.isLocked}
              className="!rounded-xl !border-stone-200 !bg-stone-50/50 !h-12 hover:!border-stone-300 focus:!border-stone-400 !shadow-none placeholder:!text-stone-400"
            />
          </Form.Item>

          <Form.Item className="!mb-8">
            <Checkbox disabled={lockState.isLocked} className="text-sm text-stone-500">
              로그인 정보 기억하기
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
              className="!h-12 !rounded-xl !font-medium !text-sm !border-0"
              style={{
                background: lockState.isLocked ? '#D6D3D1' : '#78716C',
                boxShadow: lockState.isLocked ? 'none' : '0 10px 30px -10px rgba(120, 113, 108, 0.5)',
              }}
            >
              {lockState.isLocked ? formatTime(lockState.retryAfterSeconds) : '로그인'}
            </Button>
          </Form.Item>
        </Form>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-stone-100 text-center">
          <p className="text-xs text-stone-400">© 2025 BridgeTec</p>
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
