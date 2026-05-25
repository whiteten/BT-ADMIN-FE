/**
 * 커스텀 위젯 컴포넌트 레지스트리.
 *
 * BE `MonitoringWidget.getWidgetType()` 와 1:1 매칭되는 React 컴포넌트를 등록한다.
 * 새 위젯 추가 시 본 파일에 한 줄만 등록하면 `DashboardCanvas` 가 자동 렌더링한다.
 *
 * BE 빈은 있으나 FE 컴포넌트가 없는 widgetType 은 `null` 을 반환하여
 * `CustomWidgetCard` 의 placeholder 가 표시되도록 한다.
 */

import type { ComponentType } from 'react';
import AgentStatusWidget from './agent-status/AgentStatusWidget';

/** 모든 커스텀 위젯 컴포넌트의 공통 props. */
export interface CustomWidgetComponentProps {
  /** WebSocket DATA 프레임의 `data` 필드 (BE 위젯 `computeFromRawData` 반환값). */
  data: unknown;
  /** 위젯 인스턴스 옵션 (BE 측에 SUBSCRIBE 시 함께 전달된 값). */
  options?: Record<string, unknown>;
}

const REGISTRY: Record<string, ComponentType<CustomWidgetComponentProps>> = {
  'agent-status-matrix': AgentStatusWidget,
};

export function getCustomWidgetComponent(widgetTypeId: string): ComponentType<CustomWidgetComponentProps> | null {
  return REGISTRY[widgetTypeId] ?? null;
}

export function getRegisteredWidgetTypes(): string[] {
  return Object.keys(REGISTRY);
}
