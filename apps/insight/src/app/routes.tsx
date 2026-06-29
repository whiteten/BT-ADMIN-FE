import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { SelectorKeys } from './features/router/querySelectors';
import { createPageVariantSocket } from '@/components/custom/DynamicElement';
import { NotFound } from '@/components/custom/NotFound';

// ─── 통계 ─────────────────────────────────────────────────────────────
const SearchConditionCatalog = React.lazy(() => import('./pages/search-conditions/SearchConditionCatalog'));
const StatConfigPage = React.lazy(() => import('./pages/stat-config/StatConfigPage'));
const StatDatasetList = React.lazy(() => import('./pages/stat-datasets/StatDatasetList'));
const StatDatasetWizard = React.lazy(() => import('./pages/stat-dataset-wizard/StatDatasetWizard'));
const StatDatasetEdit = React.lazy(() => import('./pages/stat-datasets/StatDatasetEdit'));
const ReportList = React.lazy(() => import('./pages/reports/ReportList'));
const ReportWizard = React.lazy(() => import('./pages/report-wizard/ReportWizard'));
const ReportDraftCanvas = React.lazy(() => import('./pages/report-draft-canvas/ReportDraftCanvas'));
const ReportEditor = React.lazy(() => import('./pages/report-editor/ReportEditor'));
const ReportView = React.lazy(() => import('./pages/report-view/ReportView'));

// ─── 모니터링 ────────────────────────────────────────────────────────
const DashboardList = React.lazy(() => import('./pages/monitoring-dashboards/DashboardList'));
const DashboardCreateWizard = React.lazy(() => import('./pages/monitoring-dashboard-wizard/DashboardCreateWizard'));
const DashboardEditor = React.lazy(() => import('./pages/monitoring-dashboard-editor/DashboardEditor'));
const DashboardEditInfo = React.lazy(() => import('./pages/monitoring-dashboard-edit-info/DashboardEditInfo'));
const TemplateWidgetWizard = React.lazy(() => import('./pages/monitoring-template-widget-wizard/TemplateWidgetWizard'));
const CustomWidgetCatalogPage = React.lazy(() => import('./pages/monitoring-custom-widget-catalog/CustomWidgetCatalogPage'));
const DashboardView = React.lazy(() => import('./pages/monitoring-dashboard-view/DashboardView'));
const DashboardMenuView = React.lazy(() => import('./pages/monitoring-dashboard-view/DashboardMenuView'));
const DatasetCatalog = React.lazy(() => import('./pages/monitoring-datasets/DatasetCatalog'));
const DatasetWizard = React.lazy(() => import('./pages/monitoring-dataset-wizard/DatasetWizard'));
const LookupCatalogList = React.lazy(() => import('./pages/monitoring-lookups/LookupCatalogList'));
const MonitoringConfigPage = React.lazy(() => import('./pages/monitoring-config/MonitoringConfigPage'));
const WidgetCatalogManageList = React.lazy(() => import('./pages/monitoring-widgets/WidgetCatalogManageList'));
const TemplateWidgetBuilder = React.lazy(() => import('./pages/monitoring-template-widget-builder/TemplateWidgetBuilder'));

// 변형 소켓 — path 인자는 화면 식별 키(라우트 경로 그대로, 동적 세그먼트 포함)
const pv = createPageVariantSocket('insight');

export const routes = [
  {
    path: '/',
    element: <Outlet />,
    children: [
      { index: true, element: <Navigate to="/" replace /> },
      {
        path: 'statistics',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="datasets" replace /> },
          {
            path: 'search-conditions',
            element: pv('statistics/search-conditions', SearchConditionCatalog),
          },
          {
            path: 'stat-config',
            element: pv('statistics/stat-config', StatConfigPage),
          },
          {
            path: 'datasets',
            element: <Outlet />,
            children: [
              { index: true, element: pv('statistics/datasets', StatDatasetList) },
              { path: 'new', element: pv('statistics/datasets/new', StatDatasetWizard) },
              { path: ':datasetId/edit', element: pv('statistics/datasets/:datasetId/edit', StatDatasetEdit) },
            ],
          },
          {
            path: 'reports',
            element: <Outlet />,
            children: [
              { index: true, element: pv('statistics/reports', ReportList) },
              {
                path: 'new',
                element: <Outlet />,
                children: [
                  { index: true, element: pv('statistics/reports/new', ReportWizard) },
                  { path: 'canvas', element: pv('statistics/reports/new/canvas', ReportDraftCanvas) },
                ],
              },
              { path: ':reportId/edit', element: pv('statistics/reports/:reportId/edit', ReportEditor) },
              // 통합 통계 보고서 보기 — reportId 를 path 파라미터가 아닌 쿼리스트링으로 받는다.
              // 같은 path 를 여러 메뉴가 공유(메뉴마다 ?reportId 다름)하는 queryString 메뉴 분기 패턴.
              {
                path: 'view',
                element: pv('statistics/reports/view', ReportView),
                handle: {
                  queryParams: [{ key: 'reportId', label: '보고서', selectorKey: SelectorKeys.ReportSelector }],
                },
              },
            ],
          },
        ],
      },
      {
        path: 'monitoring',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="dashboards" replace /> },
          {
            path: 'dashboards',
            element: <Outlet />,
            children: [
              { index: true, element: pv('monitoring/dashboards', DashboardList) },
              { path: 'create', element: pv('monitoring/dashboards/create', DashboardCreateWizard) },
              { path: ':dashboardId/edit', element: pv('monitoring/dashboards/:dashboardId/edit', DashboardEditor) },
              { path: ':dashboardId/edit-info', element: pv('monitoring/dashboards/:dashboardId/edit-info', DashboardEditInfo) },
              { path: ':dashboardId/edit/widget/create/template', element: pv('monitoring/dashboards/:dashboardId/edit/widget/create/template', TemplateWidgetWizard) },
              { path: ':dashboardId/edit/widget/create/custom', element: pv('monitoring/dashboards/:dashboardId/edit/widget/create/custom', CustomWidgetCatalogPage) },
              { path: ':dashboardId/view', element: pv('monitoring/dashboards/:dashboardId/view', DashboardView) },
              {
                path: 'view',
                element: pv('monitoring/dashboards/view', DashboardMenuView),
                handle: {
                  queryParams: [{ key: 'dashboardId', label: '대시보드', selectorKey: SelectorKeys.DashboardSelector }],
                },
              },
            ],
          },
          {
            path: 'datasets',
            element: <Outlet />,
            children: [
              { index: true, element: pv('monitoring/datasets', DatasetCatalog) },
              { path: 'create', element: pv('monitoring/datasets/create', DatasetWizard) },
              { path: ':datasetId/edit', element: pv('monitoring/datasets/:datasetId/edit', DatasetWizard) },
            ],
          },
          {
            path: 'lookups',
            element: <Outlet />,
            children: [{ index: true, element: pv('monitoring/lookups', LookupCatalogList) }],
          },
          {
            path: 'config',
            element: <Outlet />,
            children: [{ index: true, element: pv('monitoring/config', MonitoringConfigPage) }],
          },
          {
            path: 'widgets',
            element: <Outlet />,
            children: [
              { index: true, element: pv('monitoring/widgets', WidgetCatalogManageList) },
              { path: 'template/new', element: pv('monitoring/widgets/template/new', TemplateWidgetBuilder) },
              { path: 'template/:templateWidgetId/edit', element: pv('monitoring/widgets/template/:templateWidgetId/edit', TemplateWidgetBuilder) },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound homePath="/" /> },
];
