import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const TaskBg = React.lazy(() => import('./pages/board/TaskBg'));
const TaskList = React.lazy(() => import('./pages/board/TaskList'));
const TaskMgmt = React.lazy(() => import('./pages/board/TaskMgmt'));
const TaskCreate = React.lazy(() => import('./pages/board/TaskCreate'));
const TaskDisplayManage = React.lazy(() => import('./pages/board/TaskDisplayManage'));
const TaskView = React.lazy(() => import('./pages/board/TaskView'));
const TaskNotice = React.lazy(() => import('./pages/board/TaskNotice'));

export const routes = [
  {
    path: '/',
    element: <Outlet />,
    children: [
      { index: true, element: <Navigate to="/" replace /> },
      {
        path: 'board',
        element: <Outlet />,
        children: [
          { path: 'task-bg', element: <TaskBg /> },
          { path: 'task-list', element: <TaskList /> },
          { path: 'task-mgmt', element: <TaskMgmt /> },
          { path: 'task-create', element: <TaskCreate /> },
          { path: 'task-display', element: <TaskDisplayManage /> },
          { path: 'task-view/:displayId', element: <TaskView /> },
          { path: 'task-notice', element: <TaskNotice /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound homePath="/" /> },
];
