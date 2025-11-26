import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const Main = React.lazy(() => import('./pages/main/Main'));
const BotList = React.lazy(() => import('./pages/bot-config/BotList'));

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
            element: <Navigate to="bots" replace />,
          },
          {
            path: 'bots',
            element: <BotList />,
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
