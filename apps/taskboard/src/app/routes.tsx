import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Chromeless from '@/components/custom/Chromeless';
import { createPageVariantSocket } from '@/components/custom/DynamicElement';
import { NotFound } from '@/components/custom/NotFound';

const TaskBg = React.lazy(() => import('./pages/board/TaskBg'));
const TaskList = React.lazy(() => import('./pages/board/TaskList'));
const TaskMgmt = React.lazy(() => import('./pages/board/TaskMgmt'));
const TaskCreate = React.lazy(() => import('./pages/board/TaskCreate'));
const TaskDisplayManage = React.lazy(() => import('./pages/board/TaskDisplayManage'));
const TaskDbQueryRun = React.lazy(() => import('./pages/board/TaskDbQueryRun'));
const TaskView = React.lazy(() => import('./pages/board/TaskView'));
const TaskNotice = React.lazy(() => import('./pages/board/TaskNotice'));
const TaskRolling = React.lazy(() => import('./pages/board/TaskRolling'));
const TaskViewPublic = React.lazy(() => import('./pages/board/TaskViewPublic'));

// 변형 소켓 — path 인자는 화면 식별 키(라우트 경로 그대로, 동적 세그먼트 포함)
const pv = createPageVariantSocket('taskboard');
const pv2 = createPageVariantSocket('taskboard-control');

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
          { path: 'task-bg', element: pv2('board/task-bg', TaskBg) },
          { path: 'task-list', element: pv('board/task-list', TaskList) },
          { path: 'task-mgmt', element: pv('board/task-mgmt', TaskMgmt) },
          { path: 'task-create', element: pv('board/task-create', TaskCreate) },
          { path: 'task-display', element: pv('board/task-display', TaskDisplayManage) },
          { path: 'task-db-query', element: pv2('board/task-db-query', TaskDbQueryRun) },
          { path: 'task-view/:layoutId/:displayId', element: pv('board/task-view/:layoutId/:displayId', TaskView) },
          // 섹션 모드: displayId 없이 ?s=A:1,B:2,C:3 쿼리로 섹션별 뷰 그룹 지정
          { path: 'task-view/:layoutId', element: pv('board/task-view/:layoutId/:displayId', TaskView) },
          { path: 'task-notice', element: pv2('board/task-notice', TaskNotice) },
          // 새창 롤링: SessionGuard 통과 후 Chromeless 래퍼로 호스트 UI 숨김
          {
            path: 'task-rolling',
            element: (
              <Chromeless>
                <TaskRolling />
              </Chromeless>
            ),
          },
          // 공개 뷰: SessionGuard가 이 경로를 우회(apps/host SessionGuard.tsx 참조)
          {
            path: 'task-view-public/:layoutId/:displayId',
            element: (
              <Chromeless>
                <TaskViewPublic />
              </Chromeless>
            ),
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound homePath="/" /> },
];
