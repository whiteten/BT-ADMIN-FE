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
            handle: {
              breadcrumb: [{ title: '인사이트' }, { title: '검색조건 정의', path: '/insight/statistics/search-conditions' }],
            },
          },
          {
            path: 'reports',
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <ReportList />,
                handle: {
                  breadcrumb: [{ title: '인사이트' }, { title: '보고서', path: '/insight/statistics/reports' }],
                },
              },
              {
                path: 'new',
                element: <ReportWizard />,
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
                element: <ReportEditor />,
                handle: {
                  breadcrumb: [{ title: '인사이트' }, { title: '보고서', path: '/insight/statistics/reports' }, { title: ':reportTitle' }],
                },
              },
              {
                path: ':reportId/view',
                element: <ReportView />,
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
  { path: '*', element: <NotFound homePath="/" /> },
];
