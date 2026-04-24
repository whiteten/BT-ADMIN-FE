import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';
const Main = React.lazy(() => import('./pages/main/Main'));
const View = React.lazy(() => import('./pages/board/task-view'));
const List = React.lazy(() => import('./pages/board/task-list'));
const Create = React.lazy(() => import('./pages/board/task-create'));
const BgManage = React.lazy(() => import('./pages/board/task-bg'));
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
            path: 'task-view',
            element: <View />,
          },
          {
            path: 'task-list',
            element: <List />,
          },
          {
            path: 'task-create',
            element: <Create />,
          },
          {
            path: 'task-bg',
            element: <BgManage />,
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
