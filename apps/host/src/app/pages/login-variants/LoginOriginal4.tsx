/**
 * 로그인 페이지 - 오리지널 변형 4 (Minimalist Brutalist)
 * 극도로 미니멀한 브루탈리스트 접근
 * 강렬한 블루 액센트, 대담한 타이포그래피
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { Lock, LockKeyhole, User, Users } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

export default function LoginOriginal4() {
  const { form, lockState, loginError, isPending, passwordPolicy, changePasswordDialogRef, onFinish, onFinishFailed, handlePasswordChange, formatTime } = useLoginLogic();

  const renderErrorAlert = () => {
    if (lockState.isLocked) {
      return (
        <div className="mb-6 p-4 border-l-4 border-red-600 bg-red-50">
          <div className="flex items-start gap-3">
            <LockKeyhole className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-red-900 uppercase tracking-wide">계정 잠금</h4>
              <p className="text-sm text-red-700 mt-1">보안을 위해 일시적으로 잠겼습니다.</p>
              <div className="mt-2 text-3xl font-bold text-red-600 tabular-nums font-mono">{formatTime(lockState.retryAfterSeconds)}</div>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'account_dormant') {
      return (
        <div className="mb-6 p-4 border-l-4 border-amber-500 bg-amber-50">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-900 uppercase tracking-wide">휴면 계정</h4>
              <p className="text-sm text-amber-700 mt-1">{loginError.message}</p>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'account_disabled') {
      return (
        <div className="mb-6 p-4 border-l-4 border-gray-400 bg-gray-50">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">비활성화 계정</h4>
              <p className="text-sm text-gray-600 mt-1">{loginError.message}</p>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'invalid_grant') {
      const showWarning = loginError.remainingAttempts !== undefined && loginError.remainingAttempts <= 2;
      return (
        <div className={cn('mb-6 p-4 border-l-4', showWarning ? 'border-red-600 bg-red-50' : 'border-gray-300 bg-gray-50')}>
          <div className="flex items-start gap-3">
            <Lock className={cn('h-5 w-5 flex-shrink-0 mt-0.5', showWarning ? 'text-red-600' : 'text-gray-500')} />
            <div>
              <h4 className={cn('text-sm font-bold uppercase tracking-wide', showWarning ? 'text-red-900' : 'text-gray-900')}>로그인 실패</h4>
              <p className={cn('text-sm mt-1', showWarning ? 'text-red-700' : 'text-gray-600')}>{loginError.message}</p>
              {loginError.remainingAttempts !== undefined && (
                <p className={cn('text-sm mt-2 font-bold', showWarning ? 'text-red-600' : 'text-gray-700')}>남은 시도: {loginError.remainingAttempts}회</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (loginError.message) {
      return (
        <div className="mb-6 p-4 border-l-4 border-red-600 bg-red-50">
          <p className="text-sm text-red-700">{loginError.message}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col">
      {/* Top bar - blue accent line */}
      <div className="h-2 bg-blue-600" />

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Left decorative column - visible on large screens */}
        <div className="hidden lg:flex lg:w-24 bg-gray-50 border-r border-gray-200 flex-col items-center justify-between py-12">
          <div className="w-3 h-3 bg-blue-600" />
          <div className="writing-vertical-lr text-gray-300 text-xs tracking-[0.5em] uppercase font-medium rotate-180">NLU BOT ADMIN SYSTEM</div>
          <div className="w-3 h-3 border-2 border-gray-300" />
        </div>

        {/* Form section */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
          <div className="w-full max-w-lg">
            {/* Header - Large brutalist typography */}
            <div className="mb-12">
              <div className="text-gray-400 text-xs font-bold tracking-[0.3em] uppercase mb-4">BRIDGETEC PLATFORM</div>
              <h1 className="text-5xl lg:text-6xl font-black text-gray-900 leading-none tracking-tight">
                LOG
                <br />
                <span className="text-blue-600">IN</span>
              </h1>
              <div className="mt-6 h-1 w-16 bg-blue-600" />
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
                label={<span className="text-xs font-bold text-gray-500 uppercase tracking-wider">아이디</span>}
                rules={[{ required: true, message: '아이디를 입력해주세요' }]}
                className="!mb-6"
              >
                <Input
                  size="large"
                  placeholder="아이디를 입력하세요"
                  prefix={<User className="h-4 w-4 text-gray-400" />}
                  disabled={lockState.isLocked}
                  className="!h-14 !rounded-none !border-x-0 !border-t-0 !border-b-2 !border-gray-200 hover:!border-blue-500 focus:!border-blue-600 !bg-transparent !shadow-none"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span className="text-xs font-bold text-gray-500 uppercase tracking-wider">비밀번호</span>}
                rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
                className="!mb-6"
              >
                <Input.Password
                  size="large"
                  placeholder="비밀번호를 입력하세요"
                  prefix={<Lock className="h-4 w-4 text-gray-400" />}
                  disabled={lockState.isLocked}
                  className="!h-14 !rounded-none !border-x-0 !border-t-0 !border-b-2 !border-gray-200 hover:!border-blue-500 focus:!border-blue-600 !bg-transparent !shadow-none"
                />
              </Form.Item>

              <Form.Item label={<span className="text-xs font-bold text-gray-500 uppercase tracking-wider">테넌트</span>} className="!mb-6">
                <Input
                  size="large"
                  placeholder="테넌트명 (선택)"
                  prefix={<Users className="h-4 w-4 text-gray-400" />}
                  disabled={lockState.isLocked}
                  className="!h-14 !rounded-none !border-x-0 !border-t-0 !border-b-2 !border-gray-200 hover:!border-blue-500 focus:!border-blue-600 !bg-transparent !shadow-none"
                />
              </Form.Item>

              <Form.Item className="!mb-8">
                <Checkbox disabled={lockState.isLocked} className="text-sm text-gray-600">
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
                  className="!h-14 !rounded-none !font-bold !text-base !tracking-wider !uppercase !border-0"
                  style={{
                    background: lockState.isLocked ? '#E5E7EB' : '#2563EB',
                    color: lockState.isLocked ? '#9CA3AF' : '#FFFFFF',
                  }}
                >
                  {lockState.isLocked ? `잠금 해제까지 ${formatTime(lockState.retryAfterSeconds)}` : '로그인'}
                </Button>
              </Form.Item>
            </Form>

            {/* Footer */}
            <div className="mt-16 flex items-center justify-between text-xs text-gray-400">
              <span className="font-medium tracking-wide">© 2025 BRIDGETEC</span>
              <span className="font-mono">v2.0.0</span>
            </div>
          </div>
        </div>

        {/* Right decorative section - visible on large screens */}
        <div className="hidden xl:flex xl:w-80 bg-gray-900 flex-col justify-between p-12">
          <div>
            <div className="text-blue-400 text-xs font-bold tracking-[0.3em] uppercase mb-8">SYSTEM STATUS</div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-400" />
                <span className="text-white/80 text-sm">All systems operational</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-400" />
                <span className="text-white/80 text-sm">API endpoints healthy</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-400" />
                <span className="text-white/80 text-sm">Database connected</span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-6xl font-black text-white/10 leading-none">
              NLU
              <br />
              BOT
            </div>
          </div>
        </div>
      </div>

      {/* Custom styles for brutalist inputs */}
      <style>{`
        .ant-input-affix-wrapper:focus-within {
          box-shadow: none !important;
        }
        .ant-form-item-explain-error {
          color: #DC2626 !important;
          font-weight: 500;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.05em;
          margin-top: 8px;
        }
        .writing-vertical-lr {
          writing-mode: vertical-lr;
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
