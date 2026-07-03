import React from 'react';
import { Outlet } from 'react-router-dom';
import type { RouteHandle } from '@/shared-store';
import { createPageVariantSocket } from '@/components/custom/DynamicElement';
import { NotFound } from '@/components/custom/NotFound';

const TaskBg = React.lazy(() => import('./pages/board/TaskBg'));
const TaskList = React.lazy(() => import('./pages/board/TaskList'));
const TaskMgmt = React.lazy(() => import('./pages/board/TaskMgmt'));
const TaskCreate = React.lazy(() => import('./pages/board/TaskCreate'));
const TaskDisplayManage = React.lazy(() => import('./pages/board/TaskDisplayManage'));
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
      // 루트 index redirect는 host(app.tsx)가 담당 — 비활성 remote에서 발동하던 <Navigate to="/"> 제거.
      {
        path: 'board',
        element: <Outlet />,
        children: [
          { path: 'task-bg', element: pv2('board/task-bg', TaskBg) },
          { path: 'task-list', element: pv('board/task-list', TaskList) },
          { path: 'task-mgmt', element: pv('board/task-mgmt', TaskMgmt) },
          { path: 'task-create', element: pv('board/task-create', TaskCreate) },
          { path: 'task-display', element: pv('board/task-display', TaskDisplayManage) },
          { path: 'task-view/:layoutId/:displayId', element: pv('board/task-view/:layoutId/:displayId', TaskView) },
          // 섹션 모드: displayId 없이 ?s=A:1,B:2,C:3 쿼리로 섹션별 뷰 그룹 지정
          { path: 'task-view/:layoutId', element: pv('board/task-view/:layoutId/:displayId', TaskView) },
          { path: 'task-notice', element: pv2('board/task-notice', TaskNotice) },
          // 새창 롤링: 공개 라우트(handle.public) — host RouteShell이 세션 체크 없이 통과시킴.
          // 로그인 창에서 window.open으로 열리는 세션 쿠키 공유 새창.
          // chromeless는 host PublicRouteGate가 강제하므로 별도 <Chromeless> 래퍼 불필요.
          { path: 'task-rolling', handle: { public: true } satisfies RouteHandle, element: <TaskRolling /> },
          // 공개 뷰: 공개 라우트(handle.public) — 익명 접근 허용, 데이터 인증은 자체 publicAuth가 담당.
          {
            path: 'task-view-public/:layoutId/:displayId',
            handle: { public: true } satisfies RouteHandle,
            element: <TaskViewPublic />,
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound homePath="/" /> },
];
