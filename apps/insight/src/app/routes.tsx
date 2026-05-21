import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const SearchConditionCatalog = React.lazy(() => import('./pages/search-conditions/SearchConditionCatalog'));
const ReportList = React.lazy(() => import('./pages/reports/ReportList'));
const ReportWizard = React.lazy(() => import('./pages/report-wizard/ReportWizard'));
const ReportEditor = React.lazy(() => import('./pages/report-editor/ReportEditor'));
const ReportView = React.lazy(() => import('./pages/report-view/ReportView'));

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
          { index: true, element: <Navigate to="reports" replace /> },
          {
            path: 'search-conditions',
            element: <SearchConditionCatalog />,
          },
          {
            path: 'reports',
            element: <Outlet />,
            children: [
              { index: true, element: <ReportList /> },
              { path: 'new', element: <ReportWizard /> },
              { path: ':reportId/edit', element: <ReportEditor /> },
              { path: ':reportId/view', element: <ReportView /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound homePath="/" /> },
];
