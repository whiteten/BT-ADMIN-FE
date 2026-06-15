import { type ComponentProps, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';

/**
 * 컨테이너 폭/높이 변화(위젯 Rnd 리사이즈)를 감지해 ECharts 인스턴스를 resize 하는 래퍼.
 * HealthBoardWidget 의 동일 패턴 — 위젯이 그리드에서 크기가 바뀌어도 차트가 따라간다.
 */
export default function AutoResizeECharts(props: ComponentProps<typeof ReactECharts>) {
  const chartRef = useRef<ReactECharts>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      chartRef.current?.getEchartsInstance()?.resize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full">
      <ReactECharts ref={chartRef} notMerge lazyUpdate {...props} style={{ height: '100%', width: '100%', ...props.style }} />
    </div>
  );
}
