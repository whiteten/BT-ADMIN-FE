import { useEffect, useState } from 'react';
import { DESIGN_WIDTH } from '../utils/widgetVisualStyle';

/**
 * 전광판이 실제로 화면에 그려지는 가로 픽셀 폭(배경 이미지 비율 기준 min(100vw, imgRatio*100vh))을
 * 디자인 기준폭(DESIGN_WIDTH)과 비교한 배율을 반환한다.
 * 위젯 폰트 크기에 이 배율을 곱하면, 화면(모니터) 크기가 달라져도 TaskCreate 편집기에서 잡은 비례 그대로 보인다.
 */
export function useResponsiveFontScale(imgRatio: number): number {
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const boardWidthPx = Math.min(viewport.w, imgRatio * viewport.h);
  return boardWidthPx > 0 ? boardWidthPx / DESIGN_WIDTH : 1;
}
