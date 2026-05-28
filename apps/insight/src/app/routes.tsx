import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

// ─── 통계 ─────────────────────────────────────────────────────────────
const SearchConditionCatalog = React.lazy(() => import('./pages/search-conditions/SearchConditionCatalog'));
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
const TemplateWidgetWizard = React.lazy(() => import('./pages/monitoring-template-widget-wizard/TemplateWidgetWizard'));
const CustomWidgetCatalogPage = React.lazy(() => import('./pages/monitoring-custom-widget-catalog/CustomWidgetCatalogPage'));
const DashboardView = React.lazy(() => import('./pages/monitoring-dashboard-view/DashboardView'));
const DatasetCatalog = React.lazy(() => import('./pages/monitoring-datasets/DatasetCatalog'));
const DatasetWizard = React.lazy(() => import('./pages/monitoring-dataset-wizard/DatasetWizard'));
const LookupCatalogList = React.lazy(() => import('./pages/monitoring-lookups/LookupCatalogList'));

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
            element: <SearchConditionCatalog />,
          },
          {
            path: 'datasets',
            element: <Outlet />,
            children: [
              { index: true, element: <StatDatasetList /> },
              { path: 'new', element: <StatDatasetWizard /> },
              { path: ':datasetId/edit', element: <StatDatasetEdit /> },
            ],
          },
          {
            path: 'reports',
            element: <Outlet />,
            children: [
              { index: true, element: <ReportList /> },
              {
                path: 'new',
                element: <Outlet />,
                children: [
                  { index: true, element: <ReportWizard /> },
                  { path: 'canvas', element: <ReportDraftCanvas /> },
                ],
              },
              { path: ':reportId/edit', element: <ReportEditor /> },
              { path: ':reportId/view', element: <ReportView /> },
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
              { index: true, element: <DashboardList /> },
              { path: 'create', element: <DashboardCreateWizard /> },
              { path: ':dashboardId/edit', element: <DashboardEditor /> },
              { path: ':dashboardId/edit/widget/create/template', element: <TemplateWidgetWizard /> },
              { path: ':dashboardId/edit/widget/create/custom', element: <CustomWidgetCatalogPage /> },
              { path: ':dashboardId/view', element: <DashboardView /> },
            ],
          },
          {
            path: 'datasets',
            element: <Outlet />,
            children: [
              { index: true, element: <DatasetCatalog /> },
              { path: 'create', element: <DatasetWizard /> },
              { path: ':datasetId/edit', element: <DatasetWizard /> },
            ],
          },
          {
            path: 'lookups',
            element: <Outlet />,
            children: [{ index: true, element: <LookupCatalogList /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound homePath="/" /> },
];
