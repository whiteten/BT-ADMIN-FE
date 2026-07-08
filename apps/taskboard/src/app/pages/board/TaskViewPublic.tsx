import { useEffect, useState } from 'react';
import TaskView from './TaskView';
import { fetchPublicToken, getPublicBearerToken, setPublicMode } from '../../features/board/api/publicAuth';
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
  // 자식 TaskView가 mount되어 API를 쏘기 전에 반드시 먼저 설정돼야 하므로
  // useEffect가 아니라 렌더 본문에서 동기적으로 호출한다(부모 렌더 → 자식 mount 순서 보장).
  setPublicMode(true);
  const [ready, setReady] = useState(() => !!getPublicBearerToken());
  // 인증 실패해도 화면 자체(라우팅/레이아웃)는 렌더링하고, 데이터 호출만 개별적으로 실패하게 둔다 —
  // 예전엔 인증 실패 시 화면 전체를 막아서 라우팅/레이아웃이 정상인지조차 확인할 수 없었음.
  const [authWarning, setAuthWarning] = useState<string | null>(null);

  useEffect(() => {
    if (ready) return;
    fetchPublicToken(PUBLIC_CLIENT_ID, PUBLIC_CLIENT_SECRET)
      .then(() => setReady(true))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[TaskViewPublic] 공개 인증 실패 — 화면은 표시하되 데이터는 안 뜰 수 있음: ${msg}`);
        setAuthWarning(msg);
        setReady(true);
      });
  }, [ready]);

  if (!ready) return <FallbackSpinner useFullScreen />;

  return (
    <>
      {authWarning && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] bg-red-600/90 text-white text-xs px-4 py-2 rounded-md shadow-lg text-center max-w-[90vw]">
          공개 인증 실패(데이터가 안 보일 수 있음): {authWarning}
        </div>
      )}
      <TaskView />
    </>
  );
}
