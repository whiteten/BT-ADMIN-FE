import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const Main = React.lazy(() => import('./pages/main/Main'));
const Dashboard = React.lazy(() => import('./pages/monitoring/dashboard/Dashboard'));
const History = React.lazy(() => import('./pages/monitoring/history/History'));
const Scheduler = React.lazy(() => import('./pages/monitoring/scheduler/Scheduler'));

export const routes = [
  {
    path: '/',
    element: <Outlet />,
    children: [
      {
        index: true,
        element: <Navigate to="main" replace />,
      },
      {
        path: 'main',
        element: <Main />,
      },
      {
        path: 'monitoring',
        element: <Outlet />,
        children: [
          {
            index: true,
            element: <Navigate to="dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <Dashboard />,
          },
          {
            path: 'history',
            element: <History />,
          },
          {
            path: 'scheduler',
            element: <Scheduler />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/sd" />,
  },
];
