/**
 * /insight/monitoring/dashboards/:id/edit 라우트 엔트리.
 *
 * View + Edit 가 단일 페이지(DashboardView)로 통합되면서 이 파일은 얇은 alias 역할만 한다.
 * DashboardView 내부에서 `location.pathname` 의 마지막 세그먼트로 초기 모드를 자동 판별한다.
 */
export { default } from '../monitoring-dashboard-view/DashboardView';
