import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const Main = React.lazy(() => import('./pages/main/Main'));
const AgentList = React.lazy(() => import('./pages/agent-config/AgentList'));
const AgentCreate = React.lazy(() => import('./pages/agent-config/AgentCreate'));
const AgentDetail = React.lazy(() => import('./pages/agent-config/AgentDetail'));
const ModelList = React.lazy(() => import('./pages/agent-config/ModelList'));
const ModelCreate = React.lazy(() => import('./pages/agent-config/ModelCreate'));
const ModelDetail = React.lazy(() => import('./pages/agent-config/ModelDetail'));

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
        path: 'agent-config',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="agent" replace /> },
          {
            path: 'agent',
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <AgentList /> },
              { path: 'create', element: <AgentCreate /> },
              { path: ':agentId', element: <AgentDetail /> },
            ],
          },
          {
            path: 'model',
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <ModelList /> },
              { path: 'create', element: <ModelCreate /> },
              { path: ':modelId', element: <ModelDetail /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/aoe" />,
  },
];
