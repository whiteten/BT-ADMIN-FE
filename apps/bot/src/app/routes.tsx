import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const Main = React.lazy(() => import('./pages/main/Main'));
const BotList = React.lazy(() => import('./pages/bot-config/BotList'));
const BotCreate = React.lazy(() => import('./pages/bot-config/BotCreate'));
const BotDetail = React.lazy(() => import('./pages/bot-config/BotDetail'));

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
        path: 'bot-config',
        element: <Outlet />,
        children: [
          {
            index: true,
            element: <Navigate to="bot" replace />,
          },
          {
            path: 'bot',
            children: [
              {
                index: true,
                element: <Navigate to="list" replace />,
              },
              {
                path: 'list',
                element: <BotList />,
              },
              {
                path: 'create',
                element: <BotCreate />,
              },
              {
                path: ':id',
                element: <BotDetail />,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/bot" />,
  },
];
