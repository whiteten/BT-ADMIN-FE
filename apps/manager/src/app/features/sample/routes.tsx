// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import React from 'react';
import { useBreadcrumbStore } from '@/shared-store';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const Main = React.lazy(() => import('./pages/main/Main'));

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
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/" />,
  },
];
