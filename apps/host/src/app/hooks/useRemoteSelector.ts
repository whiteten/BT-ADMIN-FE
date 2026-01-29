import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { type MenuConfig, useMenuStore } from '@/shared-store';

export type Remote = Pick<MenuConfig, 'appId' | 'appName' | 'icon'>;

export default function useRemoteSelector() {
  const { menuConfigs } = useMenuStore();
  const remotes: Remote[] = menuConfigs;
  const { pathname } = useLocation();
  const [remote, setRemote] = useState<Remote | null>(null);
  const navigate = useNavigate();

  const setSelectedRemote = (remote: Remote) => {
    setRemote(remote);
    navigate(`/${remote.appId}`);
  };

  useEffect(() => {
    const remoteKey = pathname.split('/')[1];
    if (remoteKey === remote?.appId) return;
    const matched = remotes.find((r) => r.appId === remoteKey);
    setRemote(matched ?? remotes[0] ?? null);
  }, [remotes, pathname, remote?.appId]);

  return { remotes, selectedRemote: remote, setSelectedRemote };
}
