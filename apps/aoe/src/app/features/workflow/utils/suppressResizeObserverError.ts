/**
 * "ResizeObserver loop completed with undelivered notifications" 에러 차단.
 *
 * 배경:
 * - NodeResizer 등 ResizeObserver 사용 컴포넌트가 콜백 안에서 layout 을 변경하면, 같은 frame 에
 *   처리 못 한 notification 이 남아 브라우저가 위 에러를 발생시킴. 동작에는 무해하지만 webpack-dev-server 의
 *   runtime error overlay 와 production 콘솔을 오염시킴.
 * - addEventListener('error', ...) 로 swallow 하는 방식은 module federation 환경에서 효과가 부족함:
 *   각 remote 가 자체 webpack-dev-server overlay client 를 같은 window 에 inject 하는데 등록 순서·phase 가
 *   먼저라 우리 listener 가 가로채지 못함.
 *
 * 해법: window.ResizeObserver 자체를 wrap 해서 콜백을 requestAnimationFrame 으로 defer.
 * 같은 frame 안에서 layout 변경이 연쇄되지 않으므로 brower 가 loop 에러를 발생시키지 않음.
 * (React Spectrum / Mantine 등에서 사용하는 표준 패턴)
 */

let patched = false;

export const suppressResizeObserverError = () => {
  if (patched || typeof window === 'undefined' || !window.ResizeObserver) return;
  patched = true;

  const OriginalResizeObserver = window.ResizeObserver;

  class PatchedResizeObserver extends OriginalResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      let frame = 0;
      super((entries, observer) => {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          frame = 0;
          callback(entries, observer);
        });
      });
    }
  }

  window.ResizeObserver = PatchedResizeObserver;
};
