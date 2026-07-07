import RouteGuard from './RouteGuard';
import SessionGuard from './SessionGuard';
import SharedInfoProvider from './SharedInfoProvider';
import WsSessionEventHandler from './WsSessionEventHandler';

/**
 * 인증(private) 트리의 가드 조립 — RouteShell이 'private' 판정 시 렌더.
 * 세션 체크 → 공유정보(사용자·메뉴·WS 등) 로드 → 메뉴 권한 → WS 세션 이벤트 순.
 * 각 가드는 children ?? <Outlet/> 패턴이므로 마지막 WsSessionEventHandler가 <Outlet/>을 그린다.
 */
export default function PrivateRouteGate() {
  return (
    <SessionGuard>
      <SharedInfoProvider>
        <RouteGuard>
          <WsSessionEventHandler />
        </RouteGuard>
      </SharedInfoProvider>
    </SessionGuard>
  );
}
