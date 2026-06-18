import { useLocation } from 'react-router-dom';
import { useAuthStore, useMenuStore } from '@/shared-store';

export default function Main() {
  const location = useLocation();
  const { userInfo, getCurrentRoleName } = useAuthStore();
  const { menuConfigs } = useMenuStore();

  const appId = location.pathname.split('/')[1];
  const appName = menuConfigs.find((config) => config.appId === appId)?.appName ?? appId;
  const displayName = userInfo?.username ?? userInfo?.userAccount ?? '사용자';
  const roleName = getCurrentRoleName();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-white bt-shadow">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Welcome to</p>
          <h1 className="mt-3 text-5xl font-bold tracking-tight text-gray-900">{appName}</h1>
        </div>

        <div className="h-px w-16 bg-gray-300" />

        <div className="text-center">
          <p className="text-2xl font-semibold text-gray-700">{displayName}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-gray-400">{roleName}</p>
        </div>
      </div>
    </div>
  );
}
