import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import IvrWsSessionEventHandler from './features/router/IvrWsSessionEventHandler';
import { createPageVariantSocket } from '@/components/custom/DynamicElement';
import { NotFound } from '@/components/custom/NotFound';

const IvrEndpointList = React.lazy(() => import('./pages/line/IvrEndpointList'));
const IvrDnGroupList = React.lazy(() => import('./pages/line/IvrDnGroupList'));
const IvrMedia = React.lazy(() => import('./pages/line/IvrMedia'));
const IvrAinDnis = React.lazy(() => import('./pages/line/IvrAinDnis'));
const ScenarioList = React.lazy(() => import('./pages/scenario/ScenarioList'));
const ScenarioDetail = React.lazy(() => import('./pages/scenario/ScenarioDetail'));
const SleeConfigList = React.lazy(() => import('./pages/scenario/SleeConfigList'));
const MentFileList = React.lazy(() => import('./pages/scenario/MentFileList'));
const DnisList = React.lazy(() => import('./pages/scenario/DnisList'));
const ExtAdaptorList = React.lazy(() => import('./pages/addon/ExtAdaptorList'));
const ScenarioMenuControlList = React.lazy(() => import('./pages/scenario/ScenarioMenuControlList'));
// worktime (IVR 업무시간관리 — SWAT IPR30S4022 의 IR 분리분. 교환기 분리분은 apps/ipron)
const IrWorktimeList = React.lazy(() => import('./pages/worktime/IrWorktimeList'));
// ha (HA 다중화 구성 — SWAT IPR20S8080. 모니터링/수동전환·할당 관리 팝업은 스코프 제외)
const HaGroupList = React.lazy(() => import('./pages/ha/HaGroupList'));

// 변형 소켓 — path 인자는 화면 식별 키(라우트 경로 그대로, 동적 세그먼트 포함)
const pv = createPageVariantSocket('ivr');

export const routes = [
  {
    path: '/',
    element: <IvrWsSessionEventHandler />,
    children: [
      // 루트 index redirect는 host(app.tsx)가 담당 — 비활성 remote에서 발동하던 <Navigate to="/"> 제거.
      {
        path: 'line',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="endpoint" replace /> },
          { path: 'endpoint', element: pv('line/endpoint', IvrEndpointList) },
          { path: 'dn-group', element: pv('line/dn-group', IvrDnGroupList) },
          { path: 'media', element: pv('line/media', IvrMedia) },
          { path: 'ain-dnis', element: pv('line/ain-dnis', IvrAinDnis) },
        ],
      },
      {
        path: 'scenario',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="list" replace /> },
          { path: 'list', element: pv('scenario/list', ScenarioList) },
          { path: ':serviceId', element: pv('scenario/:serviceId', ScenarioDetail) },
          { path: 'slee-config', element: pv('scenario/slee-config', SleeConfigList) },
          { path: 'mentfile', element: pv('scenario/mentfile', MentFileList) },
          { path: 'dnis', element: pv('scenario/dnis', DnisList) },
          { path: 'menu-control', element: pv('scenario/menu-control', ScenarioMenuControlList) },
        ],
      },
      {
        path: 'addon',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="ext-adaptor" replace /> },
          { path: 'ext-adaptor', element: pv('addon/ext-adaptor', ExtAdaptorList) },
        ],
      },
      {
        path: 'worktime',
        element: pv('worktime', IrWorktimeList),
      },
      {
        path: 'ha',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="group" replace /> },
          { path: 'group', element: pv('ha/group', HaGroupList) },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/" />,
  },
];
