import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const Main = React.lazy(() => import('./pages/main/Main'));
const AgentList = React.lazy(() => import('./pages/agent-config/AgentList'));
const AgentCreate = React.lazy(() => import('./pages/agent-config/AgentCreate'));
const AgentDetail = React.lazy(() => import('./pages/agent-config/AgentDetail'));

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
        path: 'agent-config/agent',
        children: [
          { path: 'list', element: <AgentList /> },
          { path: 'create', element: <AgentCreate /> },
          { path: ':agentId', element: <AgentDetail /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/aoe" />,
  },
];
