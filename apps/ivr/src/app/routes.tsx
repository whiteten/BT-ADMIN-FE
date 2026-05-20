import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const IvrEndpointListPage = React.lazy(() => import('./features/ivr-endpoint/pages/IvrEndpointListPage'));
const IvrDnGroupListPage = React.lazy(() => import('./features/ivr-dn-group/pages/IvrDnGroupListPage'));
const IvrMediaPage = React.lazy(() => import('./features/ivr-media/components/IvrMediaPage'));
const IvrAinDnisPage = React.lazy(() => import('./features/ivr-ain-dnis/components/IvrAinDnisPage'));
const ScenarioListPage = React.lazy(() => import('./features/scenario/pages/ScenarioListPage'));

export const routes = [
  {
    path: '/',
    element: <Outlet />,
    children: [
      {
        index: true,
        element: <Navigate to="/" replace />,
      },
      {
        path: 'ivr/endpoint',
        element: <IvrEndpointListPage />,
      },
      {
        path: 'ivr/dn-group',
        element: <IvrDnGroupListPage />,
      },
      {
        path: 'ivr/media',
        element: <IvrMediaPage />,
      },
      {
        path: 'ivr/ain-dnis',
        element: <IvrAinDnisPage />,
      },
      {
        path: 'ivr/scenario',
        element: <ScenarioListPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/" />,
  },
];
