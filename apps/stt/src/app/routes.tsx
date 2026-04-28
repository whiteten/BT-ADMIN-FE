import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const Main = React.lazy(() => import('./pages/main/Main'));
const SearchList = React.lazy(() => import('./pages/stt-config/SearchList'));
const TrainingList = React.lazy(() => import('./pages/stt-config/TrainingList'));
const DictionaryList = React.lazy(() => import('./pages/stt-config/DictionaryList'));
const RecogGroupList = React.lazy(() => import('./pages/stt-config/RecogList'));
const SttDnList = React.lazy(() => import('./pages/stt-config/SttDnList'));

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
            path: 'search',
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <SearchList /> },
            ],
          },
          {
            path: 'training',
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <TrainingList /> },
            ],
          },
          {
            path: 'recog',
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <RecogGroupList /> },
            ],
          },
          {
            path: 'dictionary',
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <DictionaryList /> },
            ],
          },
          {
            path: 'dn',
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <SttDnList /> },
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
