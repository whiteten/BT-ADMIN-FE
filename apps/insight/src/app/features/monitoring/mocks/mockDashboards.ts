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
    layoutWidth: 12,
    layoutHeight: 14,
    createdAt: '2026-03-15T10:00:00+09:00',
    updatedAt: '2026-05-08T14:33:00+09:00',
  },
  {
    dashboardId: 4,
    dashboardCode: 'pbx-new',
    dashboardName: '신규 교환기 대시보드',
    domainCode: 'IE',
    status: 'DRAFT',
    menuRegistered: false,
    templateWidgetCount: 0,
    customWidgetCount: 0,
    layoutWidth: 12,
    layoutHeight: 0,
    createdAt: '2026-05-23T10:00:00+09:00',
    updatedAt: '2026-05-23T10:00:00+09:00',
  },
];

export function getMockDashboardDetail(dashboardId: number): DashboardDetail | undefined {
  const list = MOCK_DASHBOARDS.find((d) => d.dashboardId === dashboardId);
  if (!list) return undefined;
  return {
    ...list,
    description: dashboardId === 4 ? undefined : '운영팀이 사용하는 대시보드',
    widgets: [], // Phase 1 — §3 빈 캔버스 검토용으로 항상 빈 배열. 위젯 mock은 다음 단계에서.
  };
}
