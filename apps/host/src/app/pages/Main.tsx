import * as React from 'react';
import { useAuthStore } from '@/shared-store';

// aoe remote 의 에이전트 채팅 floating 위젯 — 메인 홈에서만 노출. 로드 실패 시 화면에 영향 없도록 null fallback.
const AgentChatFab = React.lazy(() => import('aoe/AgentChatFab').catch(() => ({ default: () => null })));

export default function Main() {
  const { userInfo, getCurrentRoleName } = useAuthStore();
  // aoe 에이전트 조회 권한이 있을 때만 채팅 위젯 노출
  // TODO: 추후 권한 체크 로직으로 변경
  const canUseAgentChat = true;
  // const canUseAgentChat = useNavigationStore((s) => s.permissions.includes('aoe:agent:read'));

  const displayName = userInfo?.username ?? userInfo?.userAccount ?? '사용자';
  const roleName = getCurrentRoleName();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-white bt-shadow">
      <div className="flex flex-col items-center gap-8">
        {/* Hero Typography */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Welcome to</p>
          <h1 className="mt-3 text-5xl font-bold tracking-tight text-gray-900">BT-Admin</h1>
        </div>

        {/* Divider */}
        <div className="h-px w-16 bg-gray-300" />

        {/* User Info */}
        <div className="text-center">
          <p className="text-2xl font-semibold text-gray-700">{displayName}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-gray-400">{roleName}</p>
        </div>
      </div>

      {canUseAgentChat && (
        <React.Suspense fallback={null}>
          <AgentChatFab />
        </React.Suspense>
      )}
    </div>
  );
}
