import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export interface Remote {
  key: string;
  label: string;
}

export default function useRemoteSelector() {
  const remotes = useMemo(() => {
    return [
      { key: 'manager', label: 'Manager' },
      { key: 'fca', label: 'Focus AI' },
    ];
  }, []);
  const { pathname } = useLocation();
  const [remote, setRemote] = useState<Remote>(remotes.find((remote) => remote.key === pathname.split('/')[1]) ?? remotes[0]);
  const navigate = useNavigate();

  const setSelectedRemote = (remote: Remote) => {
    setRemote(remote);
    navigate(`/${remote.key}`);
  };

  useEffect(() => {
    const remoteKey = pathname.split('/')[1];
    if (remoteKey === remote.key) return;
    const _remote = remotes.find((remote) => remote.key === remoteKey);
    if (_remote) setRemote(_remote);
  }, [remotes, pathname, remote.key]);

  return { remotes, selectedRemote: remote, setSelectedRemote };
}
