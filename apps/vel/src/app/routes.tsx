import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const Main = React.lazy(() => import('./pages/main/Main'));
const RecSearchList = React.lazy(() => import('./pages/rec-search/RecSearchList'));
const RecPlayerPage = React.lazy(() => import('./pages/rec-search/RecPlayerPage'));
const RecLogList = React.lazy(() => import('./pages/reclog/RecLogList'));
const MonitoringList = React.lazy(() => import('./pages/monitoring/MonitoringList'));
const EavesdropPage = React.lazy(() => import('./pages/monitoring/EavesdropPage'));
const RealtimeTestPage = React.lazy(() => import('./pages/monitoring/RealtimeTestPage'));
const RealtimePlayerPage = React.lazy(() => import('./pages/monitoring/RealtimePlayerPage'));
const DataAccessList = React.lazy(() => import('./pages/config/DataAccessList'));

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
        path: 'rec-search',
        children: [
          {
            path: 'list',
            element: <RecSearchList />,
          },
          {
            // 녹취 재생 새창 (/vel-player/rec-search/player). Layout 없이 host 팝업 라우트로 진입.
            path: 'player',
            element: <RecPlayerPage />,
          },
        ],
      },
      {
        path: 'reclog',
        children: [
          {
            path: 'list',
            element: <RecLogList />,
          },
        ],
      },
      {
        path: 'monitoring',
        children: [
          {
            path: 'list',
            element: <MonitoringList />,
          },
          {
            path: 'eavesdrop',
            element: <EavesdropPage />,
          },
          {
            // 실시간 감청 데모 — 테스트 폼 (레이아웃 내, 사이드바 메뉴로 진입)
            path: 'realtime-test',
            element: <RealtimeTestPage />,
          },
          {
            // 실시간 감청 데모 — 플레이어 팝업 (/vel-eavesdrop/monitoring/realtime-player, Layout 없음)
            path: 'realtime-player',
            element: <RealtimePlayerPage />,
          },
        ],
      },
      {
        path: 'config',
        children: [
          {
            path: 'data-access',
            element: <DataAccessList />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/vel" />,
  },
];
