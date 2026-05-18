import { useLocation } from 'react-router-dom';
import { type MenuConfig, useMenuStore } from '@/shared-store';

/**
 * 현재 URL의 첫 segment(`/<appId>/...`)에 매칭되는 remote를 돌려준다.
 * 매칭되는 remote가 없으면 null. remote 목록 자체가 필요하면 호출처에서
 * `useMenuStore`의 `menuConfigs`를 직접 구독한다.
 */
export default function useCurrentRemote(): MenuConfig | null {
  const { menuConfigs } = useMenuStore();
  const { pathname } = useLocation();
  const remoteKey = pathname.split('/')[1];
  return menuConfigs.find((r) => r.appId === remoteKey) ?? null;
}
