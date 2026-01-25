/**
 * 로그인 페이지 - 오리지널 V7 (Slate Professional)
 * 세련된 슬레이트/그레이 전문 테마
 * 현대 건축/콘크리트 이미지 + 모노크롬 그라데이션
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { Layers, Lock, LockKeyhole, User, Users } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

export default function LoginOriginal7() {
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
              <div className="mt-2 text-2xl font-light text-red-700 tabular-nums tracking-wider">{formatTime(lockState.retryAfterSeconds)}</div>
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
        <div className="mb-6 p-4 rounded-lg bg-slate-100 border border-slate-200">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-slate-700">비활성화 계정</h4>
              <p className="text-sm text-slate-500 mt-1">{loginError.message}</p>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'invalid_grant') {
      const showWarning = loginError.remainingAttempts !== undefined && loginError.remainingAttempts <= 2;
      return (
        <div className={cn('mb-6 p-4 rounded-lg border', showWarning ? 'bg-red-50 border-red-100' : 'bg-slate-100 border-slate-200')}>
          <div className="flex items-start gap-3">
            <Lock className={cn('h-5 w-5 flex-shrink-0 mt-0.5', showWarning ? 'text-red-500' : 'text-slate-400')} />
            <div>
              <h4 className={cn('text-sm font-semibold', showWarning ? 'text-red-800' : 'text-slate-700')}>로그인 실패</h4>
              <p className={cn('text-sm mt-1', showWarning ? 'text-red-600' : 'text-slate-500')}>{loginError.message}</p>
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
      {/* Left side - Architecture Image */}
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden">
        {/* Background Image - Modern concrete architecture */}
        <img src="https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=1400&q=80" alt="Modern architecture" className="absolute inset-0 w-full h-full object-cover" />

        {/* Monochrome gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/85 to-zinc-700/75" />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-between p-12 z-10">
          {/* Top - Logo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                <Layers className="w-5 h-5 text-slate-300" />
              </div>
              <div>
                <span className="text-white font-medium tracking-wide text-sm uppercase">NLU Bot Admin</span>
              </div>
            </div>
            <div className="text-slate-500 text-xs tracking-widest uppercase">Professional Edition</div>
          </div>

          {/* Center - Main content */}
          <div className="max-w-lg">
            <div className="w-20 h-px bg-gradient-to-r from-slate-400 to-transparent mb-8" />

            <h2 className="text-5xl font-extralight text-white leading-tight tracking-tight">
              정밀함이
              <br />
              만드는
              <br />
              <span className="font-medium text-slate-300">완벽함</span>
            </h2>

            <p className="mt-10 text-slate-400 text-lg leading-relaxed">
              체계적인 대화 설계와 정교한 AI 분석으로
              <br />
              비즈니스의 기반을 견고하게 합니다.
            </p>
          </div>

          {/* Bottom - Stats */}
          <div className="flex items-center gap-8">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-widest mb-2">Architecture</div>
              <div className="text-2xl font-extralight text-white">Modular</div>
            </div>
            <div className="w-px h-10 bg-slate-700" />
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-widest mb-2">Scalability</div>
              <div className="text-2xl font-extralight text-white">Infinite</div>
            </div>
            <div className="w-px h-10 bg-slate-700" />
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-widest mb-2">Precision</div>
              <div className="text-2xl font-extralight text-white">99.9%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-lg bg-slate-800 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-medium text-slate-900 tracking-wide">NLU Bot Admin</span>
          </div>

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-2xl font-light text-slate-900 tracking-tight">로그인</h1>
            <p className="text-slate-500 mt-3 text-sm">관리자 계정으로 접속하세요.</p>
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
              label={<span className="text-xs font-medium text-slate-500 uppercase tracking-wider">아이디</span>}
              rules={[{ required: true, message: '아이디를 입력해주세요' }]}
              className="!mb-5"
            >
              <Input
                size="large"
                placeholder="아이디를 입력하세요"
                prefix={<User className="h-4 w-4 text-slate-400" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-lg !border-slate-200 !bg-white hover:!border-slate-400 focus:!border-slate-600"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="text-xs font-medium text-slate-500 uppercase tracking-wider">비밀번호</span>}
              rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
              className="!mb-5"
            >
              <Input.Password
                size="large"
                placeholder="비밀번호를 입력하세요"
                prefix={<Lock className="h-4 w-4 text-slate-400" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-lg !border-slate-200 !bg-white hover:!border-slate-400 focus:!border-slate-600"
              />
            </Form.Item>

            <Form.Item label={<span className="text-xs font-medium text-slate-500 uppercase tracking-wider">테넌트</span>} className="!mb-5">
              <Input
                size="large"
                placeholder="테넌트명 (선택)"
                prefix={<Users className="h-4 w-4 text-slate-400" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-lg !border-slate-200 !bg-white hover:!border-slate-400 focus:!border-slate-600"
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
                className="!h-12 !rounded-lg !font-medium !border-0 !tracking-wide"
                style={{
                  background: lockState.isLocked ? '#CBD5E1' : '#1E293B',
                  boxShadow: lockState.isLocked ? 'none' : '0 4px 14px rgba(30, 41, 59, 0.3)',
                }}
              >
                {lockState.isLocked ? `잠금 해제까지 ${formatTime(lockState.retryAfterSeconds)}` : '로그인'}
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-12 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-400 text-center tracking-wide">© 2025 BridgeTec. All rights reserved.</p>
          </div>
        </div>
      </div>

      <style>{`
        .ant-checkbox-checked .ant-checkbox-inner {
          background-color: #1E293B !important;
          border-color: #1E293B !important;
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
