import { useEffect, useState } from 'react';
import TaskView from './TaskView';
import { fetchPublicToken, getPublicBearerToken, useSuppressApiError401 } from '../../features/board/api/publicAuth';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

/**
 * OAuth2 Client Credentials로 Bearer 토큰을 발급한 뒤 TaskView를 렌더하는 공개 전광판 뷰.
 *
 * - URL: /taskboard/board/task-view-public/:layoutId/:displayId
 * - 로그인 없이 접근 가능 — apps/host SessionGuard.tsx가 이 경로를 우회하도록 설정돼 있음.
 * - Bearer 토큰은 모듈 레벨(publicAuth.ts)에 저장되어, 이후 taskboardApi·ctiRedisApi의 모든 GET
 *   요청에 자동으로 포함된다. WebSocket(/ws/proxy/**)은 Bearer 토큰을 HTTP Upgrade 헤더로 보낼 수
 *   없는 브라우저 제약으로 실시간 Redis 데이터를 수신하지 못할 수 있다.
 */

const PUBLIC_CLIENT_ID = 'taskboard-api';
const PUBLIC_CLIENT_SECRET = 'JVKksRE5AafZROD_LWxRIrnGB9894Ula';

export default function TaskViewPublic() {
  useSuppressApiError401();
  const [ready, setReady] = useState(() => !!getPublicBearerToken());
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (ready) return;
    fetchPublicToken(PUBLIC_CLIENT_ID, PUBLIC_CLIENT_SECRET)
      .then(() => setReady(true))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setAuthError(`공개 인증 실패: ${msg}`);
      });
  }, [ready]);

  if (authError) {
    return <div className="flex items-center justify-center h-screen bg-black text-red-400 text-sm px-6 text-center">{authError}</div>;
  }

  if (!ready) return <FallbackSpinner useFullScreen />;

  return <TaskView />;
}
