import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const Main = React.lazy(() => import('./pages/main/Main'));
const ServiceBotList = React.lazy(() => import('./pages/bot-config/service-bot/ServiceBotList'));
const ServiceBotCreate = React.lazy(() => import('./pages/bot-config/service-bot/ServiceBotCreate'));
const ServiceBotDetail = React.lazy(() => import('./pages/bot-config/service-bot/ServiceBotDetail'));

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
            element: <Navigate to="service-bot" replace />,
          },
          {
            path: 'service-bot',
            children: [
              {
                index: true,
                element: <Navigate to="list" replace />,
              },
              {
                path: 'list',
                element: <ServiceBotList />,
              },
              {
                path: 'create',
                element: <ServiceBotCreate />,
              },
              {
                path: ':serviceId',
                element: <ServiceBotDetail />,
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
