import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const SearchList = React.lazy(() => import('./pages/stt-config/SearchList'));
const TrainingList = React.lazy(() => import('./pages/stt-config/TrainingList'));
const DictionaryList = React.lazy(() => import('./pages/stt-config/DictionaryList'));
const RecogList = React.lazy(() => import('./pages/stt-config/RecogList'));
const ModelList = React.lazy(() => import('./pages/stt-config/ModelList'));
const DnList = React.lazy(() => import('./pages/stt-config/DnList'));
const RetryReqList = React.lazy(() => import('./pages/stt-config/RetryReqList'));
const FileUploadList = React.lazy(() => import('./pages/stt-config/FileUploadList'));
const ChannelStatusList = React.lazy(() => import('./pages/monitoring/ChannelStatusList'));
const DnStatusList = React.lazy(() => import('./pages/monitoring/DnStatusList'));
const CallStatusList = React.lazy(() => import('./pages/monitoring/CallStatusList'));
const SttDashboard = React.lazy(() => import('./pages/monitoring/SttDashboard'));

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
        path: 'stt-config',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="search" replace /> },
          {
            path: 'search',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <SearchList /> },
            ],
          },
          {
            path: 'training',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <TrainingList /> },
            ],
          },
          {
            path: 'dictionary',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <DictionaryList /> },
            ],
          },
          {
            path: 'recog',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <RecogList /> },
            ],
          },
          {
            path: 'model',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <ModelList /> },
            ],
          },
          {
            path: 'dn',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <DnList /> },
            ],
          },
          {
            path: 'retry-req',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <RetryReqList /> },
            ],
          },
          {
            path: 'file-upload',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <FileUploadList /> },
            ],
          },
        ],
      },
      {
        path: 'monitoring',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="channel" replace /> },
          {
            path: 'channel',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <ChannelStatusList /> },
            ],
          },
          {
            path: 'dn',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <DnStatusList /> },
            ],
          },
          {
            path: 'call',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <CallStatusList /> },
            ],
          },
          {
            path: 'dashboard',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <SttDashboard /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/" />,
  },
];
