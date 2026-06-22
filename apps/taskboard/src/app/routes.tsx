import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { createPageVariantSocket } from '@/components/custom/DynamicElement';
import { NotFound } from '@/components/custom/NotFound';

const TaskBg = React.lazy(() => import('./pages/board/TaskBg'));
const TaskList = React.lazy(() => import('./pages/board/TaskList'));
const TaskMgmt = React.lazy(() => import('./pages/board/TaskMgmt'));
const TaskCreate = React.lazy(() => import('./pages/board/TaskCreate'));
const TaskDisplayManage = React.lazy(() => import('./pages/board/TaskDisplayManage'));
const TaskView = React.lazy(() => import('./pages/board/TaskView'));
const TaskNotice = React.lazy(() => import('./pages/board/TaskNotice'));

// 변형 소켓 — path 인자는 화면 식별 키(라우트 경로 그대로, 동적 세그먼트 포함)
const pv = createPageVariantSocket('taskboard');

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
          { path: 'task-bg', element: pv('board/task-bg', TaskBg) },
          { path: 'task-list', element: pv('board/task-list', TaskList) },
          { path: 'task-mgmt', element: pv('board/task-mgmt', TaskMgmt) },
          { path: 'task-create', element: pv('board/task-create', TaskCreate) },
          { path: 'task-display', element: pv('board/task-display', TaskDisplayManage) },
          { path: 'task-view/:layoutId/:displayId', element: pv('board/task-view/:layoutId/:displayId', TaskView) },
          { path: 'task-notice', element: pv('board/task-notice', TaskNotice) },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound homePath="/" /> },
];
