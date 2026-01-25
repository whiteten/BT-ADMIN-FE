/**
 * 로그인 페이지 - 오리지널 변형 3 (Split Editorial)
 * 좌우 분할 에디토리얼 레이아웃
 * 대형 타이포그래피, 매거진 스타일
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { ArrowRight, Lock, LockKeyhole, User, Users } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

export default function LoginOriginal3() {
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
      {/* Left side - Editorial typography */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12"
        style={{
          background: 'linear-gradient(160deg, #1E3A8A 0%, #2563EB 60%, #3B82F6 100%)',
        }}
      >
        {/* Decorative lines */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-white/20 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent to-white/20" />
          <div className="absolute top-0 left-12 w-px h-full bg-gradient-to-b from-white/10 to-transparent" />
          <div className="absolute top-0 right-12 w-px h-full bg-gradient-to-b from-transparent to-white/10" />
        </div>

        {/* Top - Logo */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-white/80 font-medium">NLU Bot Admin</span>
          </div>
        </div>

        {/* Center - Large typography */}
        <div className="relative">
          <div className="text-blue-200/40 text-sm font-medium tracking-[0.3em] uppercase mb-6">Conversational AI Platform</div>
          <h1 className="text-6xl xl:text-7xl font-extralight text-white leading-[1.1] tracking-tight">
            대화의
            <br />
            <span className="font-semibold">새로운</span>
            <br />
            <span className="text-blue-200">기준</span>
          </h1>
          <div className="mt-10 flex items-center gap-4">
            <ArrowRight className="w-5 h-5 text-blue-200/60" />
            <p className="text-blue-100/70 text-lg">자연어 처리의 새로운 가능성을 경험하세요</p>
          </div>
        </div>

        {/* Bottom - Stats row */}
        <div className="relative flex items-end gap-12">
          <div>
            <div className="text-5xl font-extralight text-white">150+</div>
            <div className="text-blue-200/60 text-sm mt-2 tracking-wide">Enterprise Clients</div>
          </div>
          <div>
            <div className="text-5xl font-extralight text-white">99.9%</div>
            <div className="text-blue-200/60 text-sm mt-2 tracking-wide">SLA Uptime</div>
          </div>
          <div>
            <div className="text-5xl font-extralight text-white">10M+</div>
            <div className="text-blue-200/60 text-sm mt-2 tracking-wide">Daily Conversations</div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
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
          <div className="mb-10">
            <h2 className="text-3xl font-light text-slate-900">환영합니다</h2>
            <p className="text-slate-500 mt-3">계정에 로그인하여 시작하세요</p>
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
              label={<span className="text-sm text-slate-600">아이디</span>}
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
              label={<span className="text-sm text-slate-600">비밀번호</span>}
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

            <Form.Item label={<span className="text-sm text-slate-600">테넌트</span>} className="!mb-5">
              <Input
                size="large"
                placeholder="테넌트명 (선택)"
                prefix={<Users className="h-4 w-4 text-slate-400" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-lg !border-slate-200 hover:!border-blue-400 focus:!border-blue-500"
              />
            </Form.Item>

            <Form.Item className="!mb-8">
              <Checkbox disabled={lockState.isLocked} className="text-sm text-slate-500">
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
                className="!h-12 !rounded-lg !font-medium !border-0 group"
                style={{
                  background: lockState.isLocked ? '#CBD5E1' : 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
                  boxShadow: lockState.isLocked ? 'none' : '0 4px 14px rgba(37, 99, 235, 0.35)',
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  {lockState.isLocked ? (
                    `잠금 해제까지 ${formatTime(lockState.retryAfterSeconds)}`
                  ) : (
                    <>
                      로그인
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </span>
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-12 pt-6 border-t border-slate-100">
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
