import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import IvrWsSessionEventHandler from './features/router/IvrWsSessionEventHandler';
import { NotFound } from '@/components/custom/NotFound';

const IvrEndpointList = React.lazy(() => import('./pages/line/IvrEndpointList'));
const IvrDnGroupList = React.lazy(() => import('./pages/line/IvrDnGroupList'));
const IvrMedia = React.lazy(() => import('./pages/line/IvrMedia'));
const IvrAinDnis = React.lazy(() => import('./pages/line/IvrAinDnis'));
const ScenarioList = React.lazy(() => import('./pages/scenario/ScenarioList'));
const ScenarioDetail = React.lazy(() => import('./pages/scenario/ScenarioDetail'));
const SleeConfigList = React.lazy(() => import('./pages/scenario/SleeConfigList'));
const MentFileList = React.lazy(() => import('./pages/scenario/MentFileList'));
const DnisList = React.lazy(() => import('./pages/ivr/DnisList'));

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
          { path: 'endpoint', element: <IvrEndpointList /> },
          { path: 'dn-group', element: <IvrDnGroupList /> },
          { path: 'media', element: <IvrMedia /> },
          { path: 'ain-dnis', element: <IvrAinDnis /> },
        ],
      },
      {
        path: 'scenario',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="list" replace /> },
          { path: 'list', element: <ScenarioList /> },
          { path: ':serviceId', element: <ScenarioDetail /> },
          { path: 'slee-config', element: <SleeConfigList /> },
          { path: 'mentfile', element: <MentFileList /> },
          { path: 'dnis', element: <DnisList /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/" />,
  },
];
