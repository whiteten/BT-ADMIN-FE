import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const SearchConditionCatalogPage = React.lazy(() => import('./pages/search-conditions/SearchConditionCatalogPage'));
const ReportListPage = React.lazy(() => import('./pages/reports/ReportListPage'));
const ReportWizardPage = React.lazy(() => import('./pages/report-wizard/ReportWizardPage'));
const ReportEditorPage = React.lazy(() => import('./pages/report-editor/ReportEditorPage'));
const ReportViewPage = React.lazy(() => import('./pages/report-view/ReportViewPage'));

export const routes = [
  {
    path: '/',
    element: <Outlet />,
    children: [
      { index: true, element: <Navigate to="statistics/reports" replace /> },
      {
        path: 'statistics',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="reports" replace /> },
          {
            path: 'search-conditions',
            element: <SearchConditionCatalogPage />,
            handle: {
              breadcrumb: [{ title: '인사이트' }, { title: '검색조건 정의', path: '/insight/statistics/search-conditions' }],
            },
          },
          {
            path: 'reports',
            children: [
              {
                index: true,
                element: <ReportListPage />,
                handle: {
                  breadcrumb: [{ title: '인사이트' }, { title: '보고서', path: '/insight/statistics/reports' }],
                },
              },
              {
                path: 'new',
                element: <ReportWizardPage />,
                handle: {
                  breadcrumb: [
                    { title: '인사이트' },
                    { title: '보고서', path: '/insight/statistics/reports' },
                    { title: '새 보고서 생성', path: '/insight/statistics/reports/new' },
                  ],
                },
              },
              {
                path: ':reportId/edit',
                element: <ReportEditorPage />,
                handle: {
                  breadcrumb: [{ title: '인사이트' }, { title: '보고서', path: '/insight/statistics/reports' }, { title: ':reportTitle' }],
                },
              },
              {
                path: ':reportId/view',
                element: <ReportViewPage />,
                handle: {
                  breadcrumb: [{ title: '인사이트' }, { title: '보고서', path: '/insight/statistics/reports' }, { title: ':reportTitle' }],
                },
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound homePath="/insight" /> },
];
