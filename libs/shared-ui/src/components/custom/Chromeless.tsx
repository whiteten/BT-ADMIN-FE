import { type ReactNode, Suspense } from 'react';
import { useChromeless } from '@/shared-store';
import { FallbackSpinner } from './FallbackSpinner';

interface ChromelessProps {
  children: ReactNode;
}

/**
 * chromeless 화면 라우트 래퍼 — host Layout 의 헤더/사이드바/패널을 제거한다.
 *
 * lazy 페이지를 자체 Suspense 로 감싼다. 래퍼 자신은 suspend 하지 않으므로 Layout 과 같은 커밋에
 * 마운트되고, useChromeless 의 useLayoutEffect 가 페인트 직전에 chrome 을 제거해 깜빡임이 없다.
 * (래퍼 없이 lazy 페이지 내부에서 useChromeless 를 호출하면, 페이지가 lazy 로딩되는 동안 Layout 이
 *  chrome 을 먼저 그려 로딩 구간 내내 chrome 이 보이는 깜빡임이 생긴다.)
 *
 * 사용: routes.tsx 의 leaf element 를 감싼다.
 *   { path: 'workflow/:agentId', element: <Chromeless><WorkflowEdit /></Chromeless> }
 */
export default function Chromeless({ children }: ChromelessProps) {
  useChromeless();
  return <Suspense fallback={<FallbackSpinner useFullScreen />}>{children}</Suspense>;
}
