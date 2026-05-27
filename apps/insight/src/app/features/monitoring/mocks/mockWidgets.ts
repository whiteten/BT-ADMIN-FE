/**
 * Mock 위젯 — §7 편집 모드 검토용
 * BE 구현 후 본 파일 삭제
 */

import type { Widget } from '../types';

/**
 * 대시보드별 위젯 mock
 * dashboardId 1 (교환기 운영 관제, IE) — 시안 §7 예시
 */
export function getMockWidgets(dashboardId: number): Widget[] {
  if (dashboardId === 1) {
    return [
      // 1. 템플릿 GRID — 부서별 통화 현황
      {
        widgetId: 101,
        dashboardId: 1,
        widgetName: '부서별 통화 현황',
        kind: 'TEMPLATE',
        datasetId: 1,
        datasetName: '부서별 통화 현황',
        visualizations: ['GRID', 'BAR', 'CARD'],
        defaultViz: 'GRID',
        mapping: {
          GRID: { columns: ['DEPT_NAME', 'TOTAL_CALL', 'ANSWER_CNT', 'ANSWER_RATE', 'STATUS'] },
          BAR: { x: 'DEPT_NAME', y: ['TOTAL_CALL'] },
          CARD: { measure: 'ANSWER_RATE', unit: '%', kpiDirection: 'HIGHER_BETTER', threshold: { warn: 90, danger: 85 } },
        },
        refreshInterval: 3,
        position: { row: 0, col: 0, w: 7, h: 6 },
      },
      // 2. 템플릿 CARD — 응답률 카드
      {
        widgetId: 102,
        dashboardId: 1,
        widgetName: '평균 응답률',
        kind: 'TEMPLATE',
        datasetId: 1,
        datasetName: '부서별 통화 현황',
        visualizations: ['CARD'],
        defaultViz: 'CARD',
        mapping: {
          CARD: { measure: 'ANSWER_RATE', unit: '%', kpiDirection: 'HIGHER_BETTER', threshold: { warn: 90, danger: 85 } },
        },
        refreshInterval: 3,
        position: { row: 0, col: 7, w: 5, h: 3 },
      },
      // 3. 템플릿 LINE — 시간대별 통화량
      {
        widgetId: 103,
        dashboardId: 1,
        widgetName: '시간대별 통화량',
        kind: 'TEMPLATE',
        datasetId: 2,
        datasetName: '시간대별 통화량',
        visualizations: ['LINE', 'BAR'],
        defaultViz: 'LINE',
        mapping: {
          LINE: { x: 'TIME_BUCKET', y: ['CALL_COUNT'] },
          BAR: { x: 'TIME_BUCKET', y: ['CALL_COUNT'] },
        },
        refreshInterval: 5,
        position: { row: 3, col: 7, w: 5, h: 5 },
      },
      // 4. 커스텀 — 내선 상태 격자
      {
        widgetId: 104,
        dashboardId: 1,
        widgetName: '영업본부 내선 상태',
        kind: 'CUSTOM',
        widgetTypeId: 'extension-status-grid',
        widgetTypeName: '내선 상태 격자',
        options: { columns: 16, pulseEnabled: true },
        position: { row: 6, col: 0, w: 7, h: 5 },
      },
      // 5. 커스텀 — SLA 게이지
      {
        widgetId: 105,
        dashboardId: 1,
        widgetName: 'SLA (20초)',
        kind: 'CUSTOM',
        widgetTypeId: 'service-level-gauge',
        widgetTypeName: 'SLA 게이지',
        options: { thresholdSec: 20, targetLevel: 80 },
        position: { row: 8, col: 7, w: 5, h: 3 },
      },
    ];
  }

  // 대시보드 2 (IC 상담그룹 관제) — 상담사 상태 모니터링 E2E 시연용
  if (dashboardId === 2) {
    return [
      {
        widgetId: 201,
        dashboardId: 2,
        widgetName: '상담사 상태 모니터',
        kind: 'CUSTOM',
        widgetTypeId: 'agent-status-matrix',
        widgetTypeName: '상담사 상태 매트릭스',
        options: {},
        position: { row: 0, col: 0, w: 12, h: 12 },
      },
    ];
  }

  return [];
}
