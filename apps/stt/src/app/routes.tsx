import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const Main = React.lazy(() => import('./pages/main/Main'));
const SttList = React.lazy(() => import('./pages/stt-search/SttList'));
const TrainingList = React.lazy(() => import('./pages/training/TrainingList'));

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
        path: 'stt-config',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="stt" replace /> },
          {
            path: 'stt',
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <SttList /> },
            ],
          },
          {
            path: 'training',
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <TrainingList /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/stt" />,
  },
];
