/**
 * 차트(ECharts) 인스턴스 레지스트리.
 *
 * 각 PanelEChart 가 마운트 시 자기 인스턴스 getter 를 panelId 로 등록하고 언마운트 시 해제한다.
 * 캡처 핸들러(GlobalFilter)는 이 레지스트리에서 차트 패널의 인스턴스를 조회해 PNG 로 합성한다.
 * 리액트 렌더와 무관하므로(캡처 시점에만 1회 읽음) 스토어가 아닌 모듈 싱글톤 Map 으로 둔다.
 */

/** 캡처에 필요한 최소 인터페이스 — ECharts 인스턴스의 getDataURL 만 사용. */
export interface CapturableChart {
  getDataURL: (opts: { type: 'png'; pixelRatio?: number; backgroundColor?: string }) => string;
}

type ChartGetter = () => CapturableChart | null | undefined;

const registry = new Map<number, ChartGetter>();

export function registerChart(panelId: number, getter: ChartGetter): void {
  registry.set(panelId, getter);
}

export function unregisterChart(panelId: number): void {
  registry.delete(panelId);
}

/** panelId 의 현재 ECharts 인스턴스(없으면 undefined). */
export function getRegisteredChart(panelId: number): CapturableChart | null | undefined {
  return registry.get(panelId)?.();
}
