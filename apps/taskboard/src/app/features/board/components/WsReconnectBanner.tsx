import type { CtiWsStatus } from '../hooks/useCtiqWebSocket';

/**
 * 전광판 실행 화면 상단 재연결 배너 — WS가 끊겨 재연결을 시도하는 동안만 표시한다.
 * 연결되면(status==='connected') 아무것도 렌더하지 않아 화면을 가리지 않는다.
 * 무인 대형 화면에서 "데이터가 멈췄는데 그대로인" 상황을 운영자가 즉시 인지하도록 하는 것이 목적.
 */
export function WsReconnectBanner({ status }: { status: CtiWsStatus }) {
  if (status === 'connected') return null;
  const isReconnecting = status === 'reconnecting';
  return (
    <div
      className="absolute top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-semibold text-white pointer-events-none"
      style={{ background: isReconnecting ? 'rgba(220,38,38,0.92)' : 'rgba(202,138,4,0.92)' }}
    >
      <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
      {isReconnecting ? '실시간 연결이 끊겼습니다 — 재연결 시도 중… (표시된 값은 최신이 아닐 수 있습니다)' : '실시간 서버에 연결 중…'}
    </div>
  );
}
