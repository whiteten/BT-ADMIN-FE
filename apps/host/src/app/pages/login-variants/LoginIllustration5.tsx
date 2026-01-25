/**
 * 로그인 페이지 - 일러스트 V5 (Serene Peaks)
 * 자연/산 풍경 이미지 + 차분한 청록/에메랄드 톤
 * 명상적이고 신뢰감 있는 분위기
 */

import { Button, Checkbox, Form, Input } from 'antd';
import { Lock, LockKeyhole, Mountain, User, Users } from 'lucide-react';
import { useLoginLogic } from './useLoginLogic';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/libs/shared-ui/src/components/custom/ChangePasswordDialog';
import { Log } from '@/libs/shared-util/src/lib/log';

export default function LoginIllustration5() {
  const { form, lockState, loginError, isPending, passwordPolicy, changePasswordDialogRef, onFinish, onFinishFailed, handlePasswordChange, formatTime } = useLoginLogic();

  const renderErrorAlert = () => {
    if (lockState.isLocked) {
      return (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100">
          <div className="flex items-start gap-3">
            <LockKeyhole className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-800">계정 잠금</h4>
              <p className="text-sm text-red-600 mt-1">보안을 위해 일시적으로 잠겼습니다.</p>
              <div className="mt-2 text-2xl font-light text-red-700 tabular-nums">{formatTime(lockState.retryAfterSeconds)}</div>
            </div>
          </div>
        </div>
      );
    }

    if (loginError.error === 'account_dormant') {
      return (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-100">
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
        <div className="mb-6 p-4 rounded-xl bg-gray-50 border border-gray-200">
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
        <div className={cn('mb-6 p-4 rounded-xl border', showWarning ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-200')}>
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
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100">
          <p className="text-sm text-red-600">{loginError.message}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left side - Nature/Mountain Image */}
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden">
        {/* Background Image - Mountain landscape */}
        <img src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1400&q=80" alt="Mountain landscape" className="absolute inset-0 w-full h-full object-cover" />

        {/* Gradient overlay - Teal/Emerald tones */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900/85 via-emerald-800/70 to-cyan-900/80" />

        {/* Subtle texture overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-between p-12 z-10">
          {/* Top */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
              <Mountain className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <span className="text-white font-medium tracking-wide">NLU Bot Admin</span>
              <div className="text-emerald-300/70 text-xs">Trusted Platform</div>
            </div>
          </div>

          {/* Center */}
          <div className="max-w-md">
            <h2 className="text-5xl font-extralight text-white leading-[1.15] tracking-tight">
              고요함 속에서
              <br />
              <span className="font-semibold text-emerald-300">명확한 답</span>을
              <br />
              찾습니다
            </h2>

            <p className="mt-8 text-teal-100/70 text-lg leading-relaxed">
              복잡한 대화 속에서도 정확한 인사이트를 제공하는
              <br />
              AI 플랫폼으로 고객 경험을 혁신하세요.
            </p>

            <div className="mt-10 flex items-center gap-6">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-teal-100/80 text-sm">안정적인 서비스</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-teal-100/80 text-sm">신뢰할 수 있는 AI</span>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="flex items-center gap-10">
            <div>
              <div className="text-4xl font-extralight text-white">99.9%</div>
              <div className="text-teal-200/50 text-sm mt-1">안정성</div>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div>
              <div className="text-4xl font-extralight text-white">24/7</div>
              <div className="text-teal-200/50 text-sm mt-1">운영</div>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div>
              <div className="text-4xl font-extralight text-white">150+</div>
              <div className="text-teal-200/50 text-sm mt-1">기업 고객</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-2xl bg-teal-600 flex items-center justify-center">
              <Mountain className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-slate-900">NLU Bot Admin</span>
          </div>

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-light text-slate-900">환영합니다</h1>
            <p className="text-slate-500 mt-3">계정에 로그인하세요.</p>
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
              label={<span className="text-sm font-medium text-slate-600">아이디</span>}
              rules={[{ required: true, message: '아이디를 입력해주세요' }]}
              className="!mb-5"
            >
              <Input
                size="large"
                placeholder="아이디를 입력하세요"
                prefix={<User className="h-4 w-4 text-slate-400" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-xl !border-slate-200 hover:!border-teal-400 focus:!border-teal-500"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="text-sm font-medium text-slate-600">비밀번호</span>}
              rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
              className="!mb-5"
            >
              <Input.Password
                size="large"
                placeholder="비밀번호를 입력하세요"
                prefix={<Lock className="h-4 w-4 text-slate-400" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-xl !border-slate-200 hover:!border-teal-400 focus:!border-teal-500"
              />
            </Form.Item>

            <Form.Item label={<span className="text-sm font-medium text-slate-600">테넌트</span>} className="!mb-5">
              <Input
                size="large"
                placeholder="테넌트명 (선택)"
                prefix={<Users className="h-4 w-4 text-slate-400" />}
                disabled={lockState.isLocked}
                className="!h-12 !rounded-xl !border-slate-200 hover:!border-teal-400 focus:!border-teal-500"
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
                className="!h-12 !rounded-xl !font-medium !border-0"
                style={{
                  background: lockState.isLocked ? '#CBD5E1' : 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                  boxShadow: lockState.isLocked ? 'none' : '0 4px 14px rgba(13, 148, 136, 0.35)',
                }}
              >
                {lockState.isLocked ? `잠금 해제까지 ${formatTime(lockState.retryAfterSeconds)}` : '로그인'}
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-12 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center">© 2025 BridgeTec. All rights reserved.</p>
          </div>
        </div>
      </div>

      <style>{`
        .ant-checkbox-checked .ant-checkbox-inner {
          background-color: #0D9488 !important;
          border-color: #0D9488 !important;
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
