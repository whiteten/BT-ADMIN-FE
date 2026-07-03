import React from 'react';
import { Outlet } from 'react-router-dom';
import Chromeless from '@/components/custom/Chromeless';
import { createPageVariantSocket } from '@/components/custom/DynamicElement';
import { NotFound } from '@/components/custom/NotFound';

const RecSearchList = React.lazy(() => import('./pages/rec-search/RecSearchList'));
const RecPlayerPage = React.lazy(() => import('./pages/rec-search/RecPlayerPage'));
const RecLogList = React.lazy(() => import('./pages/reclog/RecLogList'));
const MonitoringList = React.lazy(() => import('./pages/monitoring/MonitoringList'));
const EavesdropPage = React.lazy(() => import('./pages/monitoring/EavesdropPage'));
const RealtimeTestPage = React.lazy(() => import('./pages/monitoring/RealtimeTestPage'));
const RealtimePlayerPage = React.lazy(() => import('./pages/monitoring/RealtimePlayerPage'));
const DataAccessList = React.lazy(() => import('./pages/config/DataAccessList'));

// 변형 소켓 — path 인자는 화면 식별 키(라우트 경로 그대로, 동적 세그먼트 포함)
const pv = createPageVariantSocket('vel');

export const routes = [
  {
    path: '/',
    element: <Outlet />,
    children: [
      // 루트 index redirect는 host(app.tsx)가 담당 — 비활성 remote에서 발동하던 <Navigate to="/"> 제거.
      {
        path: 'rec-search',
        element: <Outlet />,
        children: [
          { path: 'list', element: pv('rec-search/list', RecSearchList) },
          // 녹취 재생 새창 (/vel/rec-search/player). Chromeless 래퍼가 Layout chrome 제거.
          { path: 'player', element: <Chromeless>{pv('rec-search/player', RecPlayerPage)}</Chromeless> },
        ],
      },
      {
        path: 'reclog',
        element: <Outlet />,
        children: [{ path: 'list', element: pv('reclog/list', RecLogList) }],
      },
      {
        path: 'monitoring',
        element: <Outlet />,
        children: [
          { path: 'list', element: pv('monitoring/list', MonitoringList) },
          // 감청 새창 (/vel/monitoring/eavesdrop). Chromeless 래퍼가 Layout chrome 제거.
          { path: 'eavesdrop', element: <Chromeless>{pv('monitoring/eavesdrop', EavesdropPage)}</Chromeless> },
          // 실시간 감청 데모 — 테스트 폼 (레이아웃 내, 사이드바 메뉴로 진입)
          { path: 'realtime-test', element: pv('monitoring/realtime-test', RealtimeTestPage) },
          // 실시간 감청 데모 — 플레이어 팝업 (/vel/monitoring/realtime-player). Chromeless 래퍼가 Layout chrome 제거.
          { path: 'realtime-player', element: <Chromeless>{pv('monitoring/realtime-player', RealtimePlayerPage)}</Chromeless> },
        ],
      },
      {
        path: 'config',
        element: <Outlet />,
        children: [{ path: 'data-access', element: pv('config/data-access', DataAccessList) }],
      },
    ],
  },
  { path: '*', element: <NotFound homePath="/" /> },
];
