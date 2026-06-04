/**
 * 보고서 패널 차트(ECharts) 공통 테마.
 *
 * 기존 패널 차트는 Recharts(평면 스타일)로 그렸으나, 모니터링 위젯(echarts-for-react)이
 * 둥근 막대·게이지·도넛·splitArea 레이더 등 훨씬 다듬어진 톤을 쓰고 있어 동일 라이브러리/톤으로 통일한다.
 * 색 팔레트·툴팁·범례·그리드·그라데이션 등 공통 옵션 조각을 여기서 제공해 4종 차트가 일관된 외형을 갖도록 한다.
 */

/** 패널 차트 공통 팔레트 — 채도 높고 서로 잘 구분되는 6색(모니터링 위젯 톤과 정합). */
export const PANEL_PALETTE = ['#3b82f6', '#0a8a4a', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'] as const;

export function paletteAt(i: number): string {
  return PANEL_PALETTE[i % PANEL_PALETTE.length];
}

/** 막대/면적 채움용 세로 그라데이션(위 진하게 → 아래 옅게). hex 8자리 알파 사용. */
export function verticalGradient(color: string, topAlpha = 'ff', bottomAlpha = 'b3') {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: `${color}${topAlpha}` },
      { offset: 1, color: `${color}${bottomAlpha}` },
    ],
  };
}

/** 라인 하단 면적 채움용 그라데이션(라인색 → 투명). */
export function areaGradient(color: string) {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: `${color}40` },
      { offset: 1, color: `${color}05` },
    ],
  };
}

export const FONT_FAMILY = 'Poppins, "Noto Sans KR", sans-serif';

/** 공통 툴팁 — 흰 카드 + 옅은 테두리 + 그림자. */
export const baseTooltip = {
  confine: true,
  backgroundColor: '#ffffff',
  borderColor: '#e4e7ec',
  borderWidth: 1,
  padding: [8, 12] as [number, number],
  textStyle: { color: '#1f2937', fontSize: 12, fontFamily: FONT_FAMILY },
  extraCssText: 'box-shadow: 0 6px 20px rgba(16,24,40,0.12); border-radius: 8px;',
};

/** 공통 범례(하단). show=false 면 빈 객체. */
export function baseLegend(show: boolean) {
  if (!show) return { show: false };
  return {
    show: true,
    bottom: 0,
    icon: 'roundRect',
    itemWidth: 10,
    itemHeight: 10,
    itemGap: 14,
    textStyle: { fontSize: 11, color: '#475467', fontFamily: FONT_FAMILY },
  };
}

/** 데카르트 차트 공통 grid(범례 유무로 하단 여백 조절). */
export function baseGrid(showLegend: boolean) {
  return { left: 8, right: 16, top: 16, bottom: showLegend ? 32 : 8, containLabel: true };
}

export const axisLabelStyle = { color: '#667085', fontSize: 10, fontFamily: FONT_FAMILY };
export const splitLineStyle = { lineStyle: { color: '#eef1f6' } };

/** 목표선(goalLine) markLine 조각 — 점선 + 우측 값 라벨. */
export function goalMarkLine(value: number) {
  return {
    silent: true,
    symbol: 'none',
    lineStyle: { color: '#ef4444', type: 'dashed' as const, width: 1.5 },
    label: {
      show: true,
      position: 'end' as const,
      formatter: `목표 ${value.toLocaleString('ko-KR')}`,
      color: '#ef4444',
      fontSize: 10,
      fontFamily: FONT_FAMILY,
    },
    data: [{ yAxis: value }],
  };
}

export const koNum = (v: number) => v.toLocaleString('ko-KR');
