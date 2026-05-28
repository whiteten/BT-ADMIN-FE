/**
 * Mock 커스텀 위젯 카탈로그 — BE 미구현 상태에서 UI/UX 검토용
 * BE 구현 후 본 파일 삭제
 *
 * 실제 환경: BE에 MonitoringWidget Bean이 1:1 매칭되어 등록되어야 함 (M8).
 * FE는 widgetTypeId로 컴포넌트를 찾아 렌더.
 */

import type { CustomWidgetCatalogItem } from '../types';

export const MOCK_CUSTOM_WIDGETS: CustomWidgetCatalogItem[] = [
  // IE — 교환기
  {
    widgetTypeId: 'extension-status-grid',
    widgetName: '내선 상태 격자',
    domainCode: 'IE',
    description: '부서별 내선 상태를 N×M 격자로 표시. 대기/통화/대기중/장애 색상 구분 + 펄스 애니메이션.',
    defaultOptions: { columns: 16, pulseEnabled: true, showNumberOnHover: true },
    minW: 4,
    minH: 4,
    defaultW: 6,
    defaultH: 6,
    widgetCategory: 'STATUS',
  },
  {
    widgetTypeId: 'call-flow-diagram',
    widgetName: '콜 플로우 다이어그램',
    domainCode: 'IE',
    description: '실시간 호 흐름을 노드·엣지 다이어그램으로 표시. 인바운드 → 큐 → 상담사 라우팅 시각화.',
    defaultOptions: {},
    minW: 6,
    minH: 4,
    defaultW: 8,
    defaultH: 5,
    widgetCategory: 'CHART',
  },
  {
    widgetTypeId: 'trunk-utilization-meter',
    widgetName: '트렁크 사용률 게이지',
    domainCode: 'IE',
    description: '트렁크별 동시 통화 사용률을 반원 게이지로 표시. 임계값 도달 시 빨간 경고.',
    defaultOptions: { warnThreshold: 80, dangerThreshold: 95 },
    minW: 3,
    minH: 3,
    defaultW: 3,
    defaultH: 3,
    widgetCategory: 'KPI',
  },
  // IC — CTI
  {
    widgetTypeId: 'agent-status-matrix',
    widgetName: '상담사 상태 매트릭스',
    domainCode: 'IC',
    description: '상담그룹별 상담사 상태(대기/통화/후처리/이석)를 색상 매트릭스로 표시.',
    defaultOptions: { groupBy: 'queue' },
    minW: 8,
    minH: 10,
    defaultW: 8,
    defaultH: 10,
    widgetCategory: 'STATUS',
  },
  {
    widgetTypeId: 'ctiq-status-matrix',
    widgetName: '큐(CTIQ) 상태 매트릭스',
    domainCode: 'IC',
    description: '큐별 압력(대기·최장대기·EWT) · 처리(인입·응대·포기·SLA) · 자원(로그인) 을 큰카드/작은카드로 표시. 미디어 타입별 검색 + 임계 초과 알람.',
    defaultOptions: {},
    minW: 8,
    minH: 6,
    defaultW: 12,
    defaultH: 8,
    widgetCategory: 'STATUS',
  },
  {
    widgetTypeId: 'waiting-queue-list',
    widgetName: '대기 큐 리스트',
    domainCode: 'IC',
    description: '큐별 대기 콜 + 평균 대기 시간 + 최장 대기 콜 실시간 리스트. 임계값 초과 시 강조.',
    defaultOptions: { maxRows: 10, sortBy: 'maxWait' },
    minW: 4,
    minH: 5,
    defaultW: 6,
    defaultH: 6,
    widgetCategory: 'TABLE',
  },
  {
    widgetTypeId: 'service-level-gauge',
    widgetName: 'SLA 게이지',
    domainCode: 'IC',
    description: '서비스 레벨(N초 내 응답률)을 반원 게이지로 표시. 목표선·임계선 표시.',
    defaultOptions: { thresholdSec: 20, targetLevel: 80 },
    minW: 3,
    minH: 3,
    defaultW: 3,
    defaultH: 3,
    widgetCategory: 'KPI',
  },
  // IR — IVR
  {
    widgetTypeId: 'ivr-scenario-flow',
    widgetName: 'IVR 시나리오 흐름',
    domainCode: 'IR',
    description: '시나리오 단계별 진입/이탈 건수를 sankey 다이어그램으로 표시.',
    defaultOptions: {},
    minW: 6,
    minH: 5,
    defaultW: 8,
    defaultH: 6,
    widgetCategory: 'CHART',
  },
];
