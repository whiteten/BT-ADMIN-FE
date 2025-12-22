import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const Main = React.lazy(() => import('./pages/main/Main'));
const BotList = React.lazy(() => import('./pages/bot-config/BotList'));
const BotCreate = React.lazy(() => import('./pages/bot-config/BotCreate'));
const BotDetail = React.lazy(() => import('./pages/bot-config/BotDetail'));
const ModelCreate = React.lazy(() => import('./pages/bot-config/ModelCreate'));
const ModelDetail = React.lazy(() => import('./pages/bot-config/ModelDetail'));
const ModelDetailLayout = React.lazy(() => import('./pages/bot-config/ModelDetailLayout'));
const ModelList = React.lazy(() => import('./pages/bot-config/ModelList'));
const IntentDetail = React.lazy(() => import('./pages/bot-config/IntentDetail'));
const EntityDetail = React.lazy(() => import('./pages/bot-config/EntityDetail'));

export const routes = [
  {
    path: '/',
    element: <Outlet />,
    children: [
      { index: true, element: <Navigate to="main" replace /> },
      { path: 'main', element: <Main /> },
      {
        path: 'bot-config',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="bot" replace /> },
          {
            path: 'bot',
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <BotList /> },
              { path: 'create', element: <BotCreate /> },
              { path: ':serviceId', element: <BotDetail /> },
            ],
          },
          {
            path: 'model',
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <ModelList /> },
              { path: 'create', element: <ModelCreate /> },
              {
                path: ':modelId',
                element: <ModelDetailLayout />,
                children: [
                  { index: true, element: <ModelDetail /> },
                  {
                    path: 'intent',
                    children: [
                      { index: true, element: <Navigate to=".." replace /> },
                      { path: ':intentId', element: <IntentDetail /> },
                    ],
                  },
                  {
                    path: 'entity',
                    children: [
                      { index: true, element: <Navigate to=".." replace /> },
                      { path: ':entityId', element: <EntityDetail /> },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound homePath="/bot" /> },
];
