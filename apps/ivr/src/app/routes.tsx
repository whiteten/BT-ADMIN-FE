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

// 변형 소켓 — path 인자는 화면 식별 키(라우트 경로 그대로, 동적 세그먼트 포함)
const pv = createPageVariantSocket('ivr');

export const routes = [
  {
    path: '/',
    element: <IvrWsSessionEventHandler />,
    children: [
      {
        index: true,
        element: <Navigate to="/" replace />,
      },
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
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/" />,
  },
];
