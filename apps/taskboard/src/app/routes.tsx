import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';
const Main = React.lazy(() => import('./pages/main/Main'));
const List = React.lazy(() => import('./pages/board/task-list'));
const BgManage = React.lazy(() => import('./pages/board/task-bg'));
const Mgmt = React.lazy(() => import('./pages/board/task-mgmt'));
const Create = React.lazy(() => import('./pages/board/task-create'));
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
        path: 'board',
        element: <Outlet />,
        children: [
          {
            path: 'task-bg',
            element: <BgManage />,
          },
          {
            path: 'task-list',
            element: <List />,
          },
          {
            path: 'task-mgmt',
            element: <Mgmt />,
          },
          {
            path: 'task-create',
            element: <Create />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/taskboard" />,
  },
];
