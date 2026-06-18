import { useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { registerChart, unregisterChart } from '../../utils/chartCaptureRegistry';

interface PanelEChartProps {
  option: Record<string, unknown>;
  /** 차트 캡처(PNG) 대상 식별용 패널 ID. 지정 시 캡처 레지스트리에 인스턴스 등록. */
  panelId?: number;
}

/**
 * 패널 차트(ECharts) 공통 래퍼.
 *
 * echarts-for-react 는 기본적으로 window resize 에만 반응하므로, react-grid-layout 의
 * 패널 리사이즈·균등분할 등 "컨테이너만" 변하는 경우엔 캔버스가 이전 크기를 유지해
 * 패널 영역 밖으로 넘쳐 그려지거나 이웃 패널과 겹쳐 보인다. ResizeObserver 로 컨테이너
 * 크기 변화를 감지해 매번 echarts.resize() 를 호출해 캔버스를 영역에 맞춘다.
 *
 * 또한 height 를 컨테이너(100%)에만 의존시키고 minHeight 강제값을 두지 않아,
 * 높이가 작은 좁은 패널에서 차트가 콘텐츠 영역을 넘기지 않도록 한다.
 */
export default function PanelEChart({ option, panelId }: PanelEChartProps) {
  const chartRef = useRef<ReactECharts>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // 차트 캡처(PNG) 레지스트리 등록/해제 — 캡처 시점에 getEchartsInstance().getDataURL() 사용.
  useEffect(() => {
    if (panelId == null) return;
    registerChart(panelId, () => chartRef.current?.getEchartsInstance());
    return () => unregisterChart(panelId);
  }, [panelId]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        chartRef.current?.getEchartsInstance().resize();
      });
    });
    ro.observe(box);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={boxRef} className="h-full w-full min-h-0">
      <ReactECharts ref={chartRef} option={option} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate />
    </div>
  );
}
