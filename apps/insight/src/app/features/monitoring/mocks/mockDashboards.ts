/**
 * Mock data — BE 미구현 상태에서 UI/UX 검토용
 * BE 구현 완료 후 본 파일 전체 삭제 + import 제거
 */

import type { DashboardDetail, DashboardListItem } from '../types';

export const MOCK_DASHBOARDS: DashboardListItem[] = [
  {
    dashboardId: 1,
    dashboardCode: 'pbx-ops',
    dashboardName: '교환기 운영 관제',
    domainCode: 'IE',
    status: 'PUBLISHED',
    menuRegistered: true,
    templateWidgetCount: 4,
    customWidgetCount: 5,
    widgetNames: ['내선 상태 격자', '트렁크 점유율 게이지', '교환기 시스템 상태'],
    fitToScreen: true,
    layoutWidth: 12,
    layoutHeight: 28,
    createdAt: '2026-04-20T09:00:00+09:00',
    updatedAt: '2026-05-10T17:42:00+09:00',
  },
  {
    dashboardId: 2,
    dashboardCode: 'cti-group',
    dashboardName: '상담그룹 관제',
    domainCode: 'IC',
    status: 'DRAFT',
    menuRegistered: false,
    templateWidgetCount: 3,
    customWidgetCount: 4,
    widgetNames: ['상담사 상태 매트릭스', '전사 SLA 대시보드', '실시간 대기호 목록', '상담사 성과 TOP 10'],
    fitToScreen: false,
    layoutWidth: 12,
    layoutHeight: 22,
    createdAt: '2026-05-12T11:20:00+09:00',
    updatedAt: '2026-05-15T16:05:00+09:00',
  },
  {
    dashboardId: 3,
    dashboardCode: 'ivr-flow',
    dashboardName: 'IVR 시나리오 관제',
    domainCode: 'IR',
    status: 'PUBLISHED',
    menuRegistered: true,
    templateWidgetCount: 2,
    customWidgetCount: 1,
    widgetNames: ['IVR 시나리오 이탈 분석', 'IVR 서버군 상태'],
    fitToScreen: true,
    layoutWidth: 12,
    layoutHeight: 14,
    createdAt: '2026-03-15T10:00:00+09:00',
    updatedAt: '2026-05-08T14:33:00+09:00',
  },
  {
    dashboardId: 8,
    dashboardCode: 'test-8',
    dashboardName: '디버깅용 대시보드',
    domainCode: 'IC',
    status: 'DRAFT',
    menuRegistered: false,
    templateWidgetCount: 0,
    customWidgetCount: 0,
    widgetNames: [],
    fitToScreen: false,
    layoutWidth: 12,
    layoutHeight: 0,
    createdAt: '2026-05-30T10:00:00+09:00',
    updatedAt: '2026-05-30T10:00:00+09:00',
  },
];

export function getMockDashboardDetail(dashboardId: number): DashboardDetail | undefined {
  const list = MOCK_DASHBOARDS.find((d) => d.dashboardId === dashboardId);
  if (!list) return undefined;
  return {
    ...list,
    description: dashboardId === 8 ? undefined : '운영팀이 사용하는 대시보드',
    widgets: [],
  };
}
