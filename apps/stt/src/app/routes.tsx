import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { createPageVariantSocket } from '@/components/custom/DynamicElement';
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

// 변형 소켓 — path 인자는 화면 식별 키(라우트 경로 그대로, 동적 세그먼트 포함)
const pv = createPageVariantSocket('stt');

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
              { path: 'list', element: pv('stt-config/search/list', SearchList) },
            ],
          },
          {
            path: 'training',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: pv('stt-config/training/list', TrainingList) },
            ],
          },
          {
            path: 'dictionary',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: pv('stt-config/dictionary/list', DictionaryList) },
            ],
          },
          {
            path: 'recog',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: pv('stt-config/recog/list', RecogList) },
            ],
          },
          {
            path: 'model',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: pv('stt-config/model/list', ModelList) },
            ],
          },
          {
            path: 'dn',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: pv('stt-config/dn/list', DnList) },
            ],
          },
          {
            path: 'retry-req',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: pv('stt-config/retry-req/list', RetryReqList) },
            ],
          },
          {
            path: 'file-upload',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: pv('stt-config/file-upload/list', FileUploadList) },
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
              { path: 'list', element: pv('monitoring/channel/list', ChannelStatusList) },
            ],
          },
          {
            path: 'dn',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: pv('monitoring/dn/list', DnStatusList) },
            ],
          },
          {
            path: 'call',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: pv('monitoring/call/list', CallStatusList) },
            ],
          },
          {
            path: 'dashboard',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: pv('monitoring/dashboard/list', SttDashboard) },
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
