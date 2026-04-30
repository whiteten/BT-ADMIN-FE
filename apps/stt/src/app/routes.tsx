import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const Main = React.lazy(() => import('./pages/main/Main'));
const SearchList = React.lazy(() => import('./pages/stt-config/SearchList'));
const TrainingList = React.lazy(() => import('./pages/stt-config/TrainingList'));
const DictionaryList = React.lazy(() => import('./pages/stt-config/DictionaryList'));
const RecogList = React.lazy(() => import('./pages/stt-config/RecogList'));
const ModelList = React.lazy(() => import('./pages/stt-config/ModelList'));
const DnList = React.lazy(() => import('./pages/stt-config/DnList'));
const FileUploadList = React.lazy(() => import('./pages/stt-config/FileUploadList'));

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
            path: 'dictionary',
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <DictionaryList /> },
            ],
          },
          {
            path: 'recog',
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <RecogList /> },
            ],
          },
          {
            path: 'model',
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <ModelList /> },
            ],
          },
          {
            path: 'dn',
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <DnList /> },
            ],
          },
          {
            path: 'file-upload',
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <FileUploadList /> },
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
