import React from 'react';
import PrivateRouteGate from './PrivateRouteGate';
import PublicRouteGate from './PublicRouteGate';
import { resolveInitialVerdict } from './lib/publicRoutes';

// 문서 로드 시 진입 pathname으로 1회 발사 — SPA 내부 이동은 재판정하지 않는다.
// (public 화면은 window.open 새창 진입이 정상 경로. pathname 변화마다 재판정하면 판정 대기 중
//  PrivateRouteGate가 언마운트되어 Layout keep-alive·remote 상태가 파괴된다.)
// 모듈 레벨 promise 유지 필수 — 렌더 중 생성하면 use()가 매번 서스펜드한다.
const verdictPromise = resolveInitialVerdict(window.location.pathname);

/**
 * public/private 트리 분기 게이트.
 * - 'public'  → PublicRouteGate: 세션 체크·개인화 쿼리·WS 없는 최소 트리
 * - 'private' → PrivateRouteGate: 기존 4단 가드 조립(SessionGuard → SharedInfoProvider → RouteGuard → WsSessionEventHandler)
 */
export default function RouteShell() {
  // React 19 use() — promise 미해결 동안 상위 Suspense(app.tsx의 FallbackSpinner)로 서스펜드.
  // resolveInitialVerdict는 절대 reject하지 않으므로(fail-closed) 에러 경계 불필요.
  const verdict = React.use(verdictPromise);
  return verdict === 'public' ? <PublicRouteGate /> : <PrivateRouteGate />;
}
