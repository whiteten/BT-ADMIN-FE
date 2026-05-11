import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const StatDashboardPage = React.lazy(() => import('./pages/stat/StatDashboardPage'));
const WidgetListPage = React.lazy(() => import('./pages/stat/widget/WidgetListPage'));
const WidgetBuilderPage = React.lazy(() => import('./pages/stat/widget/WidgetBuilderPage'));

export const routes = [
  {
    path: '/',
    element: <Outlet />,
    children: [
      { index: true, element: <Navigate to="stat/dashboard" replace /> },
      {
        path: 'stat',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <StatDashboardPage /> },
          {
            path: 'widget',
            children: [
              { index: true, element: <WidgetListPage /> },
              { path: 'create', element: <WidgetBuilderPage /> },
              { path: ':widgetId/edit', element: <WidgetBuilderPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound homePath="/insight" /> },
];
