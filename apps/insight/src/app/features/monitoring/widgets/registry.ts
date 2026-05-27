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
  /** 위젯 인스턴스 ID — 헤더 슬롯에 portal 로 툴바를 주입할 때 사용. */
  widgetId?: number | string;
  /**
   * 위젯이 모니터링 일시정지를 요청 — 설정 드로어 오픈 등 SUBSCRIBE 페이로드가 바뀌어
   * 진행 중인 세션을 끊어야 할 때 호출. 부모 대시보드의 monitoringStarted 를 false 로 만든다.
   */
  onRequestPause?: () => void;
}

/** 위젯 등록 메타. */
export interface CustomWidgetEntry {
  component: ComponentType<CustomWidgetComponentProps>;
  /**
   * SUBSCRIBE 시 BE 에 요청할 필드 목록. BE 의 `options.fields` 로 전달되어
   * 응답 row 에서 해당 필드만 포함시킨다 (전송량 감소).
   * 비워두면 BE 는 전체 row 를 그대로 보낸다.
   */
  fields?: string[];
}

/** 상담사 카드 뷰에서 사용하는 필드 — 카드 + KPI 스트립 + 그룹화·필터링에 필요. */
const AGENT_STATUS_CARD_FIELDS = [
  // 식별
  'AGENT_ID',
  'AGENT_NAME',
  'AGENT_LOGIN_ID',
  'LOGIN_DN_NO',
  // 테넌트 / 조직
  'TENANT_ID',
  'TNT_ID',
  'GROUP_ID',
  'GROUP_NAME',
  'MEDIA_TYPE',
  // 상태
  'AGENT_STATUS',
  'REASON_CODE',
  'STATUS_TIME',
  'STATUS_DURATION',
  // 컨텍스트
  'LAST_ICQ_NAME',
  'CURR_MEDIA_CALL_CNT',
  // 누적 카운트 (응대 표시 = SUM_ANSW_CNT / SUM_CONN_CNT)
  'SUM_ANSW_CNT',
  'SUM_CONN_CNT',
  'SUM_OB_SUCC',
  'SUM_TRNS_OUT',
  // 통화시간 (IB + OB 합산 표시용)
  'SUM_IB_TALKTIME',
  'SUM_OB_TALKTIME',
  // 평균 통화시간 (레이더 비교용)
  'AVG_ANSTALK_TIME',
  // KPI (응대율 / SLA — BE 에서 ÷100 정규화 후 전달)
  'KPI_ANSWER_RATE2',
  'KPI_SVCLEVEL2',
  // 데이터 신선도
  'DB_UPDATE_SEC',
  // EXTDN 조인 결과 (로그아웃 외 상태일 때만 BE 가 주입)
  'MOS',
  // 이석 횟수·시간 (IC:AGENTDC / IC:AGENTDT 합산값)
  'AUX_CNT',
  'AUX_TIME',
  // BE 파생값 (자율처리율)
  'SELF_HANDLE_RATE',
];

const REGISTRY: Record<string, CustomWidgetEntry> = {
  'agent-status-matrix': { component: AgentStatusWidget, fields: AGENT_STATUS_CARD_FIELDS },
};

export function getCustomWidgetComponent(widgetTypeId: string): ComponentType<CustomWidgetComponentProps> | null {
  return REGISTRY[widgetTypeId]?.component ?? null;
}

/** SUBSCRIBE 시 BE 에 요청할 필드 목록. 없으면 `null` → 전체 row. */
export function getCustomWidgetFields(widgetTypeId: string): string[] | null {
  return REGISTRY[widgetTypeId]?.fields ?? null;
}

export function getRegisteredWidgetTypes(): string[] {
  return Object.keys(REGISTRY);
}
