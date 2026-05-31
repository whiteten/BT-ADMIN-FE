import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import IvrWsSessionEventHandler from './features/router/IvrWsSessionEventHandler';
import { NotFound } from '@/components/custom/NotFound';

const IvrEndpointList = React.lazy(() => import('./pages/ivr/IvrEndpointList'));
const IvrDnGroupList = React.lazy(() => import('./pages/ivr/IvrDnGroupList'));
const IvrMedia = React.lazy(() => import('./pages/ivr/IvrMedia'));
const IvrAinDnis = React.lazy(() => import('./pages/ivr/IvrAinDnis'));
const ScenarioList = React.lazy(() => import('./pages/ivr/ScenarioList'));
const ScenarioDetail = React.lazy(() => import('./pages/ivr/ScenarioDetail'));
const SleeConfigList = React.lazy(() => import('./pages/ivr/SleeConfigList'));

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
        path: 'ivr',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="endpoint" replace /> },
          { path: 'endpoint', element: <IvrEndpointList /> },
          { path: 'dn-group', element: <IvrDnGroupList /> },
          { path: 'media', element: <IvrMedia /> },
          { path: 'ain-dnis', element: <IvrAinDnis /> },
          { path: 'scenario', element: <ScenarioList /> },
          { path: 'scenario/:serviceId', element: <ScenarioDetail /> },
          { path: 'slee-config', element: <SleeConfigList /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/" />,
  },
];
